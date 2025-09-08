
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';


type TransportRequest = {
    id: string;
    studentName: string;
    studentUid: string;
    ra: string;
    type: string;
    status: 'Pendente' | 'Aprovado' | 'Reprovado';
    school: string;
    distance: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    approvalStatus?: 'aguardando' | 'aprovado' | 'reprovado';
    executor?: 'emtu' | 'municipio' | 'de' | 'fde' | '';
    hasAgreement?: 'sim' | 'nao';
    rejectionReason?: string;
};


function ApprovalRequestDialog({ request, isOpen, onOpenChange, onSave }: { request: TransportRequest, isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (updatedRequest: Partial<TransportRequest>) => void }) {
    const [approvalStatus, setApprovalStatus] = useState<'aguardando' | 'aprovado' | 'reprovado'>(request.approvalStatus || 'aguardando');
    const [executor, setExecutor] = useState<'emtu' | 'municipio' | 'de' | 'fde' | ''>(request.executor || '');
    const [hasAgreement, setHasAgreement] = useState<'sim' | 'nao'>(request.hasAgreement || 'nao');
    const [rejectionReason, setRejectionReason] = useState(request.rejectionReason || '');
    
    useEffect(() => {
        if (isOpen) {
            setApprovalStatus(request.approvalStatus || 'aguardando');
            setExecutor(request.executor || '');
            setHasAgreement(request.hasAgreement || 'nao');
            setRejectionReason(request.rejectionReason || '');
        }
    }, [isOpen, request]);

    const handleExecutorChange = (value: 'emtu' | 'municipio' | 'de' | 'fde' | '') => {
        setExecutor(value);
        if (value === 'emtu') {
            setHasAgreement('sim');
        } else {
            setHasAgreement('nao');
        }
    }
    
    const handleSaveChanges = () => {
        const finalStatus = approvalStatus === 'aprovado' ? 'Aprovado' : approvalStatus === 'reprovado' ? 'Reprovado' : 'Pendente';
        const updatedRequestData: Partial<TransportRequest> = {
            status: finalStatus,
            approvalStatus: approvalStatus,
            executor: approvalStatus === 'aprovado' ? executor : '',
            hasAgreement: approvalStatus === 'aprovado' ? hasAgreement : 'nao',
            rejectionReason: approvalStatus === 'reprovado' ? rejectionReason : '',
        };
       onSave(updatedRequestData);
    }
    
    const formatDate = (timestamp: Timestamp | undefined) => {
        if (!timestamp) return 'N/A';
        
        let date: Date;
        // Firestore Timestamps lose their methods when serialized, so we reconstruct if necessary.
        if (timestamp.seconds && typeof timestamp.toDate !== 'function') {
            date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
        } else if (timestamp.toDate) {
            date = timestamp.toDate();
        } else {
            return 'Data inválida';
        }

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Detalhes da Solicitação - #{request.id.substring(0,6)}</DialogTitle>
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
                        <div>
                           <span className="font-semibold">Status Atual:</span> <Badge variant={request.status === 'Aprovado' ? 'default' : request.status === 'Pendente' ? 'secondary' : 'destructive'}>{request.status}</Badge>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Detalhes da Solicitação</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><span className="font-semibold">Tipo:</span> {request.type}</p>
                        <p><span className="font-semibold">Distância Casa-Escola:</span> {request.distance}</p>
                        <p><span className="font-semibold">Data da Solicitação:</span> {formatDate(request.createdAt)}</p>
                        {<p><span className="font-semibold">Data da Análise:</span> {formatDate(request.updatedAt)}</p>}
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
                                    <Select value={executor} onValueChange={handleExecutorChange}>
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
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button variant="default" className="w-full sm:w-auto" onClick={handleSaveChanges}>Salvar Alterações</Button>
            </DialogFooter>
        </DialogContent>
    )
}

