
'use client';
import { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, Copy, Search } from 'lucide-react';
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
import { collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';
import { AddressMap } from '@/components/address-map';


type School = {
  id: string;
  name: string;
  address: string;
  hash: string;
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
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-4">
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
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={handleSave}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  )
}

function AddSchoolDialog({ onSave, onOpenChange }: { onSave: (school: Omit<School, 'id'>) => void, onOpenChange: (open:boolean)=>void}) {
  const [schoolData, setSchoolData] = useState({ name: '', address: '', hash: '' });
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
    if (!schoolData.name || !schoolData.address || !schoolData.hash) {
      toast({ variant: 'destructive', title: "Erro de Validação", description: "Por favor, preencha todos os campos e gere uma chave." });
      return;
    }
    onSave(schoolData);
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Nome
          </Label>
          <Input id="name" value={schoolData.name} onChange={(e) => handleDataChange('name', e.target.value)} className="col-span-3" placeholder="Nome da Escola" />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="address" className="text-right pt-2">
            Endereço
          </Label>
          <div className="col-span-3 space-y-2">
            <AddressMap onAddressSelect={(addr) => handleDataChange('address', addr)} />
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="hash" className="text-right">
            Chave Hash
          </Label>
          <div className="col-span-3 flex items-center gap-2">
            <Input id="hash" value={schoolData.hash} readOnly className="font-mono bg-muted" />
            <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!schoolData.hash}><Copy className="h-4 w-4"/></Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={generateHash}>Gerar Chave</Button>
        <Button type="submit" onClick={handleSave}>Salvar Escola</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SchoolDetailsDialog({ school }: { school: School }) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!school?.hash) return;
        
        const q = query(collection(db, "users"), where("encryptedData", ">=", "")); // A dummy where to allow orderBy
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
        });

        return () => unsubscribe();
    }, [school]);

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

    const handleSaveEmployee = async (updatedEmployee: Employee) => {
        if (!updatedEmployee.uid) return;
        try {
          const employeeDocRef = doc(db, 'users', updatedEmployee.uid);
          const roleString = updatedEmployee.role;
          const roleNumber = typeof roleString === 'string' && roleString.startsWith('Nível') ? parseInt(roleString.split(' ')[1], 10) : updatedEmployee.role;

          // Fetch current data to merge
          const currentDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', updatedEmployee.uid)));
          if (currentDoc.empty) throw new Error("Funcionário não encontrado.");
          
          const encryptedData = currentDoc.docs[0].data();
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

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{school.name}</DialogTitle>
                <DialogDescription>{school.address}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Informações da Escola</TabsTrigger>
                    <TabsTrigger value="employees">Funcionários</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="pt-4">
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <p><span className="font-semibold">ID:</span> {school.id}</p>
                            <p><span className="font-semibold">Nome:</span> {school.name}</p>
                            <p><span className="font-semibold">Endereço:</span> {school.address}</p>
                            <p className="flex items-center gap-2"><span className="font-semibold">Chave Hash:</span> <span className="font-mono text-muted-foreground">{school.hash}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(school.hash)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </p>
                            <AddressMap initialAddress={school.address} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="employees" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funcionários</CardTitle>
                            <CardDescription>Lista de funcionários cadastrados nesta escola.</CardDescription>
                            <div className="flex items-center gap-2 pt-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar por nome ou e-mail..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
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
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Nível</TableHead>
                                            <TableHead>Data de Criação</TableHead>
                                            <TableHead><span className="sr-only">Ações</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredEmployees.length > 0 ? filteredEmployees.map(employee => (
                                            <TableRow key={employee.id}>
                                                <TableCell className="font-medium">{employee.name}</TableCell>
                                                <TableCell>{employee.email}</TableCell>
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
                                                <TableCell>{getRoleName(employee.role)}</TableCell>
                                                <TableCell>{employee.creationDate}</TableCell>
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
                                {editingEmployee && <ManageEmployeeDialog employee={editingEmployee} onSave={handleSaveEmployee} onOpenChange={(isOpen) => !isOpen && setEditingEmployee(null)}/>}
                            </Dialog>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DialogContent>
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

    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
            return;
        }

        const unsubscribe = onSnapshot(collection(db, "schools"), (snapshot) => {
            const schoolsData: School[] = [];
            snapshot.forEach((doc) => {
                const encryptedData = doc.data();
                const data = decryptObjectValues(encryptedData) as any;
                if (data) {
                    schoolsData.push({ id: doc.id, ...data } as School);
                }
            });
            setSchools(schoolsData);
        });

        return () => unsubscribe();
    }, [user, router]);


    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleSchoolClick = (school: School) => {
        setSelectedSchool(school);
        setIsSchoolModalOpen(true);
    }

    const handleSaveSchool = async (schoolData: Omit<School, 'id'>) => {
        try {
            const encryptedSchool = encryptObjectValues(schoolData);
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
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Escolas</CardTitle>
                <CardDescription>Gerencie as escolas cadastradas no sistema.</CardDescription>
            </div>
             <Dialog open={isAddSchoolModalOpen} onOpenChange={setAddSchoolModalOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nova Escola
                    </Button>
                </DialogTrigger>
                <AddSchoolDialog onSave={handleSaveSchool} onOpenChange={setAddSchoolModalOpen} />
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Escola</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">
                    <button onClick={() => handleSchoolClick(school)} className="hover:underline text-primary">
                        {school.name}
                    </button>
                </TableCell>
                <TableCell>{school.address}</TableCell>
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
                      <DropdownMenuItem onSelect={() => handleSchoolClick(school)}>Ver Detalhes</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500">Desativar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
     <Dialog open={isSchoolModalOpen} onOpenChange={setIsSchoolModalOpen}>
        {selectedSchool && <SchoolDetailsDialog school={selectedSchool} />}
    </Dialog>
    </>
  );
}
