
'use client';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const initialEmployees = [
  { id: 'EMP001', name: 'João da Silva', email: 'joao.silva@escola-a.com', school: 'Escola Estadual A', role: 'Nível 2', status: 'Aprovado' },
  { id: 'EMP002', name: 'Maria Oliveira', email: 'maria.o@escola-b.com', school: 'Escola Municipal B', role: 'Nível 1', status: 'Aprovado' },
  { id: 'EMP003', name: 'Carlos Pereira', email: 'carlos.p@secretaria.gov', school: 'Secretaria de Educação', role: 'Nível 3', status: 'Aprovado' },
  { id: 'EMP004', name: 'Ana Costa', email: 'ana.costa@escola-c.com', school: 'Escola Municipalizada C', role: 'Aguardando', status: 'Pendente' },
];

function ManageEmployeeDialog({ employee, onSave }: { employee: typeof initialEmployees[0], onSave: (employee: typeof initialEmployees[0]) => void }) {
  const [currentEmployee, setCurrentEmployee] = useState(employee);

  const handleSave = () => {
    onSave(currentEmployee);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Gerenciar Funcionário</DialogTitle>
        <DialogDescription>Aprove ou edite as permissões para {employee.name}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <p><strong>Nome:</strong> {employee.name}</p>
        <p><strong>Email:</strong> {employee.email}</p>
        <p><strong>Escola/Secretaria:</strong> {employee.school}</p>
        <div className="flex items-center gap-4">
          <Label htmlFor="role" className="whitespace-nowrap">Nível de Privilégio</Label>
          <Select 
            defaultValue={employee.status === 'Pendente' ? undefined : employee.role.split(' ')[1]}
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
      </div>
      <DialogFooter>
        <Button variant="destructive">Rejeitar</Button>
        <Button onClick={handleSave}>Aprovar e Salvar</Button>
      </DialogFooter>
    </DialogContent>
  )
}

export default function EmployeesPage() {
    const { user } = useUser();
    const router = useRouter();
    const [employees, setEmployees] = useState(initialEmployees);
    const [selectedEmployee, setSelectedEmployee] = useState<typeof initialEmployees[0] | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);


    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
        }
    }, [user, router]);

    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleSaveEmployee = (updatedEmployee: typeof initialEmployees[0]) => {
      setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? { ...updatedEmployee, status: 'Aprovado' } : emp));
      setIsManageDialogOpen(false);
      setSelectedEmployee(null);
    }
    
    const handleDeactivate = (employeeId: string) => {
        setEmployees(prev => prev.map(emp => emp.id === employeeId ? {...emp, status: 'Inativo'} : emp));
    }
    
    const openManageDialog = (employee: typeof initialEmployees[0]) => {
      setSelectedEmployee(employee);
      setIsManageDialogOpen(true);
    }


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Funcionários</CardTitle>
                <CardDescription>
                Gerencie funcionários e aprove novos cadastros.
                </CardDescription>
            </div>
            <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                Novo Funcionário
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Escola/Secretaria</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>
                  <Badge variant={employee.status === 'Aprovado' ? 'default' : employee.status === 'Pendente' ? 'secondary' : 'destructive'} 
                         className={
                            employee.status === 'Aprovado' ? 'bg-green-600' : 
                            employee.status === 'Pendente' ? 'bg-orange-500' :
                            'bg-red-600'
                         }>
                    {employee.status}
                  </Badge>
                </TableCell>
                <TableCell>{employee.school}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>
                 <Dialog open={isManageDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(isOpen) => {
                     if(!isOpen) {
                         setSelectedEmployee(null);
                         setIsManageDialogOpen(false);
                     }
                 }}>
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
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={() => openManageDialog(employee)}>
                                {employee.status === 'Pendente' ? 'Aprovar/Rejeitar' : 'Editar Permissões'}
                              </DropdownMenuItem>
                            </DialogTrigger>
                             {employee.status !== 'Pendente' && (
                                <>
                                 <DropdownMenuSeparator />
                                 <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-red-500">
                                        {employee.status === 'Inativo' ? 'Excluir' : 'Desativar'}
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
                              Esta ação irá {employee.status === 'Inativo' ? 'excluir permanentemente' : 'desativar'} o funcionário '{employee.name}'. 
                              {employee.status !== 'Inativo' && ' Ele não terá mais acesso ao sistema.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeactivate(employee.id)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {selectedEmployee && <ManageEmployeeDialog employee={selectedEmployee} onSave={handleSaveEmployee} />}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
