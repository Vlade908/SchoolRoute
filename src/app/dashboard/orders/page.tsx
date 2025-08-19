'use client';
import { useState } from 'react';
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
import { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

const generatedOrders = [
  { id: 'PED202405-01', date: '2024-05-28', totalValue: 'R$ 45.231,89', user: 'Carlos Pereira' },
  { id: 'PED202404-01', date: '2024-04-27', totalValue: 'R$ 68.910,00', user: 'Carlos Pereira' },
];

const studentsForOrder = Array.from({ length: 250 }, (_, i) => ({
    id: `STU${1001 + i}`,
    name: `Aluno ${1001 + i}`,
    cpf: `123456789${10 + i}`,
    school: i % 2 === 0 ? 'Escola Estadual A' : 'Escola Municipal B',
    homologated: true,
}));

function GenerateOrderDialog() {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const handleGenerate = () => {
        // Dummy data for calculation
        const ticketValue = 4.90;
        const remainingDays = 15;
        const valuePerStudent = ticketValue * remainingDays * 10;

        const filteredStudents = studentsForOrder.filter(s => selectedStudents.includes(s.id));
        
        let fileContent = "REC|1\n";
        filteredStudents.forEach(student => {
            const formattedValue = (valuePerStudent * 100).toFixed(0);
            fileContent += `${student.cpf}|2|${formattedValue}|${student.name}|\n`;
        });
        
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pedido_passes_${new Date().toISOString().split('T')[0]}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  
    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(studentsForOrder.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    }

    return (
        <DialogContent className="sm:max-w-6xl">
            <DialogHeader>
                <DialogTitle>Gerar Novo Pedido de Passe</DialogTitle>
                <DialogDescription>Selecione o tipo de pedido e os alunos para gerar o arquivo .txt.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                <div>
                    <Label htmlFor="order-type">Tipo de Pedido</Label>
                    <Select>
                        <SelectTrigger id="order-type">
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">Novas Solicitações</SelectItem>
                            <SelectItem value="general">Passe Geral</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="institution-type">Tipo de Instituição</Label>
                    <Select>
                        <SelectTrigger id="institution-type">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="state">Estaduais</SelectItem>
                            <SelectItem value="municipal">Municipais</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="max-students">Alunos por Documento (Máx. 150)</Label>
                    <Input id="max-students" type="number" defaultValue="150" max="150" />
                </div>
            </div>
            <Card className="h-96">
                <CardContent className="p-0 h-full overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox onCheckedChange={(checked) => toggleSelectAll(!!checked)} />
                                </TableHead>
                                <TableHead>Nome do Aluno</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Escola</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {studentsForOrder.map(student => (
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
                                   <TableCell>{student.school}</TableCell>
                               </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <DialogFooter>
                <div className="text-sm text-muted-foreground">
                    {selectedStudents.length} de {studentsForOrder.length} alunos selecionados.
                </div>
                <Button onClick={handleGenerate} disabled={selectedStudents.length === 0}>
                    <Download className="mr-2 h-4 w-4"/> Gerar Pedido
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function OrdersPage() {
  const { user } = useUser();
  const router = useRouter();

  if (!user || user.role < 3) {
      useEffect(() => {
        router.push('/dashboard');
      }, [router]);
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
             <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Novo Pedido
                    </Button>
                </DialogTrigger>
                <GenerateOrderDialog />
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº do Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Realizado Por</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generatedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.totalValue}</TableCell>
                <TableCell>{order.user}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4"/>Baixar Novamente</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
