'use client';
import { useState, useMemo } from 'react';
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
import { MapPlaceholder } from '@/components/map-placeholder';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


const schools = [
  { id: 'SCH001', name: 'Escola Estadual A', address: 'Rua das Flores, 123, São Paulo, SP', hash: 'a1b2c3d4e5f6g7h8' },
  { id: 'SCH002', name: 'Escola Municipal B', address: 'Avenida Brasil, 456, Rio de Janeiro, RJ', hash: 'i9j0k1l2m3n4o5p6' },
  { id: 'SCH003', name: 'Escola Municipalizada C', address: 'Praça da Sé, 789, Salvador, BA', hash: 'q7r8s9t0u1v2w3x4' },
];

const allEmployees = [
    { id: 'EMP001', name: 'João da Silva', email: 'joao.silva@escola-a.com', schoolId: 'SCH001', status: 'Ativo', creationDate: '2023-01-15' },
    { id: 'EMP005', name: 'Ana Oliveira', email: 'ana.o@escola-a.com', schoolId: 'SCH001', status: 'Ativo', creationDate: '2023-03-20' },
    { id: 'EMP006', name: 'Pedro Martins', email: 'pedro.m@escola-a.com', schoolId: 'SCH001', status: 'Inativo', creationDate: '2022-11-10' },
    { id: 'EMP002', name: 'Maria Oliveira', email: 'maria.o@escola-b.com', schoolId: 'SCH002', status: 'Ativo', creationDate: '2023-02-01' },
    { id: 'EMP007', name: 'Luiza Pereira', email: 'luiza.p@escola-b.com', schoolId: 'SCH002', status: 'Ativo', creationDate: '2023-05-05' },
    { id: 'EMP004', name: 'Ana Costa', email: 'ana.costa@escola-c.com', schoolId: 'SCH003', status: 'Ativo', creationDate: '2023-04-12' },
];


function AddSchoolDialog() {
  const [hash, setHash] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const generateHash = () => {
    // In a real app, this would be generated securely on the server
    const newHash = Array(16).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    setHash(newHash);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(hash);
    // Add toast notification here
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
          <Input id="name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="col-span-3" placeholder="Nome da Escola" />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="address" className="text-right pt-2">
            Endereço
          </Label>
          <div className="col-span-3 space-y-2">
            <Input id="address" placeholder="Busque o endereço ou preencha manualmente" />
            <MapPlaceholder />
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="hash" className="text-right">
            Chave Hash
          </Label>
          <div className="col-span-3 flex items-center gap-2">
            <Input id="hash" value={hash} readOnly className="font-mono bg-muted" />
            <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!hash}><Copy className="h-4 w-4"/></Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={generateHash}>Gerar Chave</Button>
        <Button type="submit">Salvar Escola</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SchoolDetailsDialog({ school }: { school: typeof schools[0] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');

    const schoolEmployees = useMemo(() => {
        let employees = allEmployees.filter(emp => emp.schoolId === school.id);

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
    }, [school.id, searchTerm, statusFilter]);

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
                            <MapPlaceholder />
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
                                        <SelectItem value="ativo">Ativos</SelectItem>
                                        <SelectItem value="inativo">Inativos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data de Criação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schoolEmployees.length > 0 ? schoolEmployees.map(employee => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">{employee.name}</TableCell>
                                            <TableCell>{employee.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={employee.status === 'Ativo' ? 'default' : 'secondary'} className={employee.status === 'Ativo' ? 'bg-green-600' : 'bg-red-600'}>
                                                    {employee.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(employee.creationDate).toLocaleDateString('pt-BR')}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">Nenhum funcionário encontrado.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
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
    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<(typeof schools[0]) | null>(null);

    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
        }
    }, [user, router]);


    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleSchoolClick = (school: typeof schools[0]) => {
        setSelectedSchool(school);
        setIsSchoolModalOpen(true);
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
             <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nova Escola
                    </Button>
                </DialogTrigger>
                <AddSchoolDialog />
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Escola</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Chave Hash</TableHead>
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{school.hash}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(school.hash)}>
                        <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
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
