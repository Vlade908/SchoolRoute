
'use client';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const cityHalls = [
    { id: 'PM001', name: 'Prefeitura de São Paulo', cnpj: '46.392.130/0001-22', city: 'São Paulo', state: 'SP' },
    { id: 'PM002', name: 'Prefeitura do Rio de Janeiro', cnpj: '42.498.717/0001-20', city: 'Rio de Janeiro', state: 'RJ' },
    { id: 'PM003', name: 'Prefeitura de Salvador', cnpj: '13.927.801/0001-49', city: 'Salvador', state: 'BA' },
];

export default function CityHallsPage() {
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!user || user.role < 3) {
            router.push('/dashboard');
        }
    }, [user, router]);


    if (!user || user.role < 3) {
      return <p>Acesso negado.</p>;
    }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Prefeituras</CardTitle>
                <CardDescription>Gerencie as prefeituras conveniadas.</CardDescription>
            </div>
            <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                Nova Prefeitura
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cityHalls.map((cityHall) => (
              <TableRow key={cityHall.id}>
                <TableCell className="font-medium">{cityHall.name}</TableCell>
                <TableCell>{cityHall.cnpj}</TableCell>
                <TableCell>{cityHall.city}</TableCell>
                <TableCell>{cityHall.state}</TableCell>
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
                      <DropdownMenuItem>Ver Convênios</DropdownMenuItem>
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
