
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
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { ArrowLeft, ArrowRight, Loader2, UploadCloud, Star, Search, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
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
                 <h3 className="text-lg font-semibold">Mapear Colunas</h3>
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
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                        <TableRow>
                            <TableHead className="w-1/2">Coluna da Planilha</TableHead>
                            <TableHead className="w-1/2">Campo no Sistema</TableHead>
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
    
    const processWorkbookFromFile = (fileToParse: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
             try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'binary' });
                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                if (wb.SheetNames.length > 0) {
                    setSelectedSheet(wb.SheetNames[0]);
                }
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
        processWorkbookFromFile(file);
    }
    
    const processSheetData = useCallback(() => {
        if (!workbook || !selectedSheet) return;
        try {
            const worksheet = workbook.Sheets[selectedSheet];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: headerRow > 0 ? headerRow - 1 : 0, defval: "" });

            if (json.length === 0) {
                toast({ variant: 'destructive', title: 'Planilha Vazia', description: 'A planilha selecionada não contém dados ou cabeçalhos.' });
                setHeaders([]);
                setSheetData([]);
                return;
            }
            
            const firstRowData = json[0] as any;
            const extractedHeaders = Object.keys(firstRowData);
            setHeaders(extractedHeaders);
            
            const dataRows = headerRow > 0 ? json.slice(1) : json;
            setSheetData(dataRows);
            
            // Auto-mapping suggestion
            const newMapping: Record<string, string> = {};
            extractedHeaders.forEach(header => {
                const headerLower = header.toLowerCase();
                const matchedField = studentSystemFields.find(field => headerLower.includes(field.value.toLowerCase()) || field.label.toLowerCase().includes(headerLower));
                if (matchedField) {
                    newMapping[header] = matchedField.value;
                }
            });
            setColumnMapping(newMapping);


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
                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label>Planilha</Label>
                         <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex w-max space-x-1 border-b">
                                {sheetNames.map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedSheet(name)}
                                        className={cn(
                                            "flex flex-shrink-0 items-center gap-2 p-2 text-sm transition-colors border-b-2",
                                            selectedSheet === name 
                                                ? "border-primary text-primary font-semibold" 
                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <FileSpreadsheet className="h-4 w-4" />
                                        <span className="whitespace-nowrap">{name}</span>
                                    </button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                    
                     <div className="flex items-center gap-2">
                        <Label htmlFor="header-row" className="whitespace-nowrap">Linha do Cabeçalho</Label>
                        <Input 
                            id="header-row" 
                            type="number"
                            value={headerRow}
                            onChange={(e) => setHeaderRow(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                            className="w-20"
                        />
                         <span className="text-xs text-muted-foreground">Especifique qual linha contém os nomes das colunas.</span>
                     </div>

                    <MappingTable headers={headers} onMappingChange={handleMappingChange} initialMapping={columnMapping} />
                </div>
            )}
            
            {step === 3 && importSummary && (
                <div className="py-4 space-y-4">
                     <Alert>
                        <AlertTitle className="font-bold">Importação Concluída!</AlertTitle>
                        <AlertDescription>
                            <p className="flex items-center"><Badge variant="default" className="bg-green-600 mr-2">{importSummary.successCount}</Badge> alunos importados com sucesso.</p>
                            <p className="flex items-center mt-2"><Badge variant="destructive" className="mr-2">{importSummary.errorCount}</Badge> alunos não foram importados por falta de dados (ex: nome ou escola em branco).</p>
                        </AlertDescription>
                    </Alert>
                    
                    {Object.keys(importSummary.newSchools).length > 0 && (
                        <Alert variant="destructive">
                            <AlertTitle className="font-bold">Ação Necessária: Novas Escolas Encontradas!</AlertTitle>
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
                        <Button onClick={handleImport} disabled={isProcessing || headers.length === 0}>
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
