
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
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { decryptObjectValues } from '@/lib/crypto';


type ChartData = {
    name: string;
    total: number;
};

type DashboardData = {
    totalStudents: number;
    totalSchools: number;
    pendingRequests: number;
    monthlyOrders: {
        count: number;
        totalValue: number;
    }
};

type RecentActivity = {
    id: string;
    type: 'user' | 'transport';
    description: string;
    date: Timestamp;
    link: string;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
      totalStudents: 0,
      totalSchools: 0,
      pendingRequests: 0,
      monthlyOrders: { count: 0, totalValue: 0 }
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    // Listener for orders (for chart and monthly orders card)
    const ordersUnsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
        const monthlyTotals: { [key: number]: number } = {};
        let currentMonthOrdersCount = 0;
        let currentMonthTotalValue = 0;
        const currentMonth = new Date().getMonth();

        snapshot.forEach((doc) => {
            const data = decryptObjectValues(doc.data());
            if (data && data.date && data.totalValue && data.status !== 'Excluído') {
                const orderDate = new Date(data.date);
                const month = orderDate.getMonth();
                const valueString = data.totalValue.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                const value = parseFloat(valueString);
                
                if (!isNaN(value)) {
                    // For chart
                    if (monthlyTotals[month]) {
                        monthlyTotals[month] += value;
                    } else {
                        monthlyTotals[month] = value;
                    }
                    // For card
                    if (month === currentMonth) {
                        currentMonthOrdersCount++;
                        currentMonthTotalValue += value;
                    }
                }
            }
        });
        
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const formattedChartData = monthNames.map((name, index) => ({
            name: name,
            total: monthlyTotals[index] || 0
        }));
        setChartData(formattedChartData);
        setDashboardData(prev => ({ ...prev, monthlyOrders: { count: currentMonthOrdersCount, totalValue: currentMonthTotalValue }}));
    });
    
    // Listener for total students
    const studentsUnsubscribe = onSnapshot(collection(db, "students"), (snapshot) => {
        setDashboardData(prev => ({...prev, totalStudents: snapshot.size}));
    });
    
    // Listener for total schools
    const schoolsUnsubscribe = onSnapshot(collection(db, "schools"), (snapshot) => {
        setDashboardData(prev => ({...prev, totalSchools: snapshot.size}));
    });
    
    // Listener for pending transport requests
    const transportUnsubscribe = onSnapshot(query(collection(db, "transport-requests"), where("status", "==", "Pendente")), (snapshot) => {
        setDashboardData(prev => ({...prev, pendingRequests: snapshot.size}));
    });
    
    // Listener for recent activities
    const usersUnsubscribe = onSnapshot(query(collection(db, "users"), where("status", "==", "Pendente")), (snapshot) => {
        const userActivities: RecentActivity[] = [];
        snapshot.forEach(doc => {
            const data = decryptObjectValues(doc.data());
            if (data) {
                userActivities.push({
                    id: doc.id,
                    type: 'user',
                    description: `Novo funcionário '${data.name}' aguarda aprovação.`,
                    date: data.creationDate,
                    link: '/dashboard/employees'
                });
            }
        });
        setRecentActivities(prev => [...userActivities, ...prev.filter(a => a.type !== 'user')].sort((a,b) => b.date.toMillis() - a.date.toMillis()).slice(0,5));
    });
    
     const transportActivitiesUnsubscribe = onSnapshot(query(collection(db, "transport-requests"), where("status", "==", "Pendente")), (snapshot) => {
        const transportActivities: RecentActivity[] = [];
        snapshot.forEach(doc => {
            const data = decryptObjectValues(doc.data());
            if (data) {
                transportActivities.push({
                    id: doc.id,
                    type: 'transport',
                    description: `Aluno '${data.studentName}' solicitou transporte.`,
                    date: data.createdAt,
                    link: '/dashboard/transport'
                });
            }
        });
       setRecentActivities(prev => [...transportActivities, ...prev.filter(a => a.type !== 'transport')].sort((a,b) => b.date.toMillis() - a.date.toMillis()).slice(0,5));
    });


    return () => {
        ordersUnsubscribe();
        studentsUnsubscribe();
        schoolsUnsubscribe();
        transportUnsubscribe();
        usersUnsubscribe();
        transportActivitiesUnsubscribe();
    };
  }, []);

  if (!user) {
    return null;
  }
  
  const welcomeMessage = `Bem-vindo(a) de volta, ${user.name.split(' ')[0]}!`;
  
  const renderActivityIcon = (type: 'user' | 'transport') => {
      switch(type) {
          case 'user': return <UserCheck className="h-6 w-6"/>;
          case 'transport': return <Bus className="h-6 w-6"/>;
          default: return <Activity className="h-6 w-6"/>;
      }
  }

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
              <div className="text-2xl font-bold">{dashboardData.totalStudents.toLocaleString('pt-BR')}</div>
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
              <div className="text-2xl font-bold">{dashboardData.totalSchools}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
              <Bus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.pendingRequests}</div>
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
              <div className="text-2xl font-bold">{dashboardData.monthlyOrders.count}</div>
              <p className="text-xs text-muted-foreground">
                Totalizando {dashboardData.monthlyOrders.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  tickFormatter={(value) => `R$${(value as number / 1000).toFixed(0)}k`}
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
                  Últimas solicitações e cadastros pendentes de aprovação.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {recentActivities.length > 0 ? (
                    recentActivities.map(activity => (
                         <div key={activity.id} className="flex items-center space-x-4">
                            {renderActivityIcon(activity.type)}
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {activity.type === 'user' ? 'Aprovação de Cadastro' : 'Solicitação de Transporte'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {activity.description}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={activity.link}>Ver</Link>
                            </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center">Nenhuma atividade pendente.</p>
                )}
              </CardContent>
            </Card>
        </div>
    </div>
  );
}

