
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
            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="destructive" className="w-full sm:w-auto">Negar Solicitação</Button>
                <Button variant="default" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">Aprovar Solicitação</Button>
            </DialogFooter>
        </DialogContent>
    )
}

export default function TransportPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role < 3)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role < 3) {
    return <p>Carregando ou acesso negado...</p>;
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
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Solicitação</TableHead>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead className="hidden sm:table-cell">RA</TableHead>
                    <TableHead className="hidden md:table-cell">Escola</TableHead>
                    <TableHead className="hidden lg:table-cell">Distância</TableHead>
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
                        <TableCell className="hidden sm:table-cell">{request.ra}</TableCell>
                        <TableCell className="hidden md:table-cell">{request.school}</TableCell>
                        <TableCell className="hidden lg:table-cell">{request.distance}</TableCell>
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
             </div>
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Solicitação</TableHead>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead className="hidden sm:table-cell">RA</TableHead>
                    <TableHead className="hidden md:table-cell">Escola</TableHead>
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
                        <TableCell className="hidden sm:table-cell">{request.ra}</TableCell>
                        <TableCell className="hidden md:table-cell">{request.school}</TableCell>
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
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
