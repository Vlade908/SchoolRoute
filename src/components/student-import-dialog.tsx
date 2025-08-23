
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { ArrowLeft, Loader2, UploadCloud, Search, FileSpreadsheet, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { saveImportConfig, type SheetConfig } from '@/app/actions/save-import-config';


const monthNames = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

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
    { value: 'status', label: 'Status de Homologação' },
    ...monthNames.map((month, index) => ({
      value: `receivedMonth:${index + 1}`,
      label: `Mes Que Recebeu: ${month}`
    }))
];

function MappingTable({
  headers,
  columnMapping,
  onMappingChange,
  selectedHeaders,
  onSelectedHeadersChange,
}: {
  headers: string[];
  columnMapping: Record<string, string>;
  onMappingChange: (header: string, field: string) => void;
  selectedHeaders: Set<string>;
  onSelectedHeadersChange: (newSelected: Set<string>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHeaders = useMemo(() => {
    const searchFiltered = headers.filter(h => 
        !searchTerm || h.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selected = searchFiltered.filter(h => selectedHeaders.has(h));
    const unselected = searchFiltered.filter(h => !selectedHeaders.has(h));

    return [...selected, ...unselected];
  }, [headers, searchTerm, selectedHeaders]);

  const getSystemFieldLabel = (value: string) => {
    return studentSystemFields.find(f => f.value === value)?.label || 'Ignorar esta coluna';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedHeadersChange(new Set(headers));
    } else {
      onSelectedHeadersChange(new Set());
    }
  };

  const handleSelectHeader = (header: string, checked: boolean) => {
    const newSet = new Set(selectedHeaders);
    if (checked) {
      newSet.add(header);
    } else {
      newSet.delete(header);
    }
    onSelectedHeadersChange(newSet);
  };

  const isAllSelected = headers.length > 0 && selectedHeaders.size === headers.length;

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 px-1">
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
      <div className="flex-grow overflow-hidden border rounded-md">
        <ScrollArea className="h-full">
          <Table className="relative">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todas as colunas"
                  />
                </TableHead>
                <TableHead className="w-1/2">Coluna da Planilha</TableHead>
                <TableHead className="w-1/2">Campo no Sistema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHeaders.map((header, index) => (
                <TableRow key={`${header}-${index}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedHeaders.has(header)}
                      onCheckedChange={(checked) => handleSelectHeader(header, !!checked)}
                      aria-label={`Selecionar coluna ${header}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium truncate" title={header}>
                    {header || <span className="text-muted-foreground italic">Coluna Vazia</span>}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                          <span className="truncate">{getSystemFieldLabel(columnMapping[header] || 'ignore')}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar campo..." />
                          <CommandList>
                            <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="ignore" onSelect={() => onMappingChange(header, 'ignore')}>
                                <Check className={cn("mr-2 h-4 w-4", (columnMapping[header] || 'ignore') === 'ignore' ? "opacity-100" : "opacity-0")} />
                                Ignorar esta coluna
                              </CommandItem>
                              {studentSystemFields.map(field => (
                                <CommandItem key={field.value} value={field.label} onSelect={() => onMappingChange(header, field.value)}>
                                  <Check className={cn("mr-2 h-4 w-4", columnMapping[header] === field.value ? "opacity-100" : "opacity-0")} />
                                  {field.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
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
    const [primarySheet, setPrimarySheet] = useState<string | null>(null);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [importSummary, setImportSummary] = useState<{ successCount: number; errorCount: number; newSchools: Record<string, number> } | null>(null);
    const [headerRow, setHeaderRow] = useState(1);
    const [selectedHeaders, setSelectedHeaders] = useState(new Set<string>());

    const resetState = () => {
        setStep(1);
        setFile(null);
        setWorkbook(null);
        setSheetNames([]);
        setSelectedSheet('');
        setPrimarySheet(null);
        setSheetData([]);
        setHeaders([]);
        setColumnMapping({});
        setIsProcessing(false);
        setImportSummary(null);
        setHeaderRow(1);
        setSelectedHeaders(new Set());
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

    const handleProceedToMapping = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado' });
            return;
        }
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
                toast({ variant: 'destructive', title: 'Erro ao Ler Planilha' });
             } finally {
                setIsProcessing(false);
             }
        };
        reader.readAsBinaryString(file);
    };

    const processSheetData = useCallback(() => {
        if (!workbook || !selectedSheet) return;
        try {
            const worksheet = workbook.Sheets[selectedSheet];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            if (data.length < headerRow) {
                 setHeaders([]);
                 setSheetData([]);
                 setSelectedHeaders(new Set());
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
            setSelectedHeaders(new Set());
        } catch (error) {
            console.error("Error processing sheet:", error);
            toast({ variant: 'destructive', title: 'Erro ao processar a planilha' });
        }
    }, [workbook, selectedSheet, headerRow, toast]);

    useEffect(() => {
        if (step === 2 && workbook) {
            processSheetData();
        }
    }, [step, workbook, selectedSheet, headerRow, processSheetData]);

    const handleMappingChange = (header: string, systemField: string) => {
        setColumnMapping(prev => ({ ...prev, [header]: systemField }));
    };
    
    const handleTogglePrimarySheet = (sheetName: string) => {
        setPrimarySheet(prev => prev === sheetName ? null : sheetName);
    };

    const handleSaveConfig = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum arquivo para salvar a configuração.' });
            return;
        }

        setIsProcessing(true);
        try {
            // NOTE: This saves the config for ALL sheets, not just the selected one.
            // A more advanced implementation might let you build a config across multiple sheets.
            const configToSave: SheetConfig[] = sheetNames.map(name => ({
                sheetName: name,
                isPrimary: primarySheet === name,
                headerRow: headerRow, // Assuming same header row for all for now
                columnMapping: columnMapping, // Assuming same mapping for all for now
            }));

            const result = await saveImportConfig({
                fileName: file.name,
                configurations: configToSave,
            });

            if (result.success) {
                toast({ title: 'Sucesso!', description: 'Configuração de importação salva no servidor.' });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Não foi possível salvar a configuração.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleValidate = async () => {
        setIsProcessing(true);
        // Placeholder for validation logic
        setTimeout(() => {
            setImportSummary({ successCount: sheetData.length - 1, errorCount: 1, newSchools: { "Escola Fantasma": 1 } });
            setIsProcessing(false);
            setStep(3);
        }, 1500);
    };
    
    const handleClose = () => {
        resetState();
        onOpenChange(false);
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Importar Alunos</DialogTitle>
                            <DialogDescription>Passo 1 de 3: Selecione o arquivo de planilha que deseja importar.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <Label htmlFor="spreadsheet-file" className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50 transition-colors">
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
                             <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                            <Button onClick={handleProceedToMapping} disabled={!file || isProcessing}>
                                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Próximo"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                );
            case 2:
                return (
                     <DialogContent className="sm:max-w-6xl flex flex-col h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>Mapear Colunas</DialogTitle>
                            <DialogDescription>Passo 2 de 3: Configure como a planilha será importada.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow flex flex-col space-y-4 overflow-hidden py-4">
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
                                                <button onClick={(e) => { e.stopPropagation(); handleTogglePrimarySheet(name); }} className="ml-2 p-1 rounded-full hover:bg-muted">
                                                    <Star className={cn("h-4 w-4 text-muted-foreground", primarySheet === name && "fill-current text-yellow-500")} />
                                                </button>
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
                            <MappingTable 
                                headers={headers} 
                                columnMapping={columnMapping} 
                                onMappingChange={handleMappingChange}
                                selectedHeaders={selectedHeaders}
                                onSelectedHeadersChange={setSelectedHeaders}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                            <div className="flex-grow" />
                            <Button variant="ghost" onClick={handleSaveConfig} disabled={isProcessing}>Salvar Configuração</Button>
                            <Button onClick={handleValidate} disabled={isProcessing}>
                                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</> : "Validar e Prosseguir"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                );
            case 3:
                return (
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Resumo da Importação</DialogTitle>
                            <DialogDescription>Passo 3 de 3: Revise a validação antes de importar.</DialogDescription>
                        </DialogHeader>
                        {importSummary && (
                            <div className="py-4 space-y-4">
                                <Alert>
                                    <AlertTitle className="font-bold">Validação Concluída!</AlertTitle>
                                    <AlertDescription>
                                        <p className="flex items-center"><Badge variant="default" className="bg-green-600 mr-2">{importSummary.successCount}</Badge> alunos prontos para importação.</p>
                                        <p className="flex items-center mt-2"><Badge variant="destructive" className="mr-2">{importSummary.errorCount}</Badge> alunos com erros de validação (ex: campos obrigatórios em branco).</p>
                                    </AlertDescription>
                                </Alert>
                                {Object.keys(importSummary.newSchools).length > 0 && (
                                    <Alert variant="destructive">
                                        <AlertTitle className="font-bold">Ação Necessária: Novas Escolas Encontradas!</AlertTitle>
                                        <AlertDescription>
                                            <p>As seguintes escolas não estão cadastradas e serão criadas. Verifique os dados após a importação.</p>
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
                            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                            <Button onClick={() => { onSuccess(); handleClose(); }} disabled={isProcessing}>
                                 {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</> : "Concluir Importação"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                );
            default:
                return null;
        }
    };

    return <>{renderStepContent()}</>;
}
