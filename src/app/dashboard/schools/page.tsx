
'use client';
import { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, Copy, Search, Trash2, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, where, Timestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';
import { AddressMap } from '@/components/address-map';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


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
  address: string;
  hash: string;
  schoolType: 'MUNICIPAL' | 'ESTADUAL' | 'MUNICIPALIZADA';
  status: 'Ativa' | 'Inativa';
  grades?: SchoolGrade[];
};

type Employee = {
    id: string;
    uid: string;
    name: string;
    email: string;
    hash: string;
    role: number | string; // Can be number (1, 2) or string 'Aguardando'
    status: string;
    creationDate?: string;
};

type Student = {
    id: string;
    name: string;
    ra: string;
    cpf: string;
}

function ManageEmployeeDialog({ employee, onSave, onOpenChange }: { employee: Employee, onSave: (employee: Employee) => void, onOpenChange: (open: boolean) => void }) {
  const [currentEmployee, setCurrentEmployee] = useState(employee);

  const handleSave = () => {
    onSave(currentEmployee);
    onOpenChange(false);
  }
  
  const getRoleValue = (role: number | string) => {
    if (typeof role === 'number') return role.toString();
    if (typeof role === 'string' && role.startsWith('Nível')) {
        return role.split(' ')[1];
    }
    return role;
  }

  const setRoleValue = (value: string) => {
      const numericValue = parseInt(value, 10);
      setCurrentEmployee(e => ({...e, role: `Nível ${numericValue}`}));
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Gerenciar Funcionário</DialogTitle>
        <DialogDescription>Edite as permissões para {employee.name}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <p><strong>Nome:</strong> {employee.name}</p>
        <p><strong>Email:</strong> {employee.email}</p>
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <Label htmlFor="role" className="whitespace-nowrap">Nível de Privilégio</Label>
          <Select 
            value={getRoleValue(currentEmployee.role)}
            onValueChange={setRoleValue}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione o nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Nível 1 (Visualizar)</SelectItem>
              <SelectItem value="2">Nível 2 (Cadastrar Alunos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid md:grid-cols-2 gap-4 items-center">
            <Label htmlFor="status" className="whitespace-nowrap">Status</Label>
             <Select
                value={currentEmployee.status}
                onValueChange={(value) => setCurrentEmployee(e => ({...e, status: value as 'Ativo' | 'Inativo' }))}
             >
                <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
             </Select>
        </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
        <Button onClick={handleSave} className="w-full sm:w-auto">Salvar</Button>
      </DialogFooter>
    </DialogContent>
  )
}

function AddSchoolDialog({ onSave, onOpenChange }: { onSave: (school: Omit<School, 'id' | 'status'>) => void, onOpenChange: (open:boolean)=>void}) {
  const [schoolData, setSchoolData] = useState({ name: '', address: '', hash: '', schoolType: '' as School['schoolType'] | '', grades: [] });
  const { toast } = useToast();

  const handleDataChange = (field: keyof typeof schoolData, value: string) => {
    setSchoolData(prev => ({ ...prev, [field]: value }));
  };

  const generateHash = () => {
    const newHash = Array(16).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    handleDataChange('hash', newHash);
  };
  
  const copyToClipboard = () => {
    if(!schoolData.hash) return;
    navigator.clipboard.writeText(schoolData.hash);
    toast({ title: 'Copiado!', description: 'Chave hash copiada para a área de transferência.'});
  }

  const handleSave = () => {
    if (!schoolData.name || !schoolData.address || !schoolData.schoolType || !schoolData.hash) {
      toast({ variant: 'destructive', title: "Erro de Validação", description: "Por favor, preencha todos os campos e gere uma chave." });
      return;
    }
    onSave(schoolData as Omit<School, 'id' | 'status'>);
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Cadastrar Nova Escola</DialogTitle>
        <DialogDescription>
          Preencha os dados da escola. Uma chave hash será gerada para o cadastro de funcionários.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
          <Label htmlFor="name" className="sm:text-right">
            Nome
          </Label>
          <Input id="name" value={schoolData.name} onChange={(e) => handleDataChange('name', e.target.value)} className="col-span-1 sm:col-span-3" placeholder="Nome da Escola" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
          <Label htmlFor="schoolType" className="sm:text-right">
            Tipo de Escola
          </Label>
           <Select value={schoolData.schoolType} onValueChange={(value) => handleDataChange('schoolType', value)}>
                <SelectTrigger id="schoolType" className="col-span-1 sm:col-span-3">
                    <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="MUNICIPAL">MUNICIPAL</SelectItem>
                    <SelectItem value="ESTADUAL">ESTADUAL</SelectItem>
                    <SelectItem value="MUNICIPALIZADA">MUNICIPALIZADA</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
          <Label htmlFor="address" className="sm:text-right pt-2">
            Endereço
          </Label>
          <div className="col-span-1 sm:col-span-3 space-y-2">
            <AddressMap onAddressSelect={(addr) => handleDataChange('address', addr)} markerType="school" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
          <Label htmlFor="hash" className="sm:text-right">
            Chave Hash
          </Label>
          <div className="col-span-1 sm:col-span-3 flex items-center gap-2">
            <Input id="hash" value={schoolData.hash} readOnly className="font-mono bg-muted" />
            <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!schoolData.hash}><Copy className="h-4 w-4"/></Button>
          </div>
        </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={generateHash} className="w-full sm:w-auto">Gerar Chave</Button>
        <Button type="submit" onClick={handleSave} className="w-full sm:w-auto">Salvar Escola</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function GradesAndClassesManager({ school, onUpdate, isEditing, onViewClass }: { school: School, onUpdate: (updatedGrades: SchoolGrade[]) => void, isEditing: boolean, onViewClass: (gradeName: string, className: string) => void }) {
  const [grades, setGrades] = useState<SchoolGrade[]>(school.grades || []);
  const [newGradeName, setNewGradeName] = useState('');
  const [editingClass, setEditingClass] = useState<{gradeIndex: number; period: SchoolClass['period']; className: string;} | null>(null);

  useEffect(() => {
    setGrades(school.grades || []);
  }, [school.grades]);

  const periods: SchoolClass['period'][] = ['Manhã', 'Tarde', 'Noite', 'Integral'];

  const handleAddGrade = () => {
    if (newGradeName.trim() && !grades.find(g => g.name.toLowerCase() === newGradeName.trim().toLowerCase())) {
      const updatedGrades = [...grades, { name: newGradeName.trim(), classes: [] }];
      setGrades(updatedGrades);
      onUpdate(updatedGrades);
      setNewGradeName('');
    }
  };
  
  const handleRemoveGrade = (gradeIndex: number) => {
    const updatedGrades = grades.filter((_, i) => i !== gradeIndex);
    setGrades(updatedGrades);
    onUpdate(updatedGrades);
  }

  const handleOpenAddClass = (gradeIndex: number, period: SchoolClass['period']) => {
    setEditingClass({ gradeIndex, period, className: '' });
  }

  const handleSaveClass = () => {
    if(!editingClass) return;
    const { gradeIndex, period, className } = editingClass;
    if(className.trim()){
      const updatedGrades = [...grades];
      const newClass = { name: className.trim(), period: period };
      updatedGrades[gradeIndex].classes.push(newClass);
      setGrades(updatedGrades);
      onUpdate(updatedGrades);
      setEditingClass(null);
    }
  }

  const handleRemoveClass = (gradeIndex: number, classIndex: number) => {
     const updatedGrades = [...grades];
     updatedGrades[gradeIndex].classes.splice(classIndex, 1);
     setGrades(updatedGrades);
     onUpdate(updatedGrades);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Séries e Turmas</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Gerencie as séries e turmas oferecidas pela escola.' 
            : 'Visualize as séries e turmas. Clique no nome da turma para ver os alunos.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing && (
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
            <Input 
              placeholder="Nome da nova série (ex: 1º Ano)"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleAddGrade} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Série</Button>
          </div>
        )}
        <Accordion type="multiple" className="w-full">
          {grades.map((grade, gradeIndex) => (
            <AccordionItem value={grade.name} key={gradeIndex}>
              <AccordionTrigger className="flex justify-between w-full">
                <span>{grade.name}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                   <Accordion type="multiple" className="w-full space-y-2" defaultValue={periods}>
                    {periods.map(period => {
                      const classesForPeriod = grade.classes.filter(c => c.period === period);
                      if (classesForPeriod.length === 0 && !isEditing) return null;

                      return (
                       <AccordionItem value={`${grade.name}-${period}`} key={period} className="bg-background rounded-md border">
                           <div className="flex items-center justify-between px-4">
                             <AccordionTrigger className="py-2 no-underline flex-1">
                                 <h4 className="font-semibold text-sm">{period}</h4>
                             </AccordionTrigger>
                              {isEditing && (
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenAddClass(gradeIndex, period);}}>
                                    <PlusCircle className="mr-2 h-3 w-3"/> Adicionar Turma
                                </Button>
                              )}
                           </div>
                           <AccordionContent className="pb-2 px-4">
                                <div className="overflow-x-auto">
                                    <Table>
                                    <TableBody>
                                      {classesForPeriod.map((cls, classIndex) => (
                                        <TableRow key={classIndex}>
                                          <TableCell className="py-1">
                                             <button 
                                                disabled={isEditing} 
                                                className="disabled:no-underline disabled:cursor-default hover:underline"
                                                onClick={() => !isEditing && onViewClass(grade.name, cls.name)}
                                              >
                                                {cls.name}
                                              </button>
                                          </TableCell>
                                          {isEditing && (
                                            <TableCell className="text-right py-1">
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveClass(gradeIndex, grade.classes.indexOf(cls))}>
                                                <Trash2 className="h-3 w-3 text-red-500"/>
                                              </Button>
                                            </TableCell>
                                          )}
                                        </TableRow>
                                      ))}
                                      {classesForPeriod.length === 0 && isEditing && (
                                        <TableRow>
                                          <TableCell colSpan={2} className="text-xs text-muted-foreground text-center py-2">
                                            Nenhuma turma cadastrada para este período.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                           </AccordionContent>
                       </AccordionItem>
                    )})}
                   </Accordion>

                  {isEditing && (
                    <div className="pt-4 mt-4 border-t">
                       <Button variant="destructive" size="sm" onClick={() => handleRemoveGrade(gradeIndex)}>Remover Série</Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
       <Dialog open={!!editingClass} onOpenChange={(isOpen) => !isOpen && setEditingClass(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Nova Turma</DialogTitle>
                <DialogDescription>
                  Para a série: {editingClass && grades[editingClass.gradeIndex].name} - Período: {editingClass?.period}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="className">Nome da Turma (Ex: A, B, Única)</Label>
                <Input id="className" value={editingClass?.className || ''} onChange={(e) => setEditingClass(prev => prev ? {...prev, className: e.target.value} : null)} />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingClass(null)}>Cancelar</Button>
                <Button onClick={handleSaveClass}>Salvar Turma</Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </Card>
  )
}

function ClassStudentsDialog({ isOpen, onOpenChange, schoolId, gradeName, className }: { isOpen: boolean, onOpenChange: (isOpen: boolean) => void, schoolId: string, gradeName: string, className: string }) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        
        const fetchStudents = async () => {
            setLoading(true);
            const studentsRef = collection(db, "students");
            const q = query(studentsRef);
            
            const querySnapshot = await getDocs(q);
            const classStudents: Student[] = [];
            querySnapshot.forEach(doc => {
                const decryptedData = decryptObjectValues(doc.data()) as any;
                if(decryptedData && decryptedData.schoolId === schoolId && decryptedData.grade === gradeName && decryptedData.className === className) {
                    classStudents.push({
                        id: doc.id,
                        name: decryptedData.name,
                        ra: decryptedData.ra,
                        cpf: decryptedData.cpf
                    });
                }
            });
            setStudents(classStudents);
            setLoading(false);
        }

        fetchStudents();
    }, [isOpen, schoolId, gradeName, className]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Alunos da Turma - {gradeName} {className}</DialogTitle>
                    <DialogDescription>Lista de alunos matriculados nesta turma.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>RA</TableHead>
                                <TableHead>CPF</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
                            ) : students.length > 0 ? (
                                students.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{student.ra}</TableCell>
                                        <TableCell>{student.cpf}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center">Nenhum aluno encontrado nesta turma.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function SchoolDetailsDialog({ school, onClose }: { school: School, onClose: () => void }) {
    const [editedSchool, setEditedSchool] = useState<School>(school);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [classStudentsModal, setClassStudentsModal] = useState<{ isOpen: boolean; gradeName?: string; className?: string }>({ isOpen: false });
    const { toast } = useToast();

    useEffect(() => {
      setEditedSchool(school);
    }, [school]);

    useEffect(() => {
      if (!school?.hash) return;
      
      const fetchEmployees = async () => {
        try {
          const usersRef = collection(db, "users");
          // This query will be slow if there are many users.
          // A better approach would be to have a 'schoolHash' field to query directly.
          // Assuming 'hash' field exists inside encryptedData.
          const q = query(usersRef);
          
          const querySnapshot = await getDocs(q);
          const schoolEmployees: Employee[] = [];
          querySnapshot.forEach((doc) => {
              const encryptedData = doc.data();
              const data = decryptObjectValues(encryptedData) as any;
              if (data && data.hash === school.hash) {
                  schoolEmployees.push({
                      id: doc.id,
                      uid: data.uid,
                      name: data.name,
                      email: data.email,
                      role: data.role,
                      status: data.status,
                      hash: data.hash,
                      creationDate: data.creationDate?.toDate().toLocaleDateString('pt-BR') ?? 'N/A'
                  });
              }
          });
          setEmployees(schoolEmployees);
        } catch (e) {
          console.error("Error fetching employees:", e);
          toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os funcionários." });
        }
      };
      
      fetchEmployees();
    }, [school, toast]);

    const filteredEmployees = useMemo(() => {
        let filtered = employees;

        if (statusFilter !== 'todos') {
            filtered = filtered.filter(emp => emp.status.toLowerCase() === statusFilter);
        }

        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(emp =>
                emp.name.toLowerCase().includes(lowerCaseSearch) ||
                emp.email.toLowerCase().includes(lowerCaseSearch)
            );
        }

        return filtered;
    }, [employees, searchTerm, statusFilter]);
    
    const updateSchoolData = async (dataToUpdate: Partial<School>) => {
      try {
        const schoolDocRef = doc(db, 'schools', school.id);
        const schoolDoc = await getDoc(schoolDocRef);
        if (!schoolDoc.exists()) throw new Error("Escola não encontrada.");

        const encryptedData = schoolDoc.data();
        const decryptedData = decryptObjectValues(encryptedData);
        if(!decryptedData) throw new Error("Falha ao descriptografar dados da escola.");

        const finalData = { ...decryptedData, ...dataToUpdate };
        const encryptedUpdate = encryptObjectValues(finalData);

        await updateDoc(schoolDocRef, encryptedUpdate);
        toast({ title: 'Sucesso!', description: 'Dados da escola atualizados.'});
        if(isEditing){
          setIsEditing(false);
        }
      } catch (error) {
        console.error("Error updating school:", error);
        toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível atualizar os dados da escola.'});
      }
    }

    const handleEditChange = (field: keyof School, value: string) => {
      setEditedSchool(prev => ({...prev, [field]: value}));
    }

    const handleSaveEdits = () => {
      const { name, schoolType, address } = editedSchool;
      updateSchoolData({ name, schoolType, address });
    }

    const handleSaveEmployee = async (updatedEmployee: Employee) => {
        if (!updatedEmployee.uid) return;
        try {
          const employeeDocRef = doc(db, 'users', updatedEmployee.uid);
          const roleString = updatedEmployee.role;
          const roleNumber = typeof roleString === 'string' && roleString.startsWith('Nível') ? parseInt(roleString.split(' ')[1], 10) : updatedEmployee.role;

          const employeeDoc = await getDoc(employeeDocRef);
          if (!employeeDoc.exists()) throw new Error("Funcionário não encontrado.");
          
          const encryptedData = employeeDoc.data();
          const decryptedData = decryptObjectValues(encryptedData);
          if(!decryptedData) throw new Error("Falha ao descriptografar dados do funcionário.");
          
          const dataToUpdate = {
              ...decryptedData,
              status: updatedEmployee.status,
              role: roleNumber,
          };
          
          const encryptedUpdate = encryptObjectValues(dataToUpdate);

          await updateDoc(employeeDocRef, encryptedUpdate);
          toast({ title: 'Sucesso!', description: 'Funcionário atualizado.'});
          setEmployees(prev => prev.map(e => e.uid === updatedEmployee.uid ? {...e, status: updatedEmployee.status, role: roleNumber } : e))
        } catch(error) {
          console.error("Error updating employee:", error);
          toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível atualizar o funcionário.'});
        }
        setEditingEmployee(null);
    }
    
    const getRoleName = (role: number | string) => {
        if (typeof role === 'string' && role.startsWith('Nível')) return role;
        if (role === 'Aguardando') return 'Aguardando';
        switch(role) {
            case 1: return 'Nível 1';
            case 2: return 'Nível 2';
            default: return 'Pendente';
        }
    }
    
    const handleViewClass = (gradeName: string, className: string) => {
        setClassStudentsModal({ isOpen: true, gradeName, className });
    }

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <DialogTitle>{school.name}</DialogTitle>
                        <DialogDescription>{school.address}</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {isEditing ? 'Cancelar' : 'Editar'}
                    </Button>
                </div>
            </DialogHeader>
            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="grades">Séries e Turmas</TabsTrigger>
                    <TabsTrigger value="employees">Funcionários</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="pt-4">
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            {isEditing ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                                  <Label htmlFor="name-edit" className="sm:text-right">Nome</Label>
                                  <Input id="name-edit" value={editedSchool.name} onChange={(e) => handleEditChange('name', e.target.value)} className="col-span-1 sm:col-span-3" />
                                </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                                    <Label htmlFor="schoolType-edit" className="sm:text-right">Tipo</Label>
                                    <Select value={editedSchool.schoolType} onValueChange={(value) => handleEditChange('schoolType', value)}>
                                        <SelectTrigger id="schoolType-edit" className="col-span-1 sm:col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MUNICIPAL">MUNICIPAL</SelectItem>
                                            <SelectItem value="ESTADUAL">ESTADUAL</SelectItem>
                                            <SelectItem value="MUNICIPALIZADA">MUNICIPALIZADA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
                                    <Label className="sm:text-right pt-2">Endereço</Label>
                                    <div className="col-span-1 sm:col-span-3">
                                      <AddressMap 
                                        initialAddress={editedSchool.address} 
                                        onAddressSelect={(addr) => handleEditChange('address', addr)}
                                        markerType="school" 
                                      />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSaveEdits}>Salvar Alterações</Button>
                                </div>
                              </div>
                            ) : (
                                <>
                                    <p><span className="font-semibold">ID:</span> <span className="text-sm text-muted-foreground">{school.id}</span></p>
                                    <p><span className="font-semibold">Nome:</span> {school.name}</p>
                                    <p><span className="font-semibold">Tipo:</span> {school.schoolType}</p>
                                    <p><span className="font-semibold">Endereço:</span> {school.address}</p>
                                    <p className="flex items-center gap-2"><span className="font-semibold">Chave Hash:</span> <span className="font-mono text-muted-foreground break-all">{school.hash}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(school.hash)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </p>
                                    <AddressMap initialAddress={school.address} markerType="school" />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="grades" className="pt-4">
                    <GradesAndClassesManager 
                      school={school} 
                      onUpdate={(updatedGrades) => updateSchoolData({ grades: updatedGrades })}
                      isEditing={isEditing}
                      onViewClass={handleViewClass}
                    />
                </TabsContent>
                <TabsContent value="employees" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funcionários</CardTitle>
                            <CardDescription>Lista de funcionários cadastrados nesta escola.</CardDescription>
                            <div className="flex flex-col md:flex-row items-center gap-2 pt-2">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar por nome ou e-mail..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full md:w-[180px]">
                                        <SelectValue placeholder="Filtrar por status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="Ativo">Ativos</SelectItem>
                                        <SelectItem value="Inativo">Inativos</SelectItem>
                                        <SelectItem value="Pendente">Pendentes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Dialog open={!!editingEmployee} onOpenChange={(isOpen) => !isOpen && setEditingEmployee(null)}>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead className="hidden sm:table-cell">Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="hidden md:table-cell">Nível</TableHead>
                                            <TableHead className="hidden lg:table-cell">Data de Criação</TableHead>
                                            <TableHead><span className="sr-only">Ações</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredEmployees.length > 0 ? filteredEmployees.map(employee => (
                                            <TableRow key={employee.id}>
                                                <TableCell className="font-medium">{employee.name}</TableCell>
                                                <TableCell className="hidden sm:table-cell">{employee.email}</TableCell>
                                                <TableCell>
                                                     <Badge variant={employee.status === 'Ativo' ? 'default' : employee.status === 'Pendente' ? 'secondary' : 'destructive'} 
                                                         className={
                                                            employee.status === 'Ativo' ? 'bg-green-600' : 
                                                            employee.status === 'Pendente' ? 'bg-orange-500' :
                                                            'bg-red-600'
                                                         }>
                                                        {employee.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{getRoleName(employee.role)}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{employee.creationDate}</TableCell>
                                                <TableCell>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                            <DialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={() => setEditingEmployee(employee)}>Editar</DropdownMenuItem>
                                                            </DialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center">Nenhum funcionário encontrado.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                                {editingEmployee && <ManageEmployeeDialog employee={editingEmployee} onSave={handleSaveEmployee} onOpenChange={(isOpen) => !isOpen && setEditingEmployee(null)}/>}
                            </Dialog>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {classStudentsModal.isOpen && (
              <ClassStudentsDialog 
                isOpen={classStudentsModal.isOpen}
                onOpenChange={(isOpen) => setClassStudentsModal({ isOpen })}
                schoolId={school.id}
                gradeName={classStudentsModal.gradeName!}
                className={classStudentsModal.className!}
              />
            )}
        </DialogContent>
    );
}

function ActionsDropdown({ school }: { school: School }) {
    const { toast } = useToast();
    const [studentCount, setStudentCount] = useState<number | null>(null);

    useEffect(() => {
        const checkStudents = async () => {
            if (!school.id) return;
            const q = query(collection(db, "students"));
            const querySnapshot = await getDocs(q);
            let count = 0;
            querySnapshot.forEach(doc => {
                const decryptedData = decryptObjectValues(doc.data());
                if (decryptedData && decryptedData.schoolId === school.id) {
                    count++;
                }
            });
            setStudentCount(count);
        };
        checkStudents();
    }, [school.id]);

    const updateSchoolStatus = async (status: 'Ativa' | 'Inativa') => {
        try {
            const schoolDocRef = doc(db, 'schools', school.id);
            const schoolDoc = await getDoc(schoolDocRef);
            if (!schoolDoc.exists()) throw new Error("Escola não encontrada.");

            const decryptedData = decryptObjectValues(schoolDoc.data());
            if (!decryptedData) throw new Error("Falha ao descriptografar dados da escola.");

            const updatedData = { ...decryptedData, status, updatedAt: Timestamp.now() };
            const encryptedUpdate = encryptObjectValues(updatedData);
            
            await updateDoc(schoolDocRef, encryptedUpdate);
            toast({ title: `Escola ${status === 'Ativa' ? 'Reativada' : 'Desativada'}!`, description: `A escola ${school.name} foi marcada como ${status.toLowerCase()}.` });
        } catch (error) {
            console.error("Error updating school status:", error);
            toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível alterar o status da escola.' });
        }
    };
    
    const handleDeleteSchool = async () => {
        try {
            await deleteDoc(doc(db, "schools", school.id));
            toast({ title: 'Escola Excluída!', description: `A escola ${school.name} foi excluída permanentemente.` });
        } catch (error) {
            console.error("Error deleting school:", error);
            toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível excluir a escola.' });
        }
    }
    
    return (
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => (document.querySelector(`button[data-school-id='${school.id}']`) as HTMLElement)?.click()}>
                        Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => updateSchoolStatus(school.status === 'Ativa' ? 'Inativa' : 'Ativa')}>
                        {school.status === 'Ativa' ? 'Desativar' : 'Reativar'}
                    </DropdownMenuItem>
                    {studentCount === 0 && (
                        <>
                            <DropdownMenuSeparator />
                             <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-500">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a escola
                        <span className="font-bold"> {school.name} </span>
                        e todos os seus dados do sistema.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSchool} className="bg-destructive hover:bg-destructive/90">
                        Sim, excluir escola
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function SchoolsPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [schools, setSchools] = useState<School[]>([]);
    const [isAddSchoolModalOpen, setAddSchoolModalOpen] = useState(false);
    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
            return;
        }

        const unsubscribe = onSnapshot(collection(db, "schools"), (snapshot) => {
            const schoolsData: School[] = [];
            snapshot.forEach((doc) => {
                const encryptedData = doc.data();
                const data = decryptObjectValues(encryptedData as any);
                if (data) {
                    schoolsData.push({ 
                        id: doc.id,
                        status: data.status || 'Ativa', 
                        ...data 
                    } as School);
                }
            });
            setSchools(schoolsData);
        });

        return () => unsubscribe();
    }, [user, router]);
    
    const filteredSchools = useMemo(() => {
        return schools.filter(school => {
            const statusMatch = statusFilter === 'all' || school.status === statusFilter;
            const typeMatch = typeFilter === 'all' || school.schoolType === typeFilter;
            const searchMatch = searchTerm === '' || school.name.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && typeMatch && searchMatch;
        });
    }, [schools, statusFilter, typeFilter, searchTerm]);


    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleSchoolClick = (school: School) => {
        setSelectedSchool(school);
        setIsSchoolModalOpen(true);
    }

    const handleSaveSchool = async (schoolData: Omit<School, 'id' | 'status'>) => {
        try {
            const newSchoolData = { ...schoolData, status: 'Ativa' as const, createdAt: Timestamp.now() };
            const encryptedSchool = encryptObjectValues(newSchoolData);
            await addDoc(collection(db, "schools"), encryptedSchool);
            setAddSchoolModalOpen(false);
            toast({ title: 'Sucesso!', description: 'Escola cadastrada com sucesso.'});
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível cadastrar a escola.'});
        }
    }


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex-1">
                <CardTitle>Escolas</CardTitle>
                <CardDescription>Gerencie as escolas cadastradas no sistema.</CardDescription>
            </div>
             <Dialog open={isAddSchoolModalOpen} onOpenChange={setAddSchoolModalOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 w-full md:w-auto">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nova Escola
                    </Button>
                </DialogTrigger>
                <AddSchoolDialog onSave={handleSaveSchool} onOpenChange={setAddSchoolModalOpen} />
            </Dialog>
        </div>
         <div className="flex flex-col md:flex-row items-center gap-2 pt-4">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nome..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="Ativa">Ativas</SelectItem>
                      <SelectItem value="Inativa">Inativas</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                      <SelectItem value="ESTADUAL">Estadual</SelectItem>
                      <SelectItem value="MUNICIPALIZADA">Municipalizada</SelectItem>
                  </SelectContent>
              </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
       <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Escola</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Endereço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchools.map((school) => (
              <TableRow key={school.id} className={school.status === 'Inativa' ? 'text-muted-foreground' : ''}>
                <TableCell className="font-medium">
                    <button onClick={() => handleSchoolClick(school)} data-school-id={school.id} className="hover:underline text-primary disabled:text-muted-foreground disabled:no-underline" disabled={school.status === 'Inativa'}>
                        {school.name}
                    </button>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{school.schoolType}</TableCell>
                <TableCell className="hidden md:table-cell">{school.address}</TableCell>
                <TableCell>
                  <Badge variant={school.status === 'Ativa' ? 'default' : 'secondary'} className={school.status === 'Ativa' ? 'bg-green-600' : ''}>
                    {school.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ActionsDropdown school={school} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
     <Dialog open={isSchoolModalOpen} onOpenChange={(isOpen) => {
        if(!isOpen) setSelectedSchool(null);
        setIsSchoolModalOpen(isOpen);
      }}>
        {selectedSchool && <SchoolDetailsDialog school={selectedSchool} onClose={() => setIsSchoolModalOpen(false)} />}
    </Dialog>
    </>
  );
}


