'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hash, setHash] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // This is a mock signup. In a real app, you would send this to your server
    // to create a new user account, which would likely start in a 'Pendente' state.
    console.log({ name, hash, email, password });
    
    // For demo purposes, we'll create a new user and log them in directly.
    // This new user will have a 'pending' status and need approval from an admin.
    const newUser = {
      name: name,
      email: email,
      role: 1, // Lowest level, needs approval
      schoolId: null, // This would be determined by the hash on the backend
    };
    
    // In a real app, you wouldn't log the user in directly. 
    // You'd probably show a message saying their account is pending approval.
    // But for the demo, we'll log them in to show the flow.
    localStorage.setItem('schoolRouteUser', JSON.stringify(newUser));
    router.push('/dashboard');
    // You might want to use a toast notification here to inform the user.
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="mb-8 flex items-center gap-3 text-primary">
        <Bus className="h-10 w-10" />
        <h1 className="font-headline text-4xl font-bold">SchoolRoute</h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para criar sua conta de funcionário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input 
                id="name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hash">Chave da Escola (Hash)</Label>
              <Input 
                id="hash" 
                required 
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                />
            </div>
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
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Conta
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/" className="underline">
              Fazer login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
