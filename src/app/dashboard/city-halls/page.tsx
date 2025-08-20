
'use client';
import { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, Copy, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { collection, addDoc, getDocs, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';


type CityHall = {
    id: string;
    name: string;
    cnpj: string;
    city: string;
    state: string;
    hash: string;
};

type Employee = {
    id: string;
    name: string;
    email: string;
    hash: string;
    role: number | string;
    status: string;
    uid: string;
    creationDate?: string;
    cityHallId?: string;
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
              <SelectItem value="3">Nível 3 (Admin)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid md:grid-cols-2 gap-4 items-center">
            <Label htmlFor="status" className="whitespace-nowrap">Status</Label>
             <Select
                value={currentEmployee.status}
                onValueChange={(value) => setCurrentEmployee(e => ({...e, status: value as 'Ativo' | 'Inativo' | 'Pendente' }))}
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

function AddCityHallDialog({ onSave, onOpenChange }: { onSave: (newCityHall: Omit<CityHall, 'id'>) => void, onOpenChange: (open: boolean) => void }) {
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [city, setCity] = useState('');
    const [state, setUf] = useState('');
    const [hash, setHash] = useState('');
    const { toast } = useToast();

    const generateHash = () => {
        const newHash = 'pm' + Array(8).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        setHash(newHash);
    };
    
    const copyToClipboard = () => {
        if(!hash) return;
        navigator.clipboard.writeText(hash);
        toast({ title: 'Copiado!', description: 'Chave hash copiada para a área de transferência.'});
    }

    const handleSave = () => {
        if (!name || !cnpj || !city || !state || !hash) {
            alert('Por favor, preencha todos os campos e gere uma chave hash.');
            return;
        }
        const newCityHall = { name, cnpj, city, state, hash };
        onSave(newCityHall);
    }

    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Cadastrar Nova Prefeitura</DialogTitle>
                <DialogDescription>
                    Preencha os dados da prefeitura. Uma chave hash será gerada para o cadastro de funcionários da secretaria.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                    <Label htmlFor="name" className="sm:text-right">Nome</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-1 sm:col-span-3" placeholder="Nome da Prefeitura" />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                    <Label htmlFor="cnpj" className="sm:text-right">CNPJ</Label>
                    <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="col-span-1 sm:col-span-3" placeholder="00.000.000/0001-00" />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                    <Label htmlFor="city" className="sm:text-right">Cidade</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="col-span-1 sm:col-span-3" placeholder="Cidade" />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                    <Label htmlFor="state" className="sm:text-right">Estado</Label>
                    <Input id="state" value={state} onChange={(e) => setUf(e.target.value)} className="col-span-1 sm:col-span-3" placeholder="UF" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-4">
                    <Label htmlFor="hash" className="sm:text-right">Chave Hash</Label>
                    <div className="col-span-1 sm:col-span-3 flex items-center gap-2">
                        <Input id="hash" value={hash} readOnly className="font-mono bg-muted" />
                        <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!hash}><Copy className="h-4 w-4"/></Button>
                    </div>
                </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={generateHash} className="w-full sm:w-auto">Gerar Chave</Button>
                <Button onClick={handleSave} className="w-full sm:w-auto">Salvar Prefeitura</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function CityHallDetailsDialog({ cityHall }: { cityHall: CityHall }) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const { toast } = useToast();

     useEffect(() => {
        if (!cityHall?.hash) return;
        
        const q = query(collection(db, "users"), where("encryptedData", ">=", ""));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const cityHallEmployees: Employee[] = [];
            querySnapshot.forEach((doc) => {
                try {
                    const encryptedData = doc.data();
                    const data = decryptObjectValues(encryptedData) as any;
                    
                    if(data && data.hash === cityHall.hash) {
                        cityHallEmployees.push({
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
                } catch (e) {
                    console.error("Error processing user document:", doc.id, e)
                }
            });
            setEmployees(cityHallEmployees);
        });

        return () => unsubscribe();
    }, [cityHall]);

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
        
        const currentDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', updatedEmployee.uid)));
        if (currentDoc.empty) throw new Error("Funcionário não encontrado.");
        
        const encryptedData = currentDoc.docs[0].data();
        const decryptedData = decryptObjectValues(encryptedData);
        if(!decryptedData) throw new Error("Falha ao descriptografar dados do funcionário.");
          
        const roleString = updatedEmployee.role;
        const roleNumber = typeof roleString === 'string' && roleString.startsWith('Nível') ? parseInt(roleString.split(' ')[1], 10) : updatedEmployee.role;
        
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
        switch(role) {
            case 1: return 'Nível 1';
            case 2: return 'Nível 2';
            case 3: return 'Nível 3';
            default: return 'Pendente';
        }
    }


    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{cityHall.name}</DialogTitle>
                <DialogDescription>{cityHall.city} - {cityHall.state}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Informações da Prefeitura</TabsTrigger>
                    <TabsTrigger value="employees">Funcionários</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="pt-4">
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <p><span className="font-semibold">ID:</span> {cityHall.id}</p>
                            <p><span className="font-semibold">Nome:</span> {cityHall.name}</p>
                            <p><span className="font-semibold">CNPJ:</span> {cityHall.cnpj}</p>
                            <p><span className="font-semibold">Cidade/UF:</span> {cityHall.city}/{cityHall.state}</p>
                            <p className="flex items-center gap-2"><span className="font-semibold">Chave Hash:</span> <span className="font-mono text-muted-foreground break-all">{cityHall.hash}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(cityHall.hash)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="employees" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funcionários</CardTitle>
                            <CardDescription>Lista de funcionários da secretaria cadastrados nesta prefeitura.</CardDescription>
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
        </DialogContent>
    );
}


export default function CityHallsPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [cityHalls, setCityHalls] = useState<CityHall[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCityHall, setSelectedCityHall] = useState<CityHall | null>(null);

    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
            return;
        }

        const unsubscribe = onSnapshot(collection(db, "city-halls"), (snapshot) => {
            const halls: CityHall[] = [];
            snapshot.forEach((doc) => {
                const encryptedData = doc.data();
                const data = decryptObjectValues(encryptedData) as any;
                if(data) {
                    halls.push({ id: doc.id, ...data } as CityHall);
                }
            });
            setCityHalls(halls);
        });
        
        return () => unsubscribe();
    }, [user, router]);


    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleCityHallClick = (cityHall: CityHall) => {
        setSelectedCityHall(cityHall);
        setIsDetailsModalOpen(true);
    }
    
    const handleAddCityHall = async (newCityHallData: Omit<CityHall, 'id'>) => {
        try {
            const encryptedData = encryptObjectValues(newCityHallData);
            await addDoc(collection(db, "city-halls"), encryptedData);
            setIsAddModalOpen(false);
            toast({ title: 'Sucesso!', description: 'Prefeitura cadastrada com sucesso.'});
        } catch (error) {
            console.error("Error adding city hall: ", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cadastrar a prefeitura.'});
        }
    }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
                <CardTitle>Prefeituras</CardTitle>
                <CardDescription>Gerencie as prefeituras conveniadas.</CardDescription>
            </div>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 w-full sm:w-auto">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nova Prefeitura
                    </Button>
                </DialogTrigger>
                <AddCityHallDialog onSave={handleAddCityHall} onOpenChange={setIsAddModalOpen} />
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cityHalls.map((cityHall) => (
                  <TableRow key={cityHall.id}>
                    <TableCell className="font-medium">
                        <button onClick={() => handleCityHallClick(cityHall)} className="hover:underline text-primary">
                            {cityHall.name}
                        </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{cityHall.cnpj}</TableCell>
                    <TableCell>{cityHall.city}</TableCell>
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
                          <DropdownMenuItem onSelect={() => handleCityHallClick(cityHall)}>Ver Detalhes</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">Desativar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
    <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        {selectedCityHall && <CityHallDetailsDialog cityHall={selectedCityHall} />}
    </Dialog>
    </>
  );
}
