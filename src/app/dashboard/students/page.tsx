
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useUser } from '@/contexts/user-context';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where, limit, startAfter, orderBy, getCountFromServer } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';
import { AddressMap } from '@/components/address-map';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


type Student = {
  id: string; // Firestore document ID
  name: string;
  ra: string;
  cpf: string;
  rg: string;
  schoolId: string;
  schoolName: string;
  grade: string;
  className: string;
  classPeriod: string;
  status: string;
  enrollmentDate: string; // Should be a Timestamp in Firestore, converted to string for display
  responsibleName: string;
  contactPhone: string;
  rgIssueDate: string;
  address?: string;
  contactEmail?: string;
  hasPass?: 'Sim' | 'Não';
  souCardNumber?: string;
};

type SchoolClass = {
  name: string;
  period: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
};

type SchoolGrade = {
  name: string;
  classes: SchoolClass[];
};

type School = {
  id: string;
  name: string;
  grades?: SchoolGrade[];
  schoolType?: string;
};


function StudentProfileDialog({
  student,
  isEditing = false,
  onSave,
  isOpen,
  onOpenChange,
}: {
  student: Student | null;
  isEditing?: boolean;
  onSave: (updatedStudent: Student) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [editedStudent, setEditedStudent] = useState<Student | null>(student);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSchoolComboboxOpen, setSchoolComboboxOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        const schoolsCollection = collection(db, 'schools');
        getDocs(schoolsCollection).then(snapshot => {
            const schoolsData: School[] = snapshot.docs.map(doc => {
                const decryptedData = decryptObjectValues(doc.data()) as any;
                return { 
                    id: doc.id, 
                    name: decryptedData.name, 
                    grades: decryptedData.grades || [] 
                };
            });
            setSchools(schoolsData);

            if (student) {
                const currentSchool = schoolsData.find(s => s.id === student.schoolId);
                setSelectedSchool(currentSchool || null);
                setEditedStudent(student);
            }
        });
    }
  }, [isOpen, student]);


  const selectedGradeObj = useMemo(() => {
    if (!selectedSchool || !editedStudent?.grade) return null;
    return selectedSchool.grades?.find(g => g.name === editedStudent.grade);
  }, [selectedSchool, editedStudent?.grade]);
  
  const availablePeriods = useMemo(() => {
    if (!selectedGradeObj) return [];
    const periods = selectedGradeObj.classes.map(c => c.period);
    return [...new Set(periods)]; // Unique periods
  }, [selectedGradeObj]);

  const availableClasses = useMemo(() => {
    if (!selectedGradeObj || !editedStudent?.classPeriod) return [];
    return selectedGradeObj.classes.filter(c => c.period === editedStudent.classPeriod);
  }, [selectedGradeObj, editedStudent?.classPeriod]);


  const handleClose = () => {
    onOpenChange(false);
  }
  
  const handleSaveClick = () => {
    if (editedStudent) {
      onSave(editedStudent);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditedStudent(prev => prev ? ({ ...prev, [id]: value }) : null);
  };
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');
    setEditedStudent(prev => prev ? { ...prev, [id]: numericValue } : null);
  }

  const handleSouCardBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let { value } = e.target;
    value = value.replace(/\D/g, ''); // Remove non-digits
    if (value.length === 13) {
      const formatted = value.replace(/(\d{2})(\d{2})(\d{8})(\d{1})/, '$1.$2.$3.$4');
      setEditedStudent(prev => prev ? { ...prev, souCardNumber: formatted } : null);
    }
  }

  const handleSelectChange = (id: keyof Student, value: string) => {
    setEditedStudent(prev => prev ? ({ ...prev, [id]: value }) : null);
  }

  const handleSchoolSelect = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId) || null;
    setSelectedSchool(school);
    setEditedStudent(prev => prev ? { ...prev, schoolId: school?.id || '', schoolName: school?.name || '', grade: '', className: '', classPeriod: '' } : null);
    setSchoolComboboxOpen(false);
  }
  
  const handleGradeSelect = (gradeName: string) => {
    setEditedStudent(prev => prev ? ({ ...prev, grade: gradeName, classPeriod: '', className: '' }) : null);
  }
  
  const handlePeriodSelect = (period: string) => {
    setEditedStudent(prev => prev ? ({ ...prev, classPeriod: period, className: '' }) : null);
  }

  const handleClassSelect = (className: string) => {
    setEditedStudent(prev => prev ? ({ ...prev, className: className }) : null);
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        {student && editedStudent ? (
          <>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Perfil do Aluno' : 'Perfil do Aluno'}</DialogTitle>
              <DialogDescription>{student.name} - {student.ra}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="data">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="data">Dados</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="data" className="pt-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isEditing ? (
                          <>
                            <div><Label htmlFor="name">Nome</Label><Input id="name" value={editedStudent.name} onChange={handleChange} /></div>
                            <div>
                              <Label htmlFor="student-status">Status</Label>
                                <Select value={editedStudent.status} onValueChange={(value) => handleSelectChange('status', value)}>
                                    <SelectTrigger id="student-status">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Homologado">Homologado</SelectItem>
                                        <SelectItem value="Não Homologado">Não Homologado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label htmlFor="responsibleName">Responsável</Label><Input id="responsibleName" value={editedStudent.responsibleName} onChange={handleChange} /></div>
                            <div><Label htmlFor="contactPhone">Contato</Label><Input id="contactPhone" value={editedStudent.contactPhone} onChange={handleChange} /></div>
                            <div className="col-span-1 md:col-span-2">
                                <Label htmlFor="schoolName">Escola</Label>
                                <Popover open={isSchoolComboboxOpen} onOpenChange={setSchoolComboboxOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isSchoolComboboxOpen}
                                            className="w-full justify-between font-normal"
                                        >
                                            {selectedSchool?.name || "Selecione a escola"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[370px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar escola..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhuma escola encontrada.</CommandEmpty>
                                                <CommandGroup>
                                                    {schools.map((school) => (
                                                    <CommandItem
                                                        key={school.id}
                                                        value={school.name}
                                                        onSelect={() => handleSchoolSelect(school.id)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                editedStudent.schoolId === school.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {school.name}
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select value={editedStudent.grade} onValueChange={handleGradeSelect} disabled={!selectedSchool?.grades || selectedSchool.grades.length === 0}>
                                    <SelectTrigger><Label htmlFor="grade" className="sr-only">Série/Ano</Label><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                                    <SelectContent>
                                        {selectedSchool?.grades?.map(grade => <SelectItem key={grade.name} value={grade.name}>{grade.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={editedStudent.classPeriod} onValueChange={handlePeriodSelect} disabled={availablePeriods.length === 0}>
                                    <SelectTrigger><Label htmlFor="classPeriod" className="sr-only">Período</Label><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                                    <SelectContent>
                                        {availablePeriods.map(period => <SelectItem key={period} value={period}>{period}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                
                                <Select value={editedStudent.className} onValueChange={handleClassSelect} disabled={availableClasses.length === 0}>
                                    <SelectTrigger><Label htmlFor="className" className="sr-only">Classe</Label><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                                    <SelectContent>
                                        {availableClasses.map(cls => <SelectItem key={cls.name} value={cls.name}>{cls.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div>
                              <Label htmlFor="hasPass">Possui Passe?</Label>
                                <Select value={editedStudent.hasPass} onValueChange={(value) => handleSelectChange('hasPass', value as 'Sim' | 'Não')}>
                                    <SelectTrigger id="hasPass">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sim">Sim</SelectItem>
                                        <SelectItem value="Não">Não</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {editedStudent.hasPass === 'Sim' && (
                              <div>
                                <Label htmlFor="souCardNumber">Nº Cartão SOU</Label>
                                <Input 
                                  id="souCardNumber" 
                                  value={editedStudent.souCardNumber || ''} 
                                  onChange={handleNumericChange}
                                  onBlur={handleSouCardBlur}
                                  maxLength={16}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div><span className="font-semibold">Nome:</span> {student.name}</div>
                            <div><span className="font-semibold">Status:</span> <Badge variant={student.status === 'Homologado' ? 'default' : 'destructive'} className={student.status === 'Homologado' ? 'bg-green-600' : ''}>{student.status}</Badge></div>
                            <div><span className="font-semibold">Responsável:</span> {student.responsibleName}</div>
                            <div><span className="font-semibold">Contato:</span> {student.contactPhone}</div>
                            <div><span className="font-semibold">Série/Ano:</span> {student.grade}</div>
                            <div><span className="font-semibold">Classe:</span> {student.className}</div>
                             <div><span className="font-semibold">Período:</span> {student.classPeriod}</div>
                            <div className="col-span-2"><span className="font-semibold">Escola:</span> {student.schoolName}</div>
                            <div><span className="font-semibold">Possui Passe:</span> {student.hasPass ?? 'N/A'}</div>
                            {student.hasPass === 'Sim' && <div><span className="font-semibold">Nº Cartão SOU:</span> {student.souCardNumber}</div>}
                          </>
                        )}
                     </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="documents" className="pt-4">
                  <Card>
                      <CardContent className="space-y-4 pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {isEditing ? (
                                <>
                                  <div><Label htmlFor="ra">RA</Label><Input id="ra" value={editedStudent.ra} onChange={handleChange} /></div>
                                  <div><Label htmlFor="cpf">CPF</Label><Input id="cpf" value={editedStudent.cpf} onChange={handleChange} /></div>
                                  <div><Label htmlFor="rg">RG</Label><Input id="rg" value={editedStudent.rg} onChange={handleChange} /></div>
                                  <div><Label htmlFor="rgIssueDate">Emissão RG</Label><Input id="rgIssueDate" value={editedStudent.rgIssueDate} onChange={handleChange} /></div>
                                </>
                              ) : (
                                <>
                                  <div><span className="font-semibold">RA:</span> {student.ra}</div>
                                  <div><span className="font-semibold">CPF:</span> {student.cpf}</div>
                                  <div><span className="font-semibold">RG:</span> {student.rg}</div>
                                  <div><span className="font-semibold">Emissão RG:</span> {student.rgIssueDate}</div>
                                 </>
                              )}
                          </div>
                      </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="enrollments" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Matrículas</CardTitle>
                      <Button size="sm" className="w-fit"><PlusCircle className="mr-2 h-4 w-4"/> Nova Movimentação</Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Data Inserção</TableHead>
                                  <TableHead>Data Início</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Escola</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              <TableRow>
                                  <TableCell>01/02/2024</TableCell>
                                  <TableCell>15/02/2024</TableCell>
                                  <TableCell><Badge>Ativa</Badge></TableCell>
                                  <TableCell>{student.schoolName}</TableCell>
                              </TableRow>
                          </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
              </TabsContent>
               <TabsContent value="history" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico Escolar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Ano</TableHead>
                                  <TableHead>Escola</TableHead>
                                  <TableHead>Série/Ano</TableHead>
                                   <TableHead>Status</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              <TableRow>
                                  <TableCell>2024</TableCell>
                                  <TableCell>{student.schoolName}</TableCell>
                                  <TableCell>{student.grade}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-green-600 border-green-600">Aprovado</Badge></TableCell>
                              </TableRow>
                          </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing ? (
                  <>
                      <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancelar</Button>
                      <Button onClick={handleSaveClick} className="w-full sm:w-auto">Salvar Alterações</Button>
                  </>
              ) : (
                  <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">Fechar</Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
            <DialogDescription>Aguarde enquanto os dados do aluno são carregados.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddStudentDialog({ onSave, onOpenChange }: { onSave: (student: Omit<Student, 'id' | 'enrollmentDate' | 'status'>) => void, onOpenChange: (open: boolean) => void }) {
  const { user } = useUser();
  const [studentData, setStudentData] = useState({
    name: '', cpf: '', ra: '', rg: '', grade: '', className: '', classPeriod: '', responsibleName: '', contactEmail: '', contactPhone: '', address: '', schoolId: '', schoolName: '', rgIssueDate: '', hasPass: 'Não' as 'Sim' | 'Não', souCardNumber: ''
  });

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSchoolComboboxOpen, setSchoolComboboxOpen] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
        const schoolsCollection = collection(db, 'schools');
        const snapshot = await getDocs(schoolsCollection);
        const schoolsData: School[] = [];
        snapshot.forEach(doc => {
             const decryptedData = decryptObjectValues(doc.data()) as any;
             if(decryptedData) {
                 schoolsData.push({ id: doc.id, name: decryptedData.name, grades: decryptedData.grades || [] });
             }
        });
        setSchools(schoolsData);
    };
    fetchSchools();
  }, []);

  const selectedGradeObj = useMemo(() => {
    return selectedSchool?.grades?.find(g => g.name === studentData.grade);
  }, [selectedSchool, studentData.grade]);

  const availablePeriods = useMemo(() => {
    if (!selectedGradeObj) return [];
    const periods = selectedGradeObj.classes.map(c => c.period);
    return [...new Set(periods)]; // Unique periods
  }, [selectedGradeObj]);

  const availableClasses = useMemo(() => {
    if (!selectedGradeObj || !studentData.classPeriod) return [];
    return selectedGradeObj.classes.filter(c => c.period === studentData.classPeriod);
  }, [selectedGradeObj, studentData.classPeriod]);

  if (!user || user.role < 2) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setStudentData(prev => ({...prev, [id]: value}));
  }
  
  const handleSelectChange = (id: keyof typeof studentData, value: string) => {
      setStudentData(prev => ({...prev, [id]: value}));
  }
  
  const handleSchoolSelect = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId) || null;
    setSelectedSchool(school);
    setStudentData(prev => ({ ...prev, schoolId: school?.id || '', schoolName: school?.name || '', grade: '', className: '', classPeriod: '' }));
    setSchoolComboboxOpen(false);
  }
  
  const handleGradeSelect = (gradeName: string) => {
    setStudentData(prev => ({ ...prev, grade: gradeName, classPeriod: '', className: '' }));
  }

  const handlePeriodSelect = (period: string) => {
    setStudentData(prev => ({ ...prev, classPeriod: period, className: '' }));
  }

  const handleClassSelect = (className: string) => {
    setStudentData(prev => ({ ...prev, className: className }));
  }

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');
    setStudentData(prev => ({...prev, [id]: numericValue}));
  }

  const handleAlphaNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const alphaNumericValue = value.replace(/[^a-zA-Z0-9]/g, '');
    setStudentData(prev => ({...prev, [id]: alphaNumericValue}));
  }

  const handleDateBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { id, value } = e.target;
    value = value.replace(/[^0-9]/g, '');
    if (value.length === 8) {
        const formattedDate = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4, 8)}`;
        setStudentData(prev => ({...prev, [id]: formattedDate}));
    }
  }
  
  const handleCPFBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    value = value.replace(/[^\d\w]/g, '');
    let formatted = value;
    if (value.length === 11) {
      formatted = value.replace(/(\w{3})(\w{3})(\w{3})(\w{2})/, '$1.$2.$3-$4');
    } else if (value.length === 10) {
      formatted = value.replace(/(\w{3})(\w{3})(\w{3})(\w{1})/, '$1.$2.$3-$4');
    }
    setStudentData(prev => ({...prev, cpf: formatted}));
  }

  const handleRGBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    value = value.replace(/[^\d\w]/g, '');
    if (value.length === 9) {
      const formatted = value.replace(/(\w{2})(\w{3})(\w{3})(\w{1})/, '$1.$2.$3-$4');
       setStudentData(prev => ({...prev, rg: formatted}));
    }
  }
  
  const handleRABlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    value = value.replace(/[^\d\w]/g, '');
    if (value.length === 13) {
      const formatted = value.replace(/(\w{12})(\w{1})/, '$1-$2');
      setStudentData(prev => ({...prev, ra: formatted}));
    }
  }

  const handlePhoneBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    value = value.replace(/\D/g, '');
    if (value.length === 11) {
      const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      setStudentData(prev => ({...prev, contactPhone: formatted}));
    }
  }

  const handleSouCardBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let { value } = e.target;
    value = value.replace(/\D/g, ''); // Use \D to remove non-digits
    if (value.length === 13) {
      const formatted = value.replace(/(\d{2})(\d{2})(\d{8})(\d{1})/, '$1.$2.$3.$4');
      setStudentData(prev => ({...prev, souCardNumber: formatted}));
    }
  }


  const handleAddressSelect = (address: string) => {
    setStudentData(prev => ({...prev, address}));
  }

  const handleSave = () => {
    const dataToValidate: Partial<typeof studentData> = { ...studentData };
    if (dataToValidate.hasPass === 'Não') {
      delete dataToValidate.souCardNumber;
    }

    for (const key in dataToValidate) {
        if (dataToValidate[key as keyof typeof dataToValidate] === '') {
            alert(`Por favor, preencha o campo: ${key}`);
            return;
        }
    }
    const { ...studentToSave } = studentData;
    onSave(studentToSave);
  }

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
        <DialogDescription>Preencha os dados do aluno. Clique em salvar para concluir.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 md:grid-cols-2">
        <div className="space-y-4">
            <Input id="name" placeholder="Nome Completo" value={studentData.name} onChange={handleChange}/>
            <Input id="cpf" placeholder="CPF" value={studentData.cpf} onChange={handleAlphaNumericChange} onBlur={handleCPFBlur} maxLength={14} />
            <Input id="ra" placeholder="RA (Registro do Aluno)" value={studentData.ra} onChange={handleAlphaNumericChange} onBlur={handleRABlur} maxLength={14} />
            <Input id="rg" placeholder="RG" value={studentData.rg} onChange={handleAlphaNumericChange} onBlur={handleRGBlur} maxLength={12} />
             <Input 
                id="rgIssueDate" 
                placeholder="Data de Emissão RG (DDMMAAAA)" 
                value={studentData.rgIssueDate} 
                onChange={handleNumericChange} 
                onBlur={handleDateBlur}
                maxLength={10}
             />
             <Input id="responsibleName" placeholder="Nome do Responsável" value={studentData.responsibleName} onChange={handleChange}/>
             <Input id="contactEmail" type="email" placeholder="Email de Contato" value={studentData.contactEmail} onChange={handleChange}/>
             <Input id="contactPhone" type="tel" placeholder="Telefone de Contato" value={studentData.contactPhone} onChange={handleNumericChange} onBlur={handlePhoneBlur} maxLength={15} />
        </div>
         <div className="space-y-4">
             <Popover open={isSchoolComboboxOpen} onOpenChange={setSchoolComboboxOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isSchoolComboboxOpen}
                        className="w-full justify-between font-normal"
                    >
                        {studentData.schoolName || "Selecione a escola"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar escola..." />
                        <CommandList>
                            <CommandEmpty>Nenhuma escola encontrada.</CommandEmpty>
                            <CommandGroup>
                                {schools.map((school) => (
                                <CommandItem
                                    key={school.id}
                                    value={school.name}
                                    onSelect={() => {
                                      handleSchoolSelect(school.id)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            studentData.schoolId === school.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {school.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select value={studentData.grade} onValueChange={handleGradeSelect} disabled={!selectedSchool?.grades || selectedSchool.grades.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                    <SelectContent>
                    {selectedSchool?.grades?.map(grade => <SelectItem key={grade.name} value={grade.name}>{grade.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={studentData.classPeriod} onValueChange={handlePeriodSelect} disabled={availablePeriods.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                    <SelectContent>
                    {availablePeriods.map(period => <SelectItem key={period} value={period}>{period}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Select value={studentData.className} onValueChange={handleClassSelect} disabled={availableClasses.length === 0}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                {availableClasses.map(cls => <SelectItem key={cls.name} value={cls.name}>{cls.name}</SelectItem>)}
                </SelectContent>
            </Select>

             <AddressMap onAddressSelect={handleAddressSelect} markerType="student" />
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hasPass" className="mb-2 block">Possui passe?</Label>
                  <Select value={studentData.hasPass} onValueChange={(value: 'Sim' | 'Não') => handleSelectChange('hasPass', value)}>
                    <SelectTrigger id="hasPass">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {studentData.hasPass === 'Sim' && (
                  <div>
                    <Label htmlFor="souCardNumber" className="mb-2 block">Nº Cartão SOU</Label>
                    <Input 
                      id="souCardNumber" 
                      placeholder="00.00.00000000-0"
                      value={studentData.souCardNumber} 
                      onChange={handleNumericChange}
                      onBlur={handleSouCardBlur}
                      maxLength={16}
                    />
                  </div>
                )}
             </div>
         </div>
      </div>
       <DialogFooter>
         <Button type="submit" className="w-full sm:w-auto" onClick={handleSave}>Salvar Aluno</Button>
      </DialogFooter>
    </DialogContent>
  );
}


export default function StudentsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState({
    estaduais: true,
    municipais: true,
  });
  
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(totalStudents / itemsPerPage);

  const fetchStudents = useCallback(async (direction: 'next' | 'prev' | 'new' = 'new') => {
      setLoading(true);
      try {
          const studentsRef = collection(db, "students");
          let queries = [];

          if (activeTab === 'active') {
              queries.push(where("status", "==", "Homologado"));
          } else if (activeTab === 'draft') {
              queries.push(where("status", "==", "Não Homologado"));
          }

          if (searchTerm) {
              // Note: Firestore doesn't support full-text search. This searches for exact matches on specific fields.
              // For a better search experience, a dedicated search service like Algolia would be needed.
              // This is a simplified search for demonstration.
              // queries.push(where("name", ">=", searchTerm), where("name", "<=", searchTerm + '\uf8ff'));
          }
          
          let schoolTypeClauses = [];
          if (schoolTypeFilter.estaduais) schoolTypeClauses.push("ESTADUAL");
          if (schoolTypeFilter.municipais) {
            schoolTypeClauses.push("MUNICIPAL");
            schoolTypeClauses.push("MUNICIPALIZADA");
          }

          if(schoolTypeClauses.length > 0 && schoolTypeClauses.length < 3) {
            queries.push(where("schoolType", "in", schoolTypeClauses));
          }


          let q = query(studentsRef, ...queries, orderBy("name"), limit(itemsPerPage));
          
          if(direction === 'next' && lastVisible) {
            q = query(studentsRef, ...queries, orderBy("name"), startAfter(lastVisible), limit(itemsPerPage));
          }
          
          // Note: "prev" pagination is complex with cursors. For simplicity, we'll reset to page 1.
          if(direction === 'prev') {
             // A true 'prev' would require orderBy descending and endBefore, which gets complicated.
             // Resetting or managing a stack of previous cursors is an option.
             // For this implementation, we will just disable 'prev' button on page 1.
             // A full implementation would be more complex.
          }
          
          const documentSnapshots = await getDocs(q);
          const studentsData: Student[] = [];
          documentSnapshots.forEach(docSnap => {
              const encryptedData = docSnap.data();
              const data = decryptObjectValues(encryptedData) as any;
              if (data) {
                  let enrollmentDateStr = 'N/A';
                  if (data.enrollmentDate?.seconds) {
                      enrollmentDateStr = new Timestamp(data.enrollmentDate.seconds, data.enrollmentDate.nanoseconds).toDate().toLocaleDateString('pt-BR');
                  }
                  
                  // This is a temporary fix as client-side filtering by name is needed because Firestore is case-sensitive
                  if (!searchTerm || data.name.toLowerCase().includes(searchTerm.toLowerCase()) || data.ra.includes(searchTerm) || data.cpf.includes(searchTerm)) {
                    studentsData.push({
                        id: docSnap.id,
                        ...data,
                        enrollmentDate: enrollmentDateStr,
                    } as Student);
                  }
              }
          });

          setStudents(studentsData);
          setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
          setFirstVisible(documentSnapshots.docs[0]);
          
          // Get total count for pagination
          const countQuery = query(studentsRef, ...queries);
          const countSnapshot = await getCountFromServer(countQuery);
          setTotalStudents(countSnapshot.data().count);

      } catch (error) {
          console.error("Error fetching students:", error);
          toast({ variant: 'destructive', title: 'Erro ao buscar alunos', description: 'Pode ser necessário criar um índice no Firestore. Verifique o console.' });
      } finally {
          setLoading(false);
      }
  }, [activeTab, searchTerm, schoolTypeFilter, toast, lastVisible]);
  
  useEffect(() => {
    fetchStudents('new');
    setCurrentPage(1);
    setLastVisible(null);
    setFirstVisible(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, schoolTypeFilter]);
  
  const handleOpenProfileDialog = (student: Student, editMode: boolean) => {
    setActiveStudent(student);
    setIsEditing(editMode);
    setProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    setProfileDialogOpen(false);
    setActiveStudent(null);
    setIsEditing(false);
  };
  
  const handleSaveStudent = async (updatedStudent: Student) => {
    try {
        const { id, ...studentData } = updatedStudent;
        const encryptedStudent = encryptObjectValues(studentData);
        await updateDoc(doc(db, "students", id), encryptedStudent);
        toast({ title: "Sucesso!", description: "Aluno atualizado." });
        fetchStudents('new');
    } catch(error) {
        console.error("Error updating student:", error);
        toast({ variant: 'destructive', title: "Erro!", description: "Não foi possível atualizar o aluno." });
    } finally {
        handleCloseProfileDialog();
    }
  };
  
  const handleAddStudent = async (newStudentData: Omit<Student, 'id' | 'enrollmentDate' | 'status'>) => {
    try {
        const schoolDoc = await getDoc(doc(db, 'schools', newStudentData.schoolId));
        const schoolData = decryptObjectValues(schoolDoc.data() || {});

        const studentToAdd = {
            ...newStudentData,
            schoolType: schoolData?.schoolType || 'N/A',
            status: 'Não Homologado',
            enrollmentDate: serverTimestamp()
        };
        const encryptedStudent = encryptObjectValues(studentToAdd);
        await addDoc(collection(db, "students"), encryptedStudent);
        toast({ title: "Sucesso!", description: "Aluno cadastrado." });
        fetchStudents('new');
    } catch(error) {
        console.error("Error adding student:", error);
        toast({ variant: 'destructive', title: "Erro!", description: "Não foi possível cadastrar o aluno." });
    } finally {
        setAddDialogOpen(false);
    }
  }
  
  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, "students", studentId));
      toast({ title: "Sucesso!", description: "Aluno excluído." });
      fetchStudents('new');
    } catch (error) {
      console.error("Error deleting student: ", error);
      toast({ variant: "destructive", title: "Erro!", description: "Não foi possível excluir o aluno." });
    }
  }

  const handleSchoolTypeChange = (type: 'estaduais' | 'municipais', checked: boolean) => {
    setSchoolTypeFilter(prev => ({ ...prev, [type]: checked }));
  }
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchStudents('next');
      setCurrentPage(prev => prev + 1);
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
       // This is a simplified "previous". A full implementation is more complex.
       // We'll refetch from the beginning for this page.
       fetchStudents('new'); 
       setCurrentPage(prev => prev - 1); // This will look odd if not on page 2
    }
  }

  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active" >Homologados</TabsTrigger>
          <TabsTrigger value="draft" >Não Homologados</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
           <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por RA, CPF, Nome..."
              className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filtro
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por tipo de escola</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={schoolTypeFilter.estaduais}
                onCheckedChange={(checked) => handleSchoolTypeChange('estaduais', !!checked)}
              >
                Estaduais
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={schoolTypeFilter.municipais}
                onCheckedChange={(checked) => handleSchoolTypeChange('municipais', !!checked)}
              >
                Municipais
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-10 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-rap">
              Exportar
            </span>
          </Button>
          {user && user.role >= 2 && (
             <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Novo Aluno
                    </span>
                  </Button>
                </DialogTrigger>
                <AddStudentDialog onSave={handleAddStudent} onOpenChange={setAddDialogOpen} />
              </Dialog>
          )}
        </div>
      </div>
      <TabsContent value={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Alunos</CardTitle>
            <CardDescription>
              Visualize e gerencie os alunos cadastrados no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Escola</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Série / Turma
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      RA
                    </TableHead>
                    <TableHead>
                      N° do Cartão
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                  ) : students.length > 0 ? (
                    students.map((student) => (
                      <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                          <Badge variant={student.status === 'Homologado' ? 'default' : 'destructive'} className={student.status === 'Homologado' ? 'bg-green-600' : ''}>
                              {student.status}
                          </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                          {student.schoolName}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{student.grade} / {student.className}</TableCell>
                          <TableCell className="hidden md:table-cell">{student.ra}</TableCell>
                          <TableCell>{student.souCardNumber || ''}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={() => handleOpenProfileDialog(student, false)}>Ver Perfil</DropdownMenuItem>
                                  {user && user.role >= 2 && 
                                      <DropdownMenuItem onSelect={() => handleOpenProfileDialog(student, true)}>Editar</DropdownMenuItem>
                                  }
                                  {user && user.role === 3 && <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteStudent(student.id)}>Excluir</DropdownMenuItem>}
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center">Nenhum aluno encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
                Mostrando <strong>{students.length}</strong> de <strong>{totalStudents}</strong> alunos.
            </div>
            <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
      {activeStudent && (
        <StudentProfileDialog 
            student={activeStudent}
            isEditing={isEditing}
            onSave={handleSaveStudent}
            isOpen={isProfileDialogOpen}
            onOpenChange={handleCloseProfileDialog}
        />
      )}
    </Tabs>
  );
}
