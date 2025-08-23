
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { ArrowLeft, ArrowRight, Loader2, UploadCloud, Star, Search, GripVertical, FileSpreadsheet, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


type School = {
    id: string;
    name: string;
    schoolType?: string;
};

const studentSystemFields = [
    { value: 'name', label: 'Nome do Aluno' },
    { value: 'cpf', label: 'CPF' },
    { value: 'ra', label: 'RA' },
    { value: 'rg', label: 'RG' },
    { value: 'rgIssueDate', label: 'Data de Emissão do RG' },
    { value: 'schoolName', label: 'Nome da Escola' },
    { value: 'grade', label: 'Série/Ano' },
    { value: 'className', label: 'Turma' },
    { value: 'classPeriod', label: 'Período da Turma' },
    { value: 'responsibleName', label: 'Nome do Responsável' },
    { value: 'contactPhone', label: 'Telefone de Contato' },
    { value: 'contactEmail', label: 'Email de Contato' },
    { value: 'address', label: 'Endereço' },
    { value: 'hasPass', label: 'Possui Passe (Sim/Não)' },
    { value: 'souCardNumber', label: 'Nº Cartão SOU' },
];

function MappingTable({ headers, onMappingChange, initialMapping }: { headers: string[], onMappingChange: (header: string, systemField: string) => void, initialMapping: Record<string, string>}) {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredHeaders = useMemo(() => {
        if (!searchTerm) return headers;
        return headers.filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [headers, searchTerm]);

    return (
        <div>
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <Label htmlFor="header-row">Linha do Cabeçalho</Label>
                    <Input 
                        id="header-row" 
                        type="number" 
                        defaultValue={1}
                        onChange={(e) => {
                            // This would be handled by a callback to re-process the sheet in a real implementation
                        }}
                        min="1"
                        className="w-20"
                    />
                     <span className="text-xs text-muted-foreground">Especifique qual linha contém os nomes das colunas.</span>
                 </div>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar colunas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full md:w-64"
                    />
                 </div>
             </div>
            <ScrollArea className="h-72 w-full pr-4 border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <TableRow>
                            <TableHead className="w-1/2">Coluna</TableHead>
                            <TableHead className="w-1/2">Mapear Para Campo do Sistema</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHeaders.map(header => (
                            <TableRow key={header}>
                                <TableCell className="font-medium truncate" title={header}>{header}</TableCell>
                                <TableCell>
                                    <Select onValueChange={(value) => onMappingChange(header, value)} defaultValue={initialMapping[header] || 'ignore'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ignorar esta coluna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ignore">Ignorar esta coluna</SelectItem>
                                            {studentSystemFields.map(field => (
                                                <SelectItem key={field.value} value={field.value}>
                                                    {field.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}


export function StudentImportDialog({ onOpenChange, onSuccess }: { onOpenChange: (isOpen: boolean) => void; onSuccess: () => void }) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [primarySheet, setPrimarySheet] = useState('');
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [importSummary, setImportSummary] = useState<{ successCount: number; errorCount: number; newSchools: Record<string, number> } | null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [headerRow, setHeaderRow] = useState(1);

    useEffect(() => {
        const fetchSchools = async () => {
            const schoolsCollection = collection(db, 'schools');
            const snapshot = await getDocs(query(schoolsCollection));
            const schoolsData: School[] = snapshot.docs.map(doc => {
                const decryptedData = decryptObjectValues(doc.data()) as any;
                return { id: doc.id, name: decryptedData.name, schoolType: decryptedData.schoolType };
            });
            setSchools(schoolsData);
        };
        fetchSchools();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const fileName = selectedFile.name.toLowerCase();
            const acceptedExtensions = ['.csv', '.xlsx', '.ods'];

            if (acceptedExtensions.some(ext => fileName.endsWith(ext))) {
                setFile(selectedFile);
            } else {
                toast({ variant: 'destructive', title: 'Tipo de arquivo inválido', description: 'Por favor, selecione um arquivo .xlsx, .csv ou .ods.' });
            }
        }
    };
    
    const parseFile = (fileToParse: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
             try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'binary' });
                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                setSelectedSheet(wb.SheetNames[0]);
                setPrimarySheet(wb.SheetNames[0]);
             } catch (error) {
                console.error("Error parsing file:", error);
                toast({ variant: 'destructive', title: 'Erro ao Ler Planilha', description: 'Não foi possível processar o arquivo. Verifique se o formato é válido.' });
             }
        };
        reader.readAsBinaryString(fileToParse);
    }
    
    const handleProceedToMapping = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado', description: 'Por favor, carregue uma planilha para continuar.' });
            return;
        }
        setStep(2);
        parseFile(file);
    }
    
    const processSheetData = useCallback(() => {
        if (!workbook || !selectedSheet) return;
        try {
            const worksheet = workbook.Sheets[selectedSheet];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: headerRow - 1, defval: "" });

            if (json.length > 0) {
                setSheetData(json);
                const firstRow = json[0] as any;
                if (firstRow) {
                    setHeaders(Object.keys(firstRow));
                } else {
                    setHeaders([]);
                }
            } else {
                toast({ variant: 'destructive', title: 'Planilha Vazia', description: 'A planilha selecionada não contém dados a partir da linha de cabeçalho especificada.' });
                setHeaders([]);
                setSheetData([]);
            }
        } catch (error) {
            console.error("Error processing sheet:", error);
            toast({ variant: 'destructive', title: 'Erro ao processar a planilha', description: 'Ocorreu um erro ao extrair os dados. Tente novamente.' });
        }
    }, [workbook, selectedSheet, headerRow, toast]);

    useEffect(() => {
        if (workbook && selectedSheet) {
            processSheetData();
        }
    }, [workbook, selectedSheet, headerRow, processSheetData]);

    const handleMappingChange = (header: string, systemField: string) => {
        setColumnMapping(prev => ({ ...prev, [header]: systemField }));
    };

    const handleImport = async () => {
        setIsProcessing(true);
        let successCount = 0;
        let errorCount = 0;
        const newSchoolsToCreate: Record<string, any[]> = {};

        for (const row of sheetData) {
            const studentData: Record<string, any> = {};
            for (const header in columnMapping) {
                if (columnMapping[header] && columnMapping[header] !== 'ignore') {
                    studentData[columnMapping[header]] = row[header];
                }
            }

            if (!studentData.name || !studentData.schoolName) {
                errorCount++;
                continue;
            }

            const schoolName = studentData.schoolName.trim();
            const existingSchool = schools.find(s => s.name.toLowerCase() === schoolName.toLowerCase());

            if (!existingSchool) {
                if (!newSchoolsToCreate[schoolName]) {
                    newSchoolsToCreate[schoolName] = [];
                }
                newSchoolsToCreate[schoolName].push(studentData);
                continue;
            }

            try {
                const studentToAdd = {
                    ...studentData,
                    schoolId: existingSchool.id,
                    schoolType: existingSchool.schoolType || 'N/A',
                    status: 'Não Homologado',
                    enrollmentDate: Timestamp.now(),
                    uid: `student_${Date.now()}_${Math.random()}`
                };
                const encryptedStudent = encryptObjectValues(studentToAdd);
                await addDoc(collection(db, "students"), encryptedStudent);
                successCount++;
            } catch (error) {
                console.error("Error adding student:", error);
                errorCount++;
            }
        }
        
        const newSchoolsSummary = Object.entries(newSchoolsToCreate).reduce((acc, [name, students]) => {
            acc[name] = students.length;
            return acc;
        }, {} as Record<string, number>);

        setImportSummary({ successCount, errorCount, newSchools: newSchoolsSummary });
        setIsProcessing(false);
        setStep(3);
    };
    
    const handleCloseAndRefresh = () => {
        onSuccess();
    }

    return (
        <DialogContent className="sm:max-w-6xl">
            <DialogHeader>
                <DialogTitle>Importar Alunos de Planilha</DialogTitle>
                <DialogDescription>
                  {step === 1 && "Selecione o arquivo de planilha que deseja importar."}
                  {step === 2 && "Selecione a aba, defina a linha do cabeçalho e valide as colunas para importar."}
                  {step === 3 && "A importação foi concluída. Veja o resumo abaixo."}
                </DialogDescription>
            </DialogHeader>

            {step === 1 && (
                <div className="py-4 space-y-4">
                    <div>
                        <Label
                            htmlFor="spreadsheet-file"
                            className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-primary">Clique para carregar</span> ou arraste e solte
                                </p>
                                <p className="text-xs text-muted-foreground">XLSX, CSV ou ODS (MAX. 10MB)</p>
                            </div>
                            <Input id="spreadsheet-file" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx,.csv,.ods" />
                        </Label>
                         {file && <p className="text-sm text-muted-foreground mt-2">Arquivo selecionado: <span className="font-medium text-foreground">{file.name}</span></p>}
                    </div>
                </div>
            )}
            
            {step === 2 && workbook && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <FileSpreadsheet className="mr-2 h-4 w-4"/>
                        {file?.name}
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                         <PlusCircle className="h-4 w-4" />
                       </Button>
                    </div>

                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex items-center gap-2 border-b">
                            {sheetNames.map(name => (
                                <button
                                    key={name}
                                    onClick={() => setSelectedSheet(name)}
                                    className={cn(
                                        "flex items-center gap-2 p-2 text-sm transition-colors border-b-2",
                                        selectedSheet === name 
                                            ? "border-primary text-primary font-semibold" 
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <GripVertical className="h-4 w-4" />
                                    <span>{name}</span>
                                    <button onClick={(e) => {e.stopPropagation(); setPrimarySheet(name);}}>
                                      <Star className={cn("h-4 w-4 transition-colors", primarySheet === name ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-400')}/>
                                    </button>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                    
                    <MappingTable headers={headers} onMappingChange={handleMappingChange} initialMapping={columnMapping} />
                </div>
            )}
            
            {step === 3 && importSummary && (
                <div className="py-4">
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Passo 3: Resumo da Importação
                    </Label>
                     <Alert>
                        <AlertTitle>Importação Concluída!</AlertTitle>
                        <AlertDescription>
                            <p><Badge variant="default" className="bg-green-600">{importSummary.successCount}</Badge> alunos importados com sucesso.</p>
                            <p><Badge variant="destructive">{importSummary.errorCount}</Badge> alunos não foram importados por falta de dados.</p>
                        </AlertDescription>
                    </Alert>
                    
                    {Object.keys(importSummary.newSchools).length > 0 && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Ação Necessária: Novas Escolas Encontradas!</AlertTitle>
                            <AlertDescription>
                                <p>Os seguintes alunos não foram importados porque as escolas deles não estão cadastradas. Por favor, cadastre estas escolas na aba 'Escolas' e importe a planilha novamente para estes alunos.</p>
                                <ul className="mt-2 list-disc list-inside">
                                {Object.entries(importSummary.newSchools).map(([schoolName, count]) => (
                                    <li key={schoolName}><strong>{schoolName}</strong> ({count} alunos)</li>
                                ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            <DialogFooter>
                {step === 1 && (
                    <Button onClick={handleProceedToMapping} disabled={!file}>
                        Próximo <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                {step === 2 && (
                    <div className="flex w-full justify-between">
                         <Button variant="outline" onClick={() => setStep(1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                        <Button onClick={handleImport} disabled={isProcessing}>
                            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : <>Importar Alunos</>}
                        </Button>
                    </div>
                )}
                 {step === 3 && (
                    <Button onClick={handleCloseAndRefresh}>
                        Fechar
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    );
}
