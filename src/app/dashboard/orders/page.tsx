
'use client';
import { useState, useEffect, useMemo } from 'react';
import { MoreHorizontal, PlusCircle, Download } from 'lucide-react';
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
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { decryptObjectValues, encryptObjectValues } from '@/lib/crypto';


type Order = {
    id: string;
    orderId: string;
    date: string;
    totalValue: string;
    user: string;
    studentCount: number;
    fileContent: string;
};

type Student = {
    id: string;
    name: string;
    cpf: string;
    schoolName: string;
    schoolId: string;
};

type School = {
    id: string;
    name: string;
};


function GenerateOrderDialog({ onSave, onOpenChange }: { onSave: (order: Omit<Order, 'id'>) => void; onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [schoolFilter, setSchoolFilter] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Schools
                const schoolsSnapshot = await getDocs(collection(db, 'schools'));
                const schoolsData: School[] = [];
                schoolsSnapshot.forEach(doc => {
                    const data = decryptObjectValues(doc.data()) as any;
                    if (data) {
                       schoolsData.push({ id: doc.id, name: data.name });
                    }
                });
                setSchools(schoolsData);

                // Fetch Students
                const studentsRef = collection(db, "students");
                const q = query(studentsRef);
                const querySnapshot = await getDocs(q);
                const studentsData: Student[] = [];
                querySnapshot.forEach(doc => {
                    const data = decryptObjectValues(doc.data()) as any;
                    if(data && data.status === 'Homologado') {
                        studentsData.push({ id: doc.id, name: data.name, cpf: data.cpf, schoolName: data.schoolName, schoolId: data.schoolId });
                    }
                });
                setAllStudents(studentsData);
            } catch (err) {
                console.error("Failed to fetch data:", err);
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const filteredStudents = useMemo(() => {
        if (schoolFilter === 'all') {
            return allStudents;
        }
        return allStudents.filter(student => student.schoolId === schoolFilter);
    }, [allStudents, schoolFilter]);

    const handleGenerate = () => {
        if (!user || selectedStudents.length === 0) {
            toast({ variant: 'destructive', title: 'Seleção Inválida', description: 'Nenhum aluno selecionado.' });
            return;
        }

        const studentsForFile = allStudents.filter(s => selectedStudents.includes(s.id));
        if (studentsForFile.length === 0) return;

        const ticketValue = 4.90;
        const remainingDays = 15;
        const valuePerStudent = ticketValue * remainingDays * 10;
        const studentsPerFile = 150;
        const numFiles = Math.ceil(studentsForFile.length / studentsPerFile);
        
        const selectedSchool = schools.find(s => s.id === schoolFilter);
        const baseFileName = selectedSchool ? selectedSchool.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() : `pedido_passes_${new Date().toISOString().split('T')[0]}`;

        for (let i = 0; i < numFiles; i++) {
            const start = i * studentsPerFile;
            const end = start + studentsPerFile;
            const studentChunk = studentsForFile.slice(start, end);
            
            let fileContent = "REC|1\n";
            studentChunk.forEach(student => {
                const formattedValue = (valuePerStudent * 100).toFixed(0);
                const unformattedCpf = student.cpf.replace(/[^\d]/g, '');
                fileContent += `${unformattedCpf}|2|${formattedValue}|${student.name}|\n`;
            });

            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            
            const fileName = numFiles > 1 ? `${baseFileName}_${i + 1}.txt` : `${baseFileName}.txt`;

            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        const orderDate = new Date();
        const newOrderId = `PED${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
        const totalValue = studentsForFile.length * valuePerStudent;

        const newOrder: Omit<Order, 'id'> = {
            orderId: newOrderId,
            date: orderDate.toISOString().split('T')[0],
            totalValue: totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            user: user.name,
            studentCount: studentsForFile.length,
            // Storing the content of the first file as a reference
            fileContent: "REC|1\n" + studentsForFile.slice(0, studentsPerFile).map(student => {
                const formattedValue = (valuePerStudent * 100).toFixed(0);
                const unformattedCpf = student.cpf.replace(/[^\d]/g, '');
                return `${unformattedCpf}|2|${formattedValue}|${student.name}|\n`;
            }).join(''),
        };

        onSave(newOrder);
        onOpenChange(false);
    }
  
    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    }

    return (
        <DialogContent className="sm:max-w-6xl">
            <DialogHeader>
                <DialogTitle>Gerar Novo Pedido de Passe</DialogTitle>
                <DialogDescription>Selecione os alunos para gerar o arquivo .txt.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div>
                    <Label htmlFor="order-type">Tipo de Pedido</Label>
                    <Select defaultValue="general">
                        <SelectTrigger id="order-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general">Passe Geral (Alunos Homologados)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="school-filter">Filtrar por Escola</Label>
                    <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                        <SelectTrigger id="school-filter">
                            <SelectValue placeholder="Selecione uma escola" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Escolas</SelectItem>
                            {schools.map(school => (
                                <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Card className="h-96">
                <CardContent className="p-0 h-full overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox 
                                        onCheckedChange={(checked) => toggleSelectAll(!!checked)} 
                                        checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                        disabled={loading}
                                    />
                                </TableHead>
                                <TableHead>Nome do Aluno</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Escola</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {loading ? (
                             <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                           ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                   <TableRow key={student.id}>
                                       <TableCell>
                                           <Checkbox 
                                            checked={selectedStudents.includes(student.id)} 
                                            onCheckedChange={(checked) => {
                                                setSelectedStudents(prev => checked ? [...prev, student.id] : prev.filter(id => id !== student.id))
                                            }}
                                           />
                                       </TableCell>
                                       <TableCell>{student.name}</TableCell>
                                       <TableCell>{student.cpf}</TableCell>
                                       <TableCell>{student.schoolName}</TableCell>
                                   </TableRow>
                               ))
                           ) : (
                               <TableRow><TableCell colSpan={4} className="text-center">Nenhum aluno homologado encontrado.</TableCell></TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <DialogFooter>
                <div className="text-sm text-muted-foreground">
                    {selectedStudents.length} de {filteredStudents.length} alunos selecionados.
                </div>
                <Button onClick={handleGenerate} disabled={selectedStudents.length === 0 || loading}>
                    <Download className="mr-2 h-4 w-4"/> Gerar Pedido
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function OrdersPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role < 3) {
      router.push('/dashboard');
      return;
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
        const fetchedOrders: Order[] = [];
        snapshot.forEach(doc => {
            const data = decryptObjectValues(doc.data()) as any;
            if(data) {
                fetchedOrders.push({ id: doc.id, ...data });
            }
        });
        fetchedOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOrders(fetchedOrders);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [user, router]);
  
  const handleSaveOrder = async (newOrderData: Omit<Order, 'id'>) => {
    try {
        const dataToSave = { ...newOrderData, savedAt: Timestamp.now() };
        const encryptedOrder = encryptObjectValues(dataToSave);
        await addDoc(collection(db, 'orders'), encryptedOrder);
        toast({ title: 'Sucesso!', description: 'Pedido salvo no banco de dados.' });
    } catch (error) {
        console.error('Failed to save order:', error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o pedido no banco de dados.'});
    }
  }
  
  const downloadFile = (fileContent: string, date: string) => {
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pedido_passes_${date}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Geração de Pedidos</CardTitle>
                <CardDescription>
                Crie e baixe os arquivos de pedido de passe para os alunos.
                </CardDescription>
            </div>
             <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Novo Pedido
                    </Button>
                </DialogTrigger>
                <GenerateOrderDialog onSave={handleSaveOrder} onOpenChange={setIsAddModalOpen} />
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
       <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº do Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Nº de Alunos</TableHead>
              <TableHead>Realizado Por</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Carregando pedidos...</TableCell></TableRow>
            ) : orders.length > 0 ? (
              orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderId}</TableCell>
                <TableCell>{new Date(order.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                <TableCell>{order.totalValue}</TableCell>
                <TableCell>{order.studentCount}</TableCell>
                <TableCell>{order.user}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => downloadFile(order.fileContent, order.date)}>
                    <Download className="mr-2 h-4 w-4"/>Baixar Novamente
                  </Button>
                </TableCell>
              </TableRow>
            ))
            ) : (
                 <TableRow><TableCell colSpan={6} className="text-center">Nenhum pedido encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
       </div>
      </CardContent>
    </Card>
  );
}

    