export default function TransportPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role < 3)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
      const unsubscribe = onSnapshot(collection(db, "transport-requests"), (snapshot) => {
        const requestsData: TransportRequest[] = [];
        snapshot.forEach((doc) => {
            const data = decryptObjectValues(doc.data()) as any;
            if (data) {
                // Re-hydrate Firestore Timestamps if they were serialized
                if (data.createdAt && typeof data.createdAt.seconds === 'number') {
                    data.createdAt = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
                }
                if (data.updatedAt && typeof data.updatedAt.seconds === 'number') {
                    data.updatedAt = new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds);
                }
                requestsData.push({ id: doc.id, ...data } as TransportRequest);
            }
        });
        setRequests(requestsData);
      });
      return () => unsubscribe();
  }, []);

  if (loading || !user || user.role < 3) {
    return <p>Carregando ou acesso negado...</p>;
  }

  const handleOpenDialog = (request: TransportRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  }
  
  const handleSaveRequest = async (updatedData: Partial<TransportRequest>) => {
    if (!selectedRequest) return;
    try {
        const requestDocRef = doc(db, 'transport-requests', selectedRequest.id);
        const requestDoc = await getDoc(requestDocRef);
        if (!requestDoc.exists()) throw new Error("Solicitação não encontrada.");
        
        const currentData = requestDoc.data();
        if(!currentData) throw new Error("Não foi possível ler os dados da solicitação.");
        
        const dataToUpdate = { 
            ...currentData, 
            ...updatedData,
            updatedAt: Timestamp.now()
        };

        const encryptedUpdate = {
            ...encryptObjectValues(dataToUpdate),
            studentUid: selectedRequest.studentUid, // Ensure non-encrypted field is preserved
        }
        
        await updateDoc(requestDocRef, encryptedUpdate);
        
        toast({
            title: "Alterações Salvas!",
            description: `A solicitação de ${selectedRequest.studentName} foi atualizada.`,
        });
    } catch (error) {
        console.error("Error updating request:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível salvar as alterações."});
    } finally {
        setIsDialogOpen(false);
        setSelectedRequest(null);
    }
  }

  return (
    <Tabs defaultValue="pending">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="pending">Solicitações Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Solicitações Aprovadas</TabsTrigger>
          <TabsTrigger value="rejected">Solicitações Reprovadas</TabsTrigger>
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
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id.substring(0, 6)}</TableCell>
                        <TableCell>{request.studentName}</TableCell>
                        <TableCell className="hidden sm:table-cell">{request.ra}</TableCell>
                        <TableCell className="hidden md:table-cell">{request.school}</TableCell>
                        <TableCell className="hidden lg:table-cell">{request.distance}</TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(request)}>Analisar</Button>
                        </TableCell>
                      </TableRow>
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
                    <TableHead className="hidden md:table-cell">Executor</TableHead>
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(r => r.status === 'Aprovado').map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id.substring(0,6)}</TableCell>
                        <TableCell>{request.studentName}</TableCell>
                        <TableCell className="hidden sm:table-cell">{request.ra}</TableCell>
                        <TableCell className="hidden md:table-cell">{request.executor?.toUpperCase()}</TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(request)}>Ver Detalhes</Button>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="rejected">
       <Card>
          <CardHeader>
            <CardTitle>Solicitações Reprovadas</CardTitle>
            <CardDescription>
              Lista de todas as solicitações que foram negadas.
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
                     <TableHead className="hidden md:table-cell">Motivo</TableHead>
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(r => r.status === 'Reprovado').map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id.substring(0,6)}</TableCell>
                        <TableCell>{request.studentName}</TableCell>
                        <TableCell className="hidden sm:table-cell">{request.ra}</TableCell>
                        <TableCell className="hidden md:table-cell truncate max-w-xs">{request.rejectionReason}</TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(request)}>Ver Detalhes</Button>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {selectedRequest && <ApprovalRequestDialog request={selectedRequest} isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleSaveRequest} />}
      </Dialog>
    </Tabs>
  );
}
