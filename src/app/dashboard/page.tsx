'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/contexts/user-context';
import { Activity, Users, School, UserCheck, Bus, FileText, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"


const data = [
  {
    name: "Jan",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Fev",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Mar",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Abr",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Mai",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Jun",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Jul",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Ago",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Set",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Out",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Nov",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Dez",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
]


export default function DashboardPage() {
  const { user } = useUser();

  if (!user) {
    return null;
  }
  
  const welcomeMessage = `Bem-vindo(a) de volta, ${user.name.split(' ')[0]}!`;

  return (
    <div className="flex-1 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">{welcomeMessage}</h2>
        <p className="text-muted-foreground">Aqui está um resumo das atividades do sistema.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Alunos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">10,234</div>
              <p className="text-xs text-muted-foreground">
                +180.1% do mês passado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Escolas Cadastradas
              </CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">
                +19% do mês passado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
              <Bus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">
                +32 novas solicitações hoje
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pedidos Gerados (Mês)
                </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Totalizando R$ 45.231,89
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Visão Geral de Matrículas</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="col-span-4 md:col-span-3">
              <CardHeader>
                <CardTitle>Atividades Recentes</CardTitle>
                <CardDescription>
                  Você tem 5 novas solicitações e 2 cadastros para aprovar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center space-x-4">
                  <UserCheck className="h-6 w-6"/>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Aprovação de Cadastro
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Novo funcionário 'Maria Silva' aguarda aprovação.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/employees">Ver</Link>
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <Bus className="h-6 w-6"/>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Solicitação de Transporte
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Aluno 'João Pereira' solicitou transporte.
                    </p>
                  </div>
                   <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/transport">Ver</Link>
                  </Button>
                </div>
                 <div className="flex items-center space-x-4">
                  <UserCheck className="h-6 w-6"/>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Aprovação de Cadastro
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Novo funcionário 'Carlos Souza' aguarda aprovação.
                    </p>
                  </div>
                   <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/employees">Ver</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}
