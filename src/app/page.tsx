'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, KeyRound, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // This is a mock login. In a real app, you would validate credentials against a server.
    // For this demo, we'll log in as 'Secretaria' if the email contains 'secretaria',
    // otherwise, we log in as a standard school employee.
    
    const isSecretaria = email.toLowerCase().includes('secretaria');

    const user = {
      name: isSecretaria ? 'Usuário Secretaria' : 'Funcionário Escola',
      email: email,
      role: isSecretaria ? 3 : 2, // 3 for Secretaria, 2 for school employee
      schoolId: isSecretaria ? null : 'school-123',
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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Insira seu e-mail e senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{' '}
            <Link href="/signup" className="underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
       <footer className="mt-8 text-sm text-muted-foreground">
        <p>Este é um ambiente de demonstração. Use qualquer e-mail/senha para logar.</p>
      </footer>
    </div>
  );
}
