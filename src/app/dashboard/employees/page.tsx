
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
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { decryptObjectValues, encryptObjectValues } from '@/lib/crypto';
import { cn } from '@/lib/utils';

type Employee = {
    id: string; // Firestore document ID
    uid: string;
    name: string;
    email: string;
    role: number;
    status: 'Ativo' | 'Inativo' | 'Pendente';
    hash: string;
    origin?: string; // Might need to fetch this based on hash
};

function ManageEmployeeDialog({ employee, onSave, onOpenChange }: { employee: Employee, onSave: (employee: Employee) => void, onOpenChange: (open:boolean) => void }) {
  const [currentEmployee, setCurrentEmployee] = useState(employee);

  const handleSave = () => {
    onSave(currentEmployee);
    onOpenChange(false);
  }
  
  const isSecretary = employee.hash.startsWith('pm');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Gerenciar Funcionário</DialogTitle>
        <DialogDescription>Aprove ou edite as permissões para {employee.name}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <p><strong>Nome:</strong> {employee.name}</p>
        <p><strong>Email:</strong> {employee.email}</p>
        <p><strong>Instituição:</strong> {employee.origin || 'N/A'}</p>
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <Label htmlFor="role" className="whitespace-nowrap">Nível de Privilégio</Label>
          <Select 
            value={currentEmployee.role.toString()}
            onValueChange={(value) => setCurrentEmployee(e => ({...e, role: parseInt(value, 10)}))}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione o nível" />
            </SelectTrigger>
            <SelectContent>
                {isSecretary ? (
                     <>
                        <SelectItem value="1">Nível 1 (Visualizar)</SelectItem>
                        <SelectItem value="2">Nível 2 (Cadastrar Alunos)</SelectItem>
                        <SelectItem value="3">Nível 3 (Admin)</SelectItem>
                     </>
                ) : (
                     <>
                        <SelectItem value="1">Nível 1 (Visualizar)</SelectItem>
                        <SelectItem value="2">Nível 2 (Cadastrar Alunos)</SelectItem>
                     </>
                )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <Label htmlFor="status">Status</Label>
           <Select 
            value={currentEmployee.status}
            onValueChange={(value) => setCurrentEmployee(e => ({...e, status: value as Employee['status']}))}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
        <Button onClick={handleSave} className="w-full sm:w-auto">Salvar Alterações</Button>
      </DialogFooter>
    </DialogContent>
  )
}

