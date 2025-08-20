
'use client';
import { MoreHorizontal } from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const requests = [
  { id: 'REQ001', studentName: 'João Pereira', ra: 'RA2024001', type: 'Passe Escolar', status: 'Pendente', school: 'Escola Estadual A', distance: '3.2 km' },
  { id: 'REQ002', studentName: 'Mariana Costa', ra: 'RA2024002', type: 'Passe Escolar', status: 'Aprovado', school: 'Escola Municipal B', distance: '5.1 km' },
  { id: 'REQ003', studentName: 'Lucas Martins', ra: 'RA2024003', type: 'Passe Escolar', status: 'Pendente', school: 'Escola Municipalizada C', distance: '1.8 km' },
  { id: 'REQ004', studentName: 'Sofia Almeida', ra: 'RA2024004', type: 'Passe Escolar', status: 'Aprovado', school: 'Escola Estadual A', distance: '7.5 km' },
];

function ApprovalRequestDialog({ request }: { request: typeof requests[0] }) {
    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Detalhes da Solicitação - #{request.id}</DialogTitle>
                <DialogDescription>
                    Analise os dados da solicitação para o aluno {request.studentName}.
                </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-3 gap-6 py-4">
                <Card className="col-span-3 md:col-span-1">
                    <CardHeader><CardTitle>Informações do Aluno</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><span className="font-semibold">Nome:</span> {request.studentName}</p>
                        <p><span className="font-semibold">RA:</span> {request.ra}</p>
                        <p><span className="font-semibold">Escola:</span> {request.school}</p>
                        <p><span className="font-semibold">Status Atual:</span> <Badge>{request.status}</Badge></p>
                    </CardContent>
                </Card>
                 <Card className="col-span-3 md:col-span-1">
                    <CardHeader><CardTitle>Detalhes da Solicitação</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><span className="font-semibold">Tipo:</span> {request.type}</p>
                        <p><span className="font-semibold">Distância Casa-Escola:</span> {request.distance}</p>
                        <p><span className="font-semibold">Data da Solicitação:</span> {new Date().toLocaleDateString('pt-BR')}</p>
                    </CardContent>
                </Card>
                 <Card className="col-span-3 md:col-span-1">
                    <CardHeader><CardTitle>Análise e Aprovação</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="docOk" />
                            <Label htmlFor="docOk">Documentação verificada</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="distOk" />
                            <Label htmlFor="distOk">Distância mínima atendida</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <input type="checkbox" id="matriculaOk" />
                            <Label htmlFor="matriculaOk">Matrícula ativa</Label>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <DialogFooter>
                <Button variant="destructive">Negar Solicitação</Button>
                <Button variant="default" className="bg-green-600 hover:bg-green-700">Aprovar Solicitação</Button>
            </DialogFooter>
        </DialogContent>
    )
}

export default function TransportPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role < 3) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role < 3) {
    return <p>Acesso negado.</p>;
  }

  return (
    <Tabs defaultValue="pending">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="pending">Solicitações Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Solicitações Aprovadas</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Solicitações Pendentes</CardTitle>
            <CardDescription>
              Analise e aprove as solicitações de transporte escolar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Solicitação</TableHead>
                  <TableHead>Nome do Aluno</TableHead>
                  <TableHead>RA</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.filter(r => r.status === 'Pendente').map((request) => (
                  <Dialog key={request.id}>
                    <TableRow>
                      <TableCell className="font-medium">{request.id}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.ra}</TableCell>
                      <TableCell>{request.school}</TableCell>
                      <TableCell>{request.distance}</TableCell>
                      <TableCell>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Analisar</Button>
                        </DialogTrigger>
                      </TableCell>
                    </TableRow>
                    <ApprovalRequestDialog request={request} />
                  </Dialog>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="approved">
       <Card>
          <CardHeader>
            <CardTitle>Solicitações Aprovadas</CardTitle>
            <CardDescription>
              Lista de todas as solicitações que já foram aprovadas.
            </CardDescription>
          </Header>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Solicitação</TableHead>
                  <TableHead>Nome do Aluno</TableHead>
                  <TableHead>RA</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.filter(r => r.status === 'Aprovado').map((request) => (
                   <Dialog key={request.id}>
                    <TableRow>
                      <TableCell className="font-medium">{request.id}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.ra}</TableCell>
                      <TableCell>{request.school}</TableCell>
                      <TableCell>
                       <DialogTrigger asChild>
                           <Button variant="outline" size="sm">Ver Detalhes</Button>
                       </DialogTrigger>
                      </TableCell>
                    </TableRow>
                    <ApprovalRequestDialog request={request} />
                   </Dialog>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
