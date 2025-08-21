
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
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
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
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where, limit, startAfter, orderBy, getCountFromServer, getDoc, QueryConstraint } from 'firebase/firestore';
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

type TransportRequest = {
    id: string;
    studentId: string;
    createdAt: Timestamp;
    type: string;
    status: string;
    executor?: string;
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
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [yearFilter, setYearFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  
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
            } else {
                 setEditedStudent(null);
                 setSelectedSchool(null);
            }
        });
    }
  }, [isOpen, student]);
  
  useEffect(() => {
    if(isOpen && student?.id) {
        setLoadingRequests(true);
        const requestsRef = collection(db, "transport-requests");
        const q = query(requestsRef, where("studentUid", "==", student.id));

        getDocs(q).then(snapshot => {
            const studentRequests: TransportRequest[] = [];
            snapshot.forEach(doc => {
                const data = decryptObjectValues(doc.data()) as any;
                if(data){
                    let createdAt = data.createdAt;
                    if (createdAt && typeof createdAt.seconds === 'number' && typeof createdAt.nanoseconds === 'number' && !(createdAt instanceof Timestamp)) {
                        createdAt = new Timestamp(createdAt.seconds, createdAt.nanoseconds);
                    } else if (!createdAt) {
                        return;
                    }
                    
                    studentRequests.push({
                        id: doc.id,
                        studentId: data.studentId,
                        createdAt: createdAt,
                        type: data.type,
                        status: data.status,
                        executor: data.executor,
                    });
                }
            });
            setRequests(studentRequests);
            setLoadingRequests(false);
        }).catch(err => {
            console.error("Error fetching requests: ", err);
            setLoadingRequests(false);
        });
    }
  }, [isOpen, student]);
  
  const availableYears = useMemo(() => {
    const years = new Set(
      requests
        .map(r => {
          if (r.createdAt && r.createdAt.toDate) {
            const year = r.createdAt.toDate().getFullYear();
            return isNaN(year) ? null : year;
          }
          return null;
        })
        .filter((year): year is number => year !== null)
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [requests]);
  
  const filteredRequests = useMemo(() => {
      return requests.filter(r => {
          if (!(r.createdAt instanceof Timestamp)) return false;
          const yearMatch = yearFilter === 'all' || r.createdAt.toDate().getFullYear().toString() === yearFilter;
          const typeMatch = typeFilter === 'all' || r.type === typeFilter;
          return yearMatch && typeMatch;
      });
  }, [requests, yearFilter, typeFilter]);


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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="data">Dados</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
                <TabsTrigger value="requests">Solicitações</TabsTrigger>
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
               <TabsContent value="requests" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Solicitações</CardTitle>
                       <div className="flex items-center gap-2">
                            <Select value={yearFilter} onValueChange={setYearFilter}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Anos</SelectItem>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Tipos</SelectItem>
                                    <SelectItem value="Passe Escolar">Passe Escolar</SelectItem>
                                    <SelectItem value="Transporte Fretado">Transporte Fretado</SelectItem>
                                </SelectContent>
                            </Select>
                       </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Executor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingRequests ? (
                                    <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                                ) : filteredRequests.length > 0 ? (
                                    filteredRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>{req.createdAt.toDate().toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>{req.type}</TableCell>
                                            <TableCell>
                                                <Badge variant={req.status === 'Aprovado' ? 'default' : req.status === 'Pendente' ? 'secondary' : 'destructive'} 
                                                    className={req.status === 'Aprovado' ? 'bg-green-600' : ''}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{req.executor || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="text-center">Nenhuma solicitação encontrada.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                      </div>
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
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(totalStudents / itemsPerPage);

  const fetchStudents = useCallback(async (direction: 'next' | 'prev' | 'new' = 'new') => {
    setLoading(true);
    try {
        const studentsRef = collection(db, "students");
        let constraints: QueryConstraint[] = [];

        if(direction === 'new') {
            setPage(1);
            setLastVisible(null);
            setFirstVisible(null);
        }

        // We fetch all students for client-side filtering because of encryption
        const q = query(studentsRef);
        const documentSnapshots = await getDocs(q);
        
        const fetchedStudents: Student[] = [];
        documentSnapshots.forEach(docSnap => {
            const decryptedData = decryptObjectValues(docSnap.data()) as any;
            if (decryptedData) {
              let enrollmentDateStr = 'N/A';
              if (decryptedData.enrollmentDate?.seconds) {
                  enrollmentDateStr = new Timestamp(decryptedData.enrollmentDate.seconds, decryptedData.enrollmentDate.nanoseconds).toDate().toLocaleDateString('pt-BR');
              }
              fetchedStudents.push({
                  id: docSnap.id,
                  ...decryptedData,
                  enrollmentDate: enrollmentDateStr,
              } as Student);
            }
        });
        
        setAllStudents(fetchedStudents);
        
    } catch (error) {
        console.error("Error fetching students:", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar alunos', description: 'Ocorreu um erro ao carregar os dados dos alunos.' });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user?.role === 3) {
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
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchStudents('new');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const filteredStudents = useMemo(() => {
    let studentsToFilter = allStudents;
    
    // Filter by school if admin
    if (user?.role === 3 && schoolFilter !== 'all') {
        studentsToFilter = studentsToFilter.filter(student => student.schoolId === schoolFilter);
    }
     // Filter for non-admin users
    if (user?.role < 3) {
        studentsToFilter = studentsToFilter.filter(student => student.schoolId === user?.schoolId);
    }

    // Filter by active tab
    if (activeTab === 'active') {
        studentsToFilter = studentsToFilter.filter(student => student.status === 'Homologado');
    } else if (activeTab === 'draft') {
        studentsToFilter = studentsToFilter.filter(student => student.status === 'Não Homologado');
    }
    
    // Filter by search term
    if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        studentsToFilter = studentsToFilter.filter(student => 
            student.name.toLowerCase().includes(lowerCaseSearch) ||
            (student.ra && student.ra.toLowerCase().includes(lowerCaseSearch)) ||
            (student.cpf && student.cpf.toLowerCase().includes(lowerCaseSearch))
        );
    }
    
    setTotalStudents(studentsToFilter.length);

    return studentsToFilter.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [allStudents, searchTerm, activeTab, schoolFilter, user, page]);

  
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
        const studentDocRef = doc(db, "students", id);
        const currentDoc = await getDoc(studentDocRef);
        const decryptedCurrent = decryptObjectValues(currentDoc.data() || {});
        
        const dataToUpdate = { ...decryptedCurrent, ...studentData };
        
        const encryptedStudent = encryptObjectValues(dataToUpdate);
        await updateDoc(studentDocRef, encryptedStudent);
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  }
  
  const handleSchoolFilterChange = (schoolId: string) => {
    setSchoolFilter(schoolId);
    setPage(1);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };
  
  const handleNextPage = () => {
    if (page < totalPages) {
        setPage(prev => prev + 1);
    }
  }

  const handlePreviousPage = () => {
    if (page > 1) {
        setPage(prev => prev - 1);
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
              placeholder="Buscar por Nome, RA, CPF..."
              className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          {user?.role === 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Escola
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrar por escola</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem 
                  checked={schoolFilter === 'all'}
                  onCheckedChange={() => handleSchoolFilterChange('all')}
                >
                  Todas as escolas
                </DropdownMenuCheckboxItem>
                {schools.map(school => (
                   <DropdownMenuCheckboxItem 
                    key={school.id}
                    checked={schoolFilter === school.id}
                    onCheckedChange={() => handleSchoolFilterChange(school.id)}
                  >
                    {school.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                  {loading && allStudents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
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
                Mostrando <strong>{filteredStudents.length}</strong> de <strong>{totalStudents}</strong> alunos.
            </div>
            <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
      {isProfileDialogOpen && (
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





