
'use client';
import { useState, useEffect } from 'react';
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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { decryptObjectValues } from '@/lib/crypto';


type ChartData = {
    name: string;
    total: number;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
        const monthlyTotals: { [key: number]: number } = {};

        snapshot.forEach((doc) => {
            const data = decryptObjectValues(doc.data());
            if (data && data.date && data.totalValue && data.status !== 'Excluído') {
                const month = new Date(data.date).getMonth(); // 0-11
                const valueString = data.totalValue.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                const value = parseFloat(valueString);
                
                if (!isNaN(value)) {
                    if (monthlyTotals[month]) {
                        monthlyTotals[month] += value;
                    } else {
                        monthlyTotals[month] = value;
                    }
                }
            }
        });
        
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const formattedData = monthNames.map((name, index) => ({
            name: name,
            total: monthlyTotals[index] || 0
        }));

        setChartData(formattedData);
    });

    return () => unsubscribe();
  }, []);

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
              <CardTitle>Visão Geral de Despesas com Passes</CardTitle>
              <CardDescription>Total gasto por mês em passes estudantis.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
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
                  tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                 <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
                    labelStyle={{color: 'hsl(var(--foreground))'}}
                    formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Total']}
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
