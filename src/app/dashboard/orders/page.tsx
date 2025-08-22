
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { MoreHorizontal, PlusCircle, Download, Trash2, Undo, ListFilter, ArrowLeft, ArrowRight } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { collection, onSnapshot, getDocs, query, where, addDoc, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { decryptObjectValues, encryptObjectValues } from '@/lib/crypto';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';


type Order = {
    id: string;
    orderId: string;
    date: string;
    totalValue: string;
    user: string;
    studentCount: number;
    fileContent: string;
    savedAt: Timestamp;
    status: 'Ativo' | 'Excluído';
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


function GenerateOrderDialog({ onSave, isOpen, onOpenChange }: { onSave: (order: Omit<Order, 'id' | 'savedAt' | 'status'>) => void; isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [schoolFilter, setSchoolFilter] = useState('all');
    
    // New state for multi-step modal
    const [step, setStep] = useState<'selection' | 'confirmation'>('selection');
    const [generatedOrder, setGeneratedOrder] = useState<Omit<Order, 'id' | 'orderId' | 'savedAt' | 'status'> | null>(null);
    const [manualOrderId, setManualOrderId] = useState('');
    
    const resetState = useCallback(() => {
        setStep('selection');
        setSelectedStudents([]);
        setGeneratedOrder(null);
        setManualOrderId('');
        setSchoolFilter('all');
    }, []);


    useEffect(() => {
        if (!isOpen) {
           resetState();
           return;
        }

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
    }, [isOpen, toast, resetState]);
    
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
        const valuePerStudent = ticketValue * remainingDays;
        const studentsPerFile = 150;
        const numFiles = Math.ceil(studentsForFile.length / studentsPerFile);
        
        const selectedSchool = schools.find(s => s.id === schoolFilter);
        const baseFileName = selectedSchool ? selectedSchool.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() : `pedido_passes_${new Date().toISOString().split('T')[0]}`;

        for (let i = 0; i < numFiles; i++) {
            const start = i * studentsPerFile;
            const end = start + studentsPerFile;
            const studentChunk = studentsForFile.slice(start, end);
            
            const studentLines = studentChunk.map(student => {
                const formattedValue = (valuePerStudent * 100).toFixed(0);
                const unformattedCpf = student.cpf.replace(/[^\d]/g, '');
                return `${unformattedCpf}|2|${formattedValue}|${student.name}|`;
            });
            
            const fileContent = "REC|1\n" + studentLines.join('\n');

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
        const totalValue = studentsForFile.length * valuePerStudent;
        
        // Only include the first chunk in the saved fileContent to avoid large Firestore documents
        const firstChunkLines = studentsForFile.slice(0, studentsPerFile).map(student => {
            const formattedValue = (valuePerStudent * 100).toFixed(0);
            const unformattedCpf = student.cpf.replace(/[^\d]/g, '');
            return `${unformattedCpf}|2|${formattedValue}|${student.name}|`;
        });
        const fileContentToSave = "REC|1\n" + firstChunkLines.join('\n');


        const newOrderData: Omit<Order, 'id' | 'orderId' | 'savedAt' | 'status'> = {
            date: orderDate.toISOString().split('T')[0],
            totalValue: totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            user: user.name,
            studentCount: studentsForFile.length,
            fileContent: fileContentToSave,
        };

        setGeneratedOrder(newOrderData);
        setStep('confirmation');
    }
    
    const handleSaveOrder = () => {
        if (!generatedOrder || !manualOrderId) {
            toast({ variant: 'destructive', title: 'ID do Pedido Obrigatório', description: 'Por favor, insira o número do pedido.' });
            return;
        }
        
        const finalOrder: Omit<Order, 'id' | 'savedAt' | 'status'> = {
            ...generatedOrder,
            orderId: manualOrderId
        };

        onSave(finalOrder);
        onOpenChange(false);
    }
  
    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    }


    if (step === 'confirmation' && generatedOrder) {
      return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Confirmar e Salvar Pedido</DialogTitle>
                <DialogDescription>
                    O(s) arquivo(s) foram baixados. Insira o número do pedido para salvá-lo no sistema.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alunos incluídos:</span>
                    <span className="font-medium">{generatedOrder.studentCount}</span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor total do pedido:</span>
                    <span className="font-medium">{generatedOrder.totalValue}</span>
                </div>
                <div>
                  <Label htmlFor="manualOrderId" className="text-right">
                    Nº do Pedido
                  </Label>
                  <Input
                    id="manualOrderId"
                    value={manualOrderId}
                    onChange={(e) => setManualOrderId(e.target.value)}
                    placeholder="Insira o número do pedido"
                  />
                </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setStep('selection')} className="w-full sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleSaveOrder} className="w-full sm:w-auto">
                    Salvar Pedido
                </Button>
            </DialogFooter>
        </DialogContent>
      )
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
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Ativo');
  
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const currentMonthIndex = new Date().getFullYear().toString() === selectedYear ? new Date().getMonth() : 11;
  const availableMonths = months.slice(0, currentMonthIndex + 1);

  const availableYears = useMemo(() => {
    const years = new Set(allOrders.map(order => new Date(order.date).getFullYear().toString()));
    const currentYear = new Date().getFullYear().toString();
    if (!years.has(currentYear)) {
      years.add(currentYear);
    }
    return Array.from(years).sort((a,b) => parseInt(b) - parseInt(a));
  }, [allOrders]);
  
  const isAddOrderAllowed = useMemo(() => {
    if (selectedMonth === null) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (parseInt(selectedYear) !== currentYear) return false;

    return selectedMonth >= currentMonth -1 && selectedMonth <= currentMonth + 1;
  }, [selectedMonth, selectedYear]);
  

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
                if (data.savedAt && typeof data.savedAt.seconds === 'number') {
                    data.savedAt = new Timestamp(data.savedAt.seconds, data.savedAt.nanoseconds);
                }
                fetchedOrders.push({ id: doc.id, status: data.status || 'Ativo', ...data });
            }
        });
        
        fetchedOrders.sort((a,b) => (b.savedAt?.toMillis() || 0) - (a.savedAt?.toMillis() || 0));
        setAllOrders(fetchedOrders);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [user, router]);
  
  const filteredOrders = useMemo(() => {
    let orders = allOrders.filter(order => new Date(order.date).getFullYear().toString() === selectedYear);

    if (selectedMonth !== null) {
      orders = orders.filter(order => new Date(order.date).getMonth() === selectedMonth);
    } else {
        return []; // Do not show any order if no month is selected
    }
    
    if (statusFilter !== 'all') {
        orders = orders.filter(order => order.status === statusFilter);
    }
    
    return orders;
  }, [allOrders, selectedYear, selectedMonth, statusFilter]);

  const ordersByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    allOrders.forEach(order => {
        if (new Date(order.date).getFullYear().toString() === selectedYear) {
            const month = new Date(order.date).getMonth();
            counts[month]++;
        }
    });
    return counts;
  }, [allOrders, selectedYear]);

  
  const handleSaveOrder = async (newOrderData: Omit<Order, 'id' | 'savedAt' | 'status'>) => {
    try {
        const dataToSave = { ...newOrderData, savedAt: Timestamp.now(), status: 'Ativo' as const };
        const encryptedOrder = encryptObjectValues(dataToSave);
        await addDoc(collection(db, 'orders'), encryptedOrder);
        toast({ title: 'Sucesso!', description: 'Pedido salvo no banco de dados.' });
    } catch (error) {
        console.error('Failed to save order:', error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o pedido no banco de dados.'});
    }
  }

  const handleUpdateOrderStatus = async (order: Order, newStatus: 'Ativo' | 'Excluído') => {
    try {
      const orderDocRef = doc(db, 'orders', order.id);
      const currentDoc = await getDoc(orderDocRef);
      if(!currentDoc.exists()) throw new Error("Pedido não encontrado.");

      const decryptedData = decryptObjectValues(currentDoc.data());
      if(!decryptedData) throw new Error("Falha ao descriptografar os dados do pedido.");

      const dataToUpdate = { ...decryptedData, status: newStatus };
      const encryptedUpdate = encryptObjectValues(dataToUpdate);

      await updateDoc(orderDocRef, encryptedUpdate);
      toast({
        title: 'Status do Pedido Atualizado!',
        description: `O pedido #${order.orderId} foi marcado como ${newStatus.toLowerCase()}.`
      });
    } catch (error) {
       console.error("Error updating order status:", error);
       toast({ variant: 'destructive', title: "Erro", description: "Não foi possível atualizar o status do pedido."});
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
  
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth(null); // Reset month selection when year changes
  }

  if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Geração de Pedidos</CardTitle>
          <CardDescription>
            Crie e baixe os arquivos de pedido de passe para os alunos.
          </CardDescription>
          <div className="flex items-center gap-4 pt-4">
              <Label>Ano:</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[120px]">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
            <Carousel setApi={setCarouselApi} className="w-full">
                <CarouselContent>
                    {availableMonths.map((month, index) => (
                        <CarouselItem key={month} className="basis-1/2 md:basis-1/4 lg:basis-1/6">
                             <div className="p-1">
                                <Card 
                                    className={`cursor-pointer transition-all ${selectedMonth === index ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}
                                    onClick={() => setSelectedMonth(index)}
                                >
                                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">{month}</CardTitle>
                                        <Badge variant={selectedMonth === index ? 'default' : 'secondary'}>{ordersByMonth[index]}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                       <p className="text-xs text-muted-foreground">{ordersByMonth[index]} pedido(s) este mês.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2" />
            </Carousel>
        </CardContent>
      </Card>

      {selectedMonth !== null && (
        <Card className="mt-6">
            <CardHeader>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className='flex-1'>
                        <CardTitle>Pedidos de {months[selectedMonth]} de {selectedYear}</CardTitle>
                        <CardDescription>
                          Lista de pedidos realizados no mês selecionado.
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className='w-full sm:w-[180px]'>
                                <SelectValue placeholder="Filtrar por status"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ativo">Ativos</SelectItem>
                                <SelectItem value="Excluído">Excluídos</SelectItem>
                                <SelectItem value="all">Todos</SelectItem>
                            </SelectContent>
                        </Select>
                        {isAddOrderAllowed && (
                            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        Novo Pedido
                                    </Button>
                                </DialogTrigger>
                                <GenerateOrderDialog 
                                    onSave={handleSaveOrder} 
                                    isOpen={isAddModalOpen} 
                                    onOpenChange={setIsAddModalOpen} 
                                />
                            </Dialog>
                        )}
                    </div>
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
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center">Carregando pedidos...</TableCell></TableRow>
                    ) : filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderId}</TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                        <TableCell>{order.totalValue}</TableCell>
                        <TableCell>{order.studentCount}</TableCell>
                        <TableCell>{order.user}</TableCell>
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
                                <DropdownMenuItem onSelect={() => downloadFile(order.fileContent, order.date)}>
                                    <Download className="mr-2 h-4 w-4"/> Baixar Novamente
                                </DropdownMenuItem>
                                {order.status === 'Ativo' ? (
                                    <DropdownMenuItem className="text-red-500" onSelect={() => handleUpdateOrderStatus(order, 'Excluído')}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onSelect={() => handleUpdateOrderStatus(order, 'Ativo')}>
                                        <Undo className="mr-2 h-4 w-4"/> Restaurar
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                         <TableCell>
                          {order.status === 'Excluído' && (
                            <Badge variant='destructive' className='bg-red-600'>
                                Excluído
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                    ) : (
                        <TableRow><TableCell colSpan={7} className="text-center">Nenhum pedido encontrado para o filtro selecionado.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
               </div>
              </CardContent>
        </Card>
      )}
    </>
  );
}

