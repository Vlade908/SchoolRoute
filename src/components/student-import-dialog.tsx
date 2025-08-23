
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
import { ArrowLeft, ArrowRight, Loader2, UploadCloud, Star, Search, FileSpreadsheet, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';

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
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHeaders = useMemo(() => {
        if (!searchTerm) return headers;
        return headers.filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [headers, searchTerm]);
    
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

    const resetState = () => {
      setFile(null);
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet('');
      setPrimarySheet('');
      setSheetData([]);
      setHeaders([]);
      setColumnMapping({});
      setIsProcessing(false);
      setImportSummary(null);
      setHeaderRow(1);
      setSearchTerm('');
    };

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
    
    const processFile = (fileToParse: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
             try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'binary' });
                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                if (wb.SheetNames.length > 0) {
                    const firstSheet = wb.SheetNames[0];
                    setSelectedSheet(firstSheet);
                    setPrimarySheet(firstSheet);
                }
                setStep(2);
             } catch (error) {
                console.error("Error parsing file:", error);
                toast({ variant: 'destructive', title: 'Erro ao Ler Planilha', description: 'Não foi possível processar o arquivo. Verifique se o formato é válido.' });
             } finally {
                setIsProcessing(false);
             }
        };
        reader.readAsBinaryString(fileToParse);
    }
    
    const handleProceedToMapping = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado', description: 'Por favor, carregue uma planilha para continuar.' });
            return;
        }
        processFile(file);
    }

    const processSheetData = useCallback(() => {
        if (!workbook || !selectedSheet) return;
        try {
            const worksheet = workbook.Sheets[selectedSheet];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            if (data.length < headerRow) {
                 toast({ variant: 'destructive', title: 'Linha do Cabeçalho Inválida', description: 'A linha do cabeçalho especificada não existe na planilha.' });
                 setHeaders([]);
                 setSheetData([]);
                 return;
            }
            
            const extractedHeaders = data[headerRow - 1].map(String);
            setHeaders(extractedHeaders);
            
            const dataRows = data.slice(headerRow);
            const jsonData = dataRows.map(row => {
                const rowData: Record<string, any> = {};
                extractedHeaders.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            setSheetData(jsonData);
            
            // Auto-mapping suggestion
            const newMapping: Record<string, string> = {};
            extractedHeaders.forEach(header => {
                if(!header) return;
                const headerLower = header.toLowerCase().trim();
                const matchedField = studentSystemFields.find(field => 
                    headerLower.includes(field.label.toLowerCase()) || 
                    headerLower.includes(field.value.toLowerCase())
                );
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
        // This is a placeholder for the final import logic
        // In a real scenario, this would process `sheetData` with `columnMapping`
        // and show the summary.
        setTimeout(() => {
            setImportSummary({ successCount: 120, errorCount: 5, newSchools: { "Escola Nova Exemplo": 5 } });
            setIsProcessing(false);
            setStep(3);
        }, 2000);
    };
    
    const handleClose = () => {
        resetState();
        onOpenChange(false);
    }
    
     const handleBackToUpload = () => {
        resetState();
        setStep(1);
    }

    if (step === 3 && importSummary) {
      return (
        <DialogContent className="sm:max-w-xl">
             <DialogHeader>
                <DialogTitle>Resumo da Importação</DialogTitle>
                <DialogDescription>
                  A validação foi concluída. Veja o resumo abaixo.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 <Alert>
                    <AlertTitle className="font-bold">Validação Concluída!</AlertTitle>
                    <AlertDescription>
                        <p className="flex items-center"><Badge variant="default" className="bg-green-600 mr-2">{importSummary.successCount}</Badge> alunos validados com sucesso.</p>
                        <p className="flex items-center mt-2"><Badge variant="destructive" className="mr-2">{importSummary.errorCount}</Badge> alunos com erros de validação (ex: nome ou escola em branco).</p>
                    </AlertDescription>
                </Alert>
                
                {Object.keys(importSummary.newSchools).length > 0 && (
                    <Alert variant="destructive">
                        <Star className="h-4 w-4" />
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
             <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                    Fechar
                </Button>
                <Button onClick={() => { /* Placeholder for final import */ toast({title: "Importação Iniciada", description: "Os alunos estão sendo cadastrados em segundo plano."}); handleClose(); }}>
                    Importar Alunos
                </Button>
            </DialogFooter>
        </DialogContent>
      )
    }

    return (
        <DialogContent className={cn("sm:max-w-6xl", step === 2 && "sm:max-w-[90vw] h-[90vh]")}>
             <DialogHeader>
                <DialogTitle>
                    {step === 1 && "Importar Alunos de Planilha"}
                    {step === 2 && "Selecione as Colunas e Valide"}
                </DialogTitle>
                <DialogDescription>
                  {step === 1 && "Selecione o arquivo de planilha que deseja importar."}
                  {step === 2 && "Selecione um arquivo, escolha a aba, defina a linha do cabeçalho e selecione as colunas para validar."}
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
                     <DialogFooter>
                        <Button onClick={handleProceedToMapping} disabled={!file || isProcessing}>
                            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : <>Próximo <ArrowRight className="ml-2 h-4 w-4" /></>}
                        </Button>
                    </DialogFooter>
                </div>
            )}
            
            {step === 2 && workbook && (
                <div className="flex flex-col h-full py-4 space-y-4">
                    <div className="flex items-center gap-2 p-1 rounded-md bg-muted/60 w-fit">
                        <div className="flex items-center gap-2 p-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md">
                           <FileSpreadsheet className="h-4 w-4" />
                           <span className="truncate max-w-xs">{file?.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                          <PlusCircle className="h-4 w-4" />
                       </Button>
                    </div>

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
                                    <Star 
                                      className={cn("h-4 w-4 cursor-pointer", primarySheet === name ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-400')}
                                      onClick={(e) => { e.stopPropagation(); setPrimarySheet(name); }}
                                    />
                                </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    
                    <div className="flex justify-between items-center gap-4">
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
                    
                    <div className="flex-grow overflow-hidden">
                       <ScrollArea className="h-full">
                           <Table>
                               <TableHeader className="sticky top-0 z-10 bg-card">
                                   <TableRow>
                                        <TableHead className="w-[50px]"><Checkbox /></TableHead>
                                        <TableHead>Coluna</TableHead>
                                        <TableHead>Tipo de Dado</TableHead>
                                        <TableHead>Papel</TableHead>
                                        <TableHead>Status de Validação</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {filteredHeaders.map(header => (
                                       <TableRow key={header}>
                                            <TableCell><Checkbox /></TableCell>
                                            <TableCell className="font-medium truncate max-w-xs" title={header}>{header || <span className="text-muted-foreground italic">Coluna Vazia</span>}</TableCell>
                                            <TableCell>
                                                <Select>
                                                   <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                                                   <SelectContent>
                                                      <SelectItem value="text">Texto</SelectItem>
                                                      <SelectItem value="number">Número</SelectItem>
                                                      <SelectItem value="date">Data</SelectItem>
                                                   </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select onValueChange={(value) => handleMappingChange(header, value)} defaultValue={columnMapping[header] || 'ignore'}>
                                                   <SelectTrigger><SelectValue placeholder="Selecione o papel..." /></SelectTrigger>
                                                   <SelectContent>
                                                       <SelectItem value="ignore">Ignorar</SelectItem>
                                                       {studentSystemFields.map(field => (
                                                           <SelectItem key={field.value} value={field.value}>
                                                               {field.label}
                                                           </SelectItem>
                                                       ))}
                                                   </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                               <Badge variant="outline">Não Validado</Badge>
                                            </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                       </ScrollArea>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={handleBackToUpload}>
                           <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                        <div className="flex-grow" />
                        <Button variant="ghost">Salvar Configuração</Button>
                        <Button onClick={handleImport} disabled={isProcessing}>
                            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</> : "Validar e Prosseguir"}
                        </Button>
                    </DialogFooter>
                </div>
            )}
        </DialogContent>
    );
}
