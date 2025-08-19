'use client';
import { useState } from 'react';
import { MoreHorizontal, PlusCircle, Copy } from 'lucide-react';
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

const schools = [
  { id: 'SCH001', name: 'Escola Estadual A', address: 'Rua das Flores, 123, São Paulo, SP', hash: 'a1b2c3d4e5f6g7h8' },
  { id: 'SCH002', name: 'Escola Municipal B', address: 'Avenida Brasil, 456, Rio de Janeiro, RJ', hash: 'i9j0k1l2m3n4o5p6' },
  { id: 'SCH003', name: 'Escola Municipalizada C', address: 'Praça da Sé, 789, Salvador, BA', hash: 'q7r8s9t0u1v2w3x4' },
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

export default function SchoolsPage() {
  const { user } = useUser();
  const router = useRouter();

  if (!user || user.role < 3) {
      // Redirect or show access denied message
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
                <TableCell className="font-medium">{school.name}</TableCell>
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
  );
}
