'use client';

import { useRouter } from 'next/navigation';
import { Bus, School, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const roles = [
  {
    name: 'Secretaria',
    level: 3,
    description: 'Acesso total ao sistema, incluindo gestão de escolas, funcionários e aprovações.',
  },
  {
    name: 'Funcionário de Escola (Nível 2)',
    level: 2,
    description: 'Pode cadastrar e gerenciar alunos da sua escola.',
  },
  {
    name: 'Funcionário de Escola (Nível 1)',
    level: 1,
    description: 'Pode visualizar informações dos alunos da sua escola.',
  },
];

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (role: { name: string; level: number }) => {
    // In a real app, you'd get a token from a server.
    // Here, we'll just store the user role in localStorage.
    const user = {
      name: role.name,
      email: `${role.name.toLowerCase().replace(/\s/g, '.')}@example.com`,
      role: role.level,
      schoolId: role.level < 3 ? 'school-123' : null, // Mock schoolId for non-secretaria
    };
    localStorage.setItem('schoolRouteUser', JSON.stringify(user));
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-3 text-primary">
        <Bus className="h-10 w-10" />
        <h1 className="font-headline text-4xl font-bold">SchoolRoute</h1>
      </div>
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Bem-vindo(a)!</CardTitle>
          <CardDescription>Selecione um perfil para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.level} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {role.level === 3 ? <KeyRound /> : <School />}
                    {role.level === 3 ? 'Secretaria' : `Escola Nível ${role.level}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button className="w-full" onClick={() => handleLogin(role)}>
                    Acessar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-sm text-muted-foreground">
        <p>Este é um ambiente de demonstração. Nenhuma informação é salva permanentemente.</p>
      </footer>
    </div>
  );
}
