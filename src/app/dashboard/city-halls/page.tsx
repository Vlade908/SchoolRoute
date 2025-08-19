
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


const cityHalls = [
    { id: 'PM001', name: 'Prefeitura de São Paulo', cnpj: '46.392.130/0001-22', city: 'São Paulo', state: 'SP', hash: 'pmspa1b2c3' },
    { id: 'PM002', name: 'Prefeitura do Rio de Janeiro', cnpj: '42.498.717/0001-20', city: 'Rio de Janeiro', state: 'RJ', hash: 'pmrjb4c5d6' },
    { id: 'PM003', name: 'Prefeitura de Salvador', cnpj: '13.927.801/0001-49', city: 'Salvador', state: 'BA', hash: 'pmssa7e8f9' },
];

const allEmployeesData = [
    { id: 'EMP003', name: 'Carlos Pereira', email: 'carlos.p@secretaria.gov', cityHallId: 'PM001', status: 'Ativo', creationDate: '2023-01-10', role: 'Nível 3' },
    { id: 'EMP008', name: 'Julia Lima', email: 'julia.l@secretaria.gov', cityHallId: 'PM001', status: 'Ativo', creationDate: '2023-06-15', role: 'Nível 3' },
    { id: 'EMP009', name: 'Roberto Almeida', email: 'roberto.a@secretaria.rj', cityHallId: 'PM002', status: 'Inativo', creationDate: '2022-12-01', role: 'Nível 3' },
];

type Employee = typeof allEmployeesData[0];

function ManageEmployeeDialog({ employee, onSave, onOpenChange }: { employee: Employee, onSave: (employee: Employee) => void, onOpenChange: (open: boolean) => void }) {
  const [currentEmployee, setCurrentEmployee] = useState(employee);

  const handleSave = () => {
    onSave(currentEmployee);
    onOpenChange(false);
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
            value={currentEmployee.role.split(' ')[1]}
            onValueChange={(value) => setCurrentEmployee(e => ({...e, role: `Nível ${value}`}))}
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

function AddCityHallDialog() {
    const [hash, setHash] = useState('');

    const generateHash = () => {
        const newHash = 'pm' + Array(8).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        setHash(newHash);
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(hash);
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
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input id="name" className="col-span-3" placeholder="Nome da Prefeitura" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cnpj" className="text-right">CNPJ</Label>
                    <Input id="cnpj" className="col-span-3" placeholder="00.000.000/0001-00" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="city" className="text-right">Cidade</Label>
                    <Input id="city" className="col-span-3" placeholder="Cidade" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="state" className="text-right">Estado</Label>
                    <Input id="state" className="col-span-3" placeholder="UF" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hash" className="text-right">Chave Hash</Label>
                    <div className="col-span-3 flex items-center gap-2">
                        <Input id="hash" value={hash} readOnly className="font-mono bg-muted" />
                        <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!hash}><Copy className="h-4 w-4"/></Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={generateHash}>Gerar Chave</Button>
                <Button type="submit">Salvar Prefeitura</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function CityHallDetailsDialog({ cityHall }: { cityHall: typeof cityHalls[0] }) {
    const [allEmployees, setAllEmployees] = useState(allEmployeesData);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    const cityHallEmployees = useMemo(() => {
        let employees = allEmployees.filter(emp => emp.cityHallId === cityHall.id);

        if (statusFilter !== 'todos') {
            employees = employees.filter(emp => emp.status.toLowerCase() === statusFilter);
        }

        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            employees = employees.filter(emp =>
                emp.name.toLowerCase().includes(lowerCaseSearch) ||
                emp.email.toLowerCase().includes(lowerCaseSearch)
            );
        }

        return employees;
    }, [cityHall.id, searchTerm, statusFilter, allEmployees]);

    const handleSaveEmployee = (updatedEmployee: Employee) => {
        setAllEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
        setEditingEmployee(null);
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
                            <p className="flex items-center gap-2"><span className="font-semibold">Chave Hash:</span> <span className="font-mono text-muted-foreground">{cityHall.hash}</span>
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
                                        <SelectItem value="ativo">Ativos</SelectItem>
                                        <SelectItem value="inativo">Inativos</SelectItem>
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
                                        {cityHallEmployees.length > 0 ? cityHallEmployees.map(employee => (
                                            <TableRow key={employee.id}>
                                                <TableCell className="font-medium">{employee.name}</TableCell>
                                                <TableCell>{employee.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={employee.status === 'Ativo' ? 'default' : 'secondary'} className={employee.status === 'Ativo' ? 'bg-green-600' : 'bg-red-600'}>
                                                        {employee.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{employee.role}</TableCell>
                                                <TableCell>{new Date(employee.creationDate).toLocaleDateString('pt-BR')}</TableCell>
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


export default function CityHallsPage() {
    const { user } = useUser();
    const router = useRouter();
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCityHall, setSelectedCityHall] = useState<(typeof cityHalls[0]) | null>(null);

    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
        }
    }, [user, router]);


    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleCityHallClick = (cityHall: typeof cityHalls[0]) => {
        setSelectedCityHall(cityHall);
        setIsDetailsModalOpen(true);
    }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Prefeituras</CardTitle>
                <CardDescription>Gerencie as prefeituras conveniadas.</CardDescription>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nova Prefeitura
                    </Button>
                </DialogTrigger>
                <AddCityHallDialog />
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Estado</TableHead>
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
                <TableCell>{cityHall.cnpj}</TableCell>
                <TableCell>{cityHall.city}</TableCell>
                <TableCell>{cityHall.state}</TableCell>
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
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Ver Convênios</DropdownMenuItem>
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
    <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        {selectedCityHall && <CityHallDetailsDialog cityHall={selectedCityHall} />}
    </Dialog>
    </>
  );
}