export default function EmployeesPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);


    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
            return;
        }

        const unsubscribe = onSnapshot(collection(db, "users"), async (snapshot) => {
            const usersData: Employee[] = [];
            const institutions = new Map<string, string>();

            // Pre-fetch all schools and city halls to map hash to name
            const schoolsSnapshot = await getDocs(collection(db, "schools"));
            schoolsSnapshot.forEach(doc => {
                const data = decryptObjectValues(doc.data()) as any;
                if(data?.hash) institutions.set(data.hash, data.name);
            });
            const cityHallsSnapshot = await getDocs(collection(db, "city-halls"));
            cityHallsSnapshot.forEach(doc => {
                const data = decryptObjectValues(doc.data()) as any;
                if(data?.hash) institutions.set(data.hash, data.name);
            });

            snapshot.forEach(doc => {
                const data = decryptObjectValues(doc.data()) as any;

                if (data && data.role !== 3) { // Exclude the main admin
                    usersData.push({
                        id: doc.id,
                        uid: data.uid,
                        name: data.name,
                        email: data.email,
                        role: data.role,
                        status: data.status,
                        hash: data.hash,
                        origin: institutions.get(data.hash) || 'Instituição Desconhecida'
                    });
                }
            });
            setEmployees(usersData);
        });

        return () => unsubscribe();

    }, [user, router]);

    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }
    
    const handleSaveEmployee = async (updatedEmployee: Employee) => {
        if (!updatedEmployee.id) return;
        try {
            const employeeDocRef = doc(db, 'users', updatedEmployee.id);
            const currentDoc = await getDoc(employeeDocRef);
            if (!currentDoc.exists()) throw new Error("Funcionário não encontrado.");
            
            const currentData = decryptObjectValues(currentDoc.data());
            if(!currentData) throw new Error("Falha ao ler os dados do funcionário.");
            
            const dataToUpdate = {
                ...currentData,
                status: updatedEmployee.status,
                role: updatedEmployee.role,
            };

            const encryptedUpdate = encryptObjectValues(dataToUpdate);
            await updateDoc(employeeDocRef, encryptedUpdate);
            
            toast({ title: "Sucesso!", description: "Funcionário atualizado." });
        } catch (error) {
            console.error("Failed to update employee:", error);
            toast({ variant: 'destructive', title: "Erro!", description: "Não foi possível atualizar o funcionário." });
        } finally {
            setIsManageDialogOpen(false);
            setSelectedEmployee(null);
        }
    }
    
    const handleEmployeeAction = async (employee: Employee, action: 'deactivate' | 'delete') => {
        try {
            if (action === 'delete') {
                 await deleteDoc(doc(db, "users", employee.id));
                 // Note: This does not delete the user from Firebase Auth.
                 // That would require a server-side function with admin privileges.
                 toast({ title: "Funcionário Excluído", description: "O registro do funcionário foi removido do banco de dados." });
            } else {
                 const employeeDocRef = doc(db, 'users', employee.id);
                 const currentDoc = await getDoc(employeeDocRef);
                 if (!currentDoc.exists()) throw new Error("Funcionário não encontrado.");
                 const currentData = decryptObjectValues(currentDoc.data());
                 if(!currentData) throw new Error("Falha ao ler os dados do funcionário.");

                 const dataToUpdate = { ...currentData, status: 'Inativo' };
                 const encryptedUpdate = encryptObjectValues(dataToUpdate);

                 await updateDoc(employeeDocRef, encryptedUpdate);
                 toast({ title: "Funcionário Desativado", description: "O acesso do funcionário foi revogado." });
            }
        } catch (error) {
             console.error(`Failed to ${action} employee:`, error);
             toast({ variant: 'destructive', title: "Erro!", description: `Não foi possível ${action === 'delete' ? 'excluir' : 'desativar'} o funcionário.` });
        }
    }
    
    const openManageDialog = (employee: Employee) => {
      setSelectedEmployee(employee);
      setIsManageDialogOpen(true);
    }
    
    const getRoleName = (role: number) => {
      switch(role) {
        case 1: return "Nível 1";
        case 2: return "Nível 2";
        case 3: return "Nível 3";
        default: return "Pendente";
      }
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Instituição</TableHead>
                  <TableHead className="hidden md:table-cell">Nível</TableHead>
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
                      <Badge variant={employee.status === 'Ativo' ? 'default' : employee.status === 'Pendente' ? 'secondary' : 'destructive'} 
                             className={cn(
                                employee.status === 'Ativo' && 'bg-green-600',
                                employee.status === 'Pendente' && 'bg-orange-500',
                                employee.status === 'Inativo' && 'bg-red-600'
                             )}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.origin}</TableCell>
                    <TableCell className="hidden md:table-cell">{getRoleName(employee.role)}</TableCell>
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
                                <DropdownMenuItem onSelect={() => openManageDialog(employee)}>
                                    {employee.status === 'Pendente' ? 'Aprovar/Rejeitar' : 'Editar Permissões'}
                                  </DropdownMenuItem>
                                 {employee.status !== 'Pendente' && (
                                    <>
                                     <DropdownMenuSeparator />
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-red-500">
                                            {employee.status === 'Inativo' ? 'Excluir Registro' : 'Desativar'}
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
                                  {employee.status === 'Inativo' 
                                    ? `Esta ação excluirá permanentemente o registro do funcionário '${employee.name}' do banco de dados.`
                                    : `Esta ação desativará o funcionário '${employee.name}'. Ele não terá mais acesso ao sistema.`
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleEmployeeAction(employee, employee.status === 'Inativo' ? 'delete' : 'deactivate')}>Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                         <DialogTrigger asChild>
                            <span></span>
                        </DialogTrigger>
                        {selectedEmployee && <ManageEmployeeDialog employee={selectedEmployee} onSave={handleSaveEmployee} onOpenChange={setIsManageDialogOpen} />}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
