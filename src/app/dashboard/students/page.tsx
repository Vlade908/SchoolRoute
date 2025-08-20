
'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';
import { AddressMap } from '@/components/address-map';


type Student = {
  id: string; // Firestore document ID
  name: string;
  ra: string;
  cpf: string;
  rg: string;
  school: string;
  schoolYear: string;
  class: string;
  status: string;
  enrollmentDate: string; // Should be a Timestamp in Firestore, converted to string for display
  responsibleName: string;
  contactPhone: string;
  rgIssueDate: string;
  address?: string;
  contactEmail?: string;
};


function StudentProfileDialog({ 
  student, 
  isEditing = false,
  onSave,
  onClose,
}: { 
  student: Student | null, 
  isEditing?: boolean,
  onSave: (updatedStudent: Student) => void,
  onClose: () => void,
}) {
  const [editedStudent, setEditedStudent] = useState<Student | null>(student);
  
  useEffect(() => {
    setEditedStudent(student);
  }, [student]);

  if (!student || !editedStudent) {
    return null;
  }

  const handleSaveClick = () => {
    onSave(editedStudent);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditedStudent(prev => prev ? ({ ...prev, [id]: value }) : null);
  };

  const handleSelectChange = (value: string) => {
    setEditedStudent(prev => prev ? ({ ...prev, status: value }) : null);
  }


  return (
    <DialogContent className="sm:max-w-[800px]">
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
               <div className="grid grid-cols-2 gap-4">
                  {isEditing ? (
                    <>
                      <div><Label htmlFor="name">Nome</Label><Input id="name" value={editedStudent.name} onChange={handleChange} /></div>
                      <div>
                        <Label htmlFor="student-status">Status</Label>
                          <Select value={editedStudent.status} onValueChange={handleSelectChange}>
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
                      <div><Label htmlFor="schoolYear">Série/Ano</Label><Input id="schoolYear" value={editedStudent.schoolYear} onChange={handleChange} /></div>
                      <div><Label htmlFor="class">Classe</Label><Input id="class" value={editedStudent.class} onChange={handleChange} /></div>
                      <div className="col-span-2"><Label htmlFor="school">Escola</Label><Input id="school" value={editedStudent.school} onChange={handleChange} /></div>
                    </>
                  ) : (
                    <>
                      <div><span className="font-semibold">Nome:</span> {student.name}</div>
                      <div><span className="font-semibold">Status:</span> <Badge variant={student.status === 'Homologado' ? 'default' : 'destructive'} className={student.status === 'Homologado' ? 'bg-green-600' : ''}>{student.status}</Badge></div>
                      <div><span className="font-semibold">Responsável:</span> {student.responsibleName}</div>
                      <div><span className="font-semibold">Contato:</span> {student.contactPhone}</div>
                      <div><span className="font-semibold">Série/Ano:</span> {student.schoolYear}</div>
                      <div><span className="font-semibold">Classe:</span> {student.class}</div>
                      <div className="col-span-2"><span className="font-semibold">Escola:</span> {student.school}</div>
                    </>
                  )}
               </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-2 gap-4">
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
                            <TableCell>{student.school}</TableCell>
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
                            <TableCell>{student.school}</TableCell>
                            <TableCell>{student.schoolYear}</TableCell>
                            <TableCell><Badge variant="outline" className="text-green-600 border-green-600">Aprovado</Badge></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <DialogFooter>
        {isEditing ? (
            <>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSaveClick}>Salvar Alterações</Button>
            </>
        ) : (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

function AddStudentDialog({ onSave, onOpenChange }: { onSave: (student: Omit<Student, 'id' | 'enrollmentDate' | 'status'>) => void, onOpenChange: (open: boolean) => void }) {
  const { user } = useUser();
  const [studentData, setStudentData] = useState({
    name: '', cpf: '', ra: '', rg: '', schoolYear: '', class: '', responsibleName: '', contactEmail: '', contactPhone: '', address: '', school: '', rgIssueDate: ''
  });

  if (!user || user.role < 2) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setStudentData(prev => ({...prev, [id]: value}));
  }

  const handleAddressSelect = (address: string) => {
    setStudentData(prev => ({...prev, address}));
  }

  const handleSave = () => {
    for (const key in studentData) {
        if (studentData[key as keyof typeof studentData] === '') {
            alert(`Por favor, preencha o campo: ${key}`);
            return;
        }
    }
    onSave(studentData);
  }

  return (
    <DialogContent className="sm:max-w-[900px]">
      <DialogHeader>
        <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
        <DialogDescription>Preencha os dados do aluno. Clique em salvar para concluir.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 md:grid-cols-2">
        <div className="space-y-4">
            <Input id="name" placeholder="Nome Completo" value={studentData.name} onChange={handleChange}/>
            <Input id="cpf" placeholder="CPF" value={studentData.cpf} onChange={handleChange}/>
            <Input id="ra" placeholder="RA (Registro do Aluno)" value={studentData.ra} onChange={handleChange}/>
            <Input id="rg" placeholder="RG" value={studentData.rg} onChange={handleChange}/>
             <Input id="rgIssueDate" placeholder="Data de Emissão RG" value={studentData.rgIssueDate} onChange={handleChange}/>
            <div className="grid grid-cols-2 gap-4">
                <Input id="schoolYear" placeholder="Ano Escolar" value={studentData.schoolYear} onChange={handleChange}/>
                <Input id="class" placeholder="Classe" value={studentData.class} onChange={handleChange}/>
            </div>
             <Input id="responsibleName" placeholder="Nome do Responsável" value={studentData.responsibleName} onChange={handleChange}/>
             <Input id="contactEmail" type="email" placeholder="Email de Contato" value={studentData.contactEmail} onChange={handleChange}/>
             <Input id="contactPhone" type="tel" placeholder="Telefone de Contato" value={studentData.contactPhone} onChange={handleChange}/>
        </div>
         <div className="space-y-4">
             <Input id="school" placeholder="Escola" value={studentData.school} onChange={handleChange}/>
             <AddressMap onAddressSelect={handleAddressSelect} markerType="student" />
         </div>
      </div>
       <Button type="submit" className="w-full" onClick={handleSave}>Salvar Aluno</Button>
    </DialogContent>
  );
}


export default function StudentsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState({
    estaduais: true,
    municipais: true,
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "students"), (snapshot) => {
        const studentsData: Student[] = [];
        snapshot.forEach(doc => {
            const encryptedData = doc.data();
            const data = decryptObjectValues(encryptedData) as any;
            if (data) {
                studentsData.push({
                    id: doc.id,
                    ...data,
                    enrollmentDate: data.enrollmentDate?.toDate().toLocaleDateString('pt-BR') ?? 'N/A'
                } as Student);
            }
        });
        setStudents(studentsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Status filter (Tabs)
    if (activeTab === 'active') {
      filtered = filtered.filter(student => student.status === 'Homologado');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(student => student.status !== 'Homologado');
    }

    // School Type filter (Dropdown)
    const isEstadual = (school: string) => school.toLowerCase().includes('estadual');
    const isMunicipal = (school: string) => school.toLowerCase().includes('municipal');

    if (!schoolTypeFilter.estaduais || !schoolTypeFilter.municipais) {
        filtered = filtered.filter(student => {
            if (!student.school) return false;
            const isEst = isEstadual(student.school);
            const isMun = isMunicipal(student.school);
            if (schoolTypeFilter.estaduais && isEst) return true;
            if (schoolTypeFilter.municipais && isMun) return true;
            return false;
        });
    }

    // Search term filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        student.ra.toLowerCase().includes(lowerCaseSearchTerm) ||
        student.cpf.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    return filtered;
  }, [students, activeTab, searchTerm, schoolTypeFilter]);
 
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

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
    } catch(error) {
        console.error("Error updating student:", error);
        toast({ variant: 'destructive', title: "Erro!", description: "Não foi possível atualizar o aluno." });
    } finally {
        handleCloseProfileDialog();
    }
  };
  
  const handleAddStudent = async (newStudentData: Omit<Student, 'id' | 'enrollmentDate' | 'status'>) => {
    try {
        const studentToAdd = {
            ...newStudentData,
            status: 'Não Homologado',
            enrollmentDate: serverTimestamp()
        };
        const encryptedStudent = encryptObjectValues(studentToAdd);
        await addDoc(collection(db, "students"), encryptedStudent);
        toast({ title: "Sucesso!", description: "Aluno cadastrado." });
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
    } catch (error) {
      console.error("Error deleting student: ", error);
      toast({ variant: "destructive", title: "Erro!", description: "Não foi possível excluir o aluno." });
    }
  }

  const handleSchoolTypeChange = (type: 'estaduais' | 'municipais', checked: boolean) => {
    setSchoolTypeFilter(prev => ({ ...prev, [type]: checked }));
    setCurrentPage(1); // Reset to first page on filter change
  }
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page on tab change
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search change
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
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
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Escola</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Ano / Classe
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    RA
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                        <Badge variant={student.status === 'Homologado' ? 'default' : 'destructive'} className={student.status === 'Homologado' ? 'bg-green-600' : ''}>
                            {student.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                        {student.school}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{student.schoolYear} / {student.class}</TableCell>
                        <TableCell className="hidden md:table-cell">{student.ra}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
                Mostrando <strong>{paginatedStudents.length}</strong> de <strong>{filteredStudents.length}</strong> alunos.
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
      <Dialog open={isProfileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <StudentProfileDialog 
            student={activeStudent}
            isEditing={isEditing}
            onSave={handleSaveStudent}
            onClose={handleCloseProfileDialog}
        />
      </Dialog>
    </Tabs>
  );
}
