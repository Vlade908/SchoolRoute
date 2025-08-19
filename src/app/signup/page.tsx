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
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, DocumentReference, DocumentSnapshot, getDocs, query, collection, where, limit } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';


export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [hash, setHash] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Step 1: Check if hash exists in schools or city-halls (you might need to implement this logic if you have these collections)
      // For now, we'll assume the hash is valid
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const isSecretaria = email.toLowerCase().includes('secretaria') || hash.toLowerCase().startsWith('pm');

      // Step 2: Create user profile
      const userProfile = {
        uid: user.uid,
        name: name,
        email: email,
        hash: hash,
        role: isSecretaria ? 3 : 1, // 3 for Secretaria, 1 for school employee (pending)
        status: 'Pendente' // All new accounts are pending approval from an admin
      };
      
      await setDoc(doc(db, "users", user.uid), userProfile);
      
      toast({
          title: "Conta Criada!",
          description: "Sua conta foi criada e está pendente de aprovação. Redirecionando...",
      });
      
      // onAuthStateChanged in DashboardLayout will handle the session and redirect.
      router.push('/dashboard');

    } catch (error: any) {
       console.error("Signup failed:", error);
       let description = "Não foi possível criar a conta. Verifique os dados.";
       if (error.code === 'auth/email-already-in-use') {
           description = "Este e-mail já está em uso.";
       } else if (error.code === 'auth/weak-password') {
           description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
       }
       toast({
          variant: "destructive",
          title: "Erro no Cadastro",
          description: description,
       });
    } finally {
        setLoading(false);
    }
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
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hash">Chave da Escola ou Prefeitura (Hash)</Label>
              <Input 
                id="hash" 
                required 
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta..." : <><UserPlus className="mr-2 h-4 w-4" /> Criar Conta</>}
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
