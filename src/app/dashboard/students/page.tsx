'use client';
import { useState } from 'react';
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
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
import { MapPlaceholder } from '@/components/map-placeholder';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Mock data
const initialStudents = Array.from({ length: 25 }, (_, i) => ({
  id: `STU${1001 + i}`,
  name: `Aluno ${1001 + i}`,
  ra: `RA${2024001 + i}`,
  cpf: `123.456.789-${10 + i}`,
  rg: `12.345.678-${i}`,
  school: i % 3 === 0 ? 'Escola Estadual A' : i % 3 === 1 ? 'Escola Municipal B' : 'Escola Municipalizada C',
  schoolYear: `${(i % 5) + 5}º Ano`,
  class: `Turma ${String.fromCharCode(65 + (i % 4))}`,
  status: i % 5 === 0 ? 'Não Homologado' : 'Homologado',
  enrollmentDate: new Date(2024, 0, 15 + i).toLocaleDateString('pt-BR'),
  responsibleName: 'Maria da Silva',
  contactPhone: '(11) 98765-4321',
  rgIssueDate: '10/05/2010',
}));

type Student = typeof initialStudents[0];


function StudentProfileDialog({ 
  student, 
  isEditing: initialIsEditing = false,
  onSave,
  onClose,
}: { 
  student: Student, 
  isEditing?: boolean,
  onSave: (updatedStudent: Student) => void,
  onClose: () => void,
}) {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [editedStudent, setEditedStudent] = useState<Student>({ ...student });

  const handleEditClick = () => setIsEditing(true);

  const handleSaveClick = () => {
    onSave(editedStudent);
    setIsEditing(false); 
    onClose();
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedStudent({ ...student }); // Reset changes
    if (initialIsEditing) {
        onClose();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditedStudent(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setEditedStudent(prev => ({ ...prev, status: value }));
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
                <Button variant="outline" onClick={handleCancelClick}>Cancelar</Button>
                <Button onClick={handleSaveClick}>Salvar Alterações</Button>
            </>
        ) : (
            <Button onClick={handleEditClick}>Editar</Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

function AddStudentDialog() {
  const { user } = useUser();
  if (!user || user.role < 2) return null;

  return (
    <DialogContent className="sm:max-w-[900px]">
      <DialogHeader>
        <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
        <DialogDescription>Preencha os dados do aluno. Clique em salvar para concluir.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 md:grid-cols-2">
        <div className="space-y-4">
            <Input id="name" placeholder="Nome Completo" />
            <Input id="cpf" placeholder="CPF" />
            <Input id="ra" placeholder="RA (Registro do Aluno)" />
            <Input id="rg" placeholder="RG" />
            <div className="grid grid-cols-2 gap-4">
                <Input id="schoolYear" placeholder="Ano Escolar" />
                <Input id="class" placeholder="Classe" />
            </div>
             <Input id="responsavel" placeholder="Nome do Responsável" />
             <Input id="email" type="email" placeholder="Email de Contato" />
             <Input id="phone" type="tel" placeholder="Telefone de Contato" />
        </div>
         <div className="space-y-4">
            <Input id="address" placeholder="Endereço (Rua, Número, Bairro...)" />
            <MapPlaceholder />
         </div>
      </div>
       <Button type="submit" className="w-full">Salvar Aluno</Button>
    </DialogContent>
  );
}


export default function StudentsPage() {
  const { user } = useUser();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const openDialog = (studentId: string, isEditing: boolean) => {
    if (isEditing) {
      setEditingStudentId(studentId);
      setViewingStudentId(null);
    } else {
      setViewingStudentId(studentId);
      setEditingStudentId(null);
    }
  }

  const closeDialogs = () => {
    setEditingStudentId(null);
    setViewingStudentId(null);
  }
  
  const handleSaveStudent = (updatedStudent: Student) => {
    setStudents(prevStudents => 
        prevStudents.map(student => 
            student.id === updatedStudent.id ? updatedStudent : student
        )
    );
    closeDialogs();
  };
  
  const studentToView = students.find(s => s.id === viewingStudentId);
  const studentToEdit = students.find(s => s.id === editingStudentId);

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active" className="text-green-600">Homologados</TabsTrigger>
          <TabsTrigger value="draft" className="text-orange-500">Não Homologados</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
           <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por RA, CPF, Nome..."
              className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
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
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked>
                Estaduais
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Municipais</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-10 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          {user && user.role >= 2 && (
             <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Novo Aluno
                    </span>
                  </Button>
                </DialogTrigger>
                <AddStudentDialog />
              </Dialog>
          )}
        </div>
      </div>
      <TabsContent value="all">
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
                {students.map((student) => (
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
                          <Dialog onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
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
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={() => openDialog(student.id, false)}>Ver Perfil</DropdownMenuItem>
                                  </DialogTrigger>
                                  {user && user.role >= 2 && 
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem onSelect={() => openDialog(student.id, true)}>Editar</DropdownMenuItem>
                                    </DialogTrigger>
                                  }
                                  {user && user.role === 3 && <DropdownMenuItem className="text-red-500">Excluir</DropdownMenuItem>}
                                </DropdownMenuContent>
                            </DropdownMenu>
                             {(studentToView?.id === student.id || studentToEdit?.id === student.id) && (
                                <StudentProfileDialog 
                                    student={studentToEdit || studentToView!}
                                    isEditing={!!studentToEdit}
                                    onSave={handleSaveStudent}
                                    onClose={closeDialogs}
                                />
                             )}
                          </Dialog>
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Mostrando <strong>1-10</strong> de <strong>32</strong> produtos
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
