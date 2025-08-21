
'use client';
import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


const requests = [
  { id: 'REQ001', studentName: 'João Pereira', ra: 'RA2024001', type: 'Passe Escolar', status: 'Pendente', school: 'Escola Estadual A', distance: '3.2 km' },
  { id: 'REQ002', studentName: 'Mariana Costa', ra: 'RA2024002', type: 'Passe Escolar', status: 'Aprovado', school: 'Escola Municipal B', distance: '5.1 km' },
  { id: 'REQ003', studentName: 'Lucas Martins', ra: 'RA2024003', type: 'Passe Escolar', status: 'Pendente', school: 'Escola Municipalizada C', distance: '1.8 km' },
  { id: 'REQ004', studentName: 'Sofia Almeida', ra: 'RA2024004', type: 'Passe Escolar', status: 'Aprovado', school: 'Escola Estadual A', distance: '7.5 km' },
];

function ApprovalRequestDialog({ request }: { request: typeof requests[0] }) {
    const [approvalStatus, setApprovalStatus] = useState<'aguardando' | 'aprovado' | 'reprovado'>('aguardando');
    const [executor, setExecutor] = useState('');
    const [hasAgreement, setHasAgreement] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Detalhes da Solicitação - #{request.id}</DialogTitle>
                <DialogDescription>
                    Analise os dados da solicitação para o aluno {request.studentName}.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
                <Card>
                    <CardHeader><CardTitle>Informações do Aluno</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><span className="font-semibold">Nome:</span> {request.studentName}</p>
                        <p><span className="font-semibold">RA:</span> {request.ra}</p>
                        <p><span className="font-semibold">Escola:</span> {request.school}</p>
                        <div><span className="font-semibold">Status Atual:</span> <Badge>{request.status}</Badge></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Detalhes da Solicitação</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><span className="font-semibold">Tipo:</span> {request.type}</p>
                        <p><span className="font-semibold">Distância Casa-Escola:</span> {request.distance}</p>
                        <p><span className="font-semibold">Data da Solicitação:</span> {new Date().toLocaleDateString('pt-BR')}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Análise e Aprovação</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <Label htmlFor="approval-status">Status de Aprovação</Label>
                            <Select value={approvalStatus} onValueChange={(value) => setApprovalStatus(value as any)}>
                                <SelectTrigger id="approval-status">
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="aguardando">Aguardando Análise</SelectItem>
                                    <SelectItem value="aprovado">Aprovado</SelectItem>
                                    <SelectItem value="reprovado">Reprovado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {approvalStatus === 'aprovado' && (
                            <>
                                <div>
                                    <Label htmlFor="executor">Executor</Label>
                                    <Select value={executor} onValueChange={setExecutor}>
                                        <SelectTrigger id="executor">
                                            <SelectValue placeholder="Selecione o executor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="emtu">EMTU</SelectItem>
                                            <SelectItem value="municipio">Município</SelectItem>
                                            <SelectItem value="de">D.E</SelectItem>
                                            <SelectItem value="fde">FDE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="has-agreement">Tem Convênio</Label>
                                    <Select value={hasAgreement} onValueChange={setHasAgreement}>
                                        <SelectTrigger id="has-agreement">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sim">Sim</SelectItem>
                                            <SelectItem value="nao">Não</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {approvalStatus === 'reprovado' && (
                            <div>
                                <Label htmlFor="rejection-reason">Motivo da Recusa</Label>
                                <Textarea 
                                    id="rejection-reason" 
                                    placeholder="Descreva o motivo pelo qual a solicitação foi negada..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
                <Button variant="default" className="w-full sm:w-auto">Salvar Alterações</Button>
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
