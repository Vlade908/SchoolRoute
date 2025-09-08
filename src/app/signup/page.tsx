
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
import { collection, doc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';


export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Senha Fraca",
            description: "A senha deve ter pelo menos 6 caracteres.",
        });
        setLoading(false);
        return;
    }
    
    try {
      // Check if an admin already exists by fetching all users and checking their role after decryption
      const usersRef = collection(db, "users");
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      let adminExists = false;
      querySnapshot.forEach(doc => {
          const userData = decryptObjectValues(doc.data());
          if (userData && userData.role === 3) {
              adminExists = true;
          }
      });

      if (adminExists) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Uma conta de administrador já existe. Não é possível criar outra.",
        });
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create admin user directly
      const userProfile = {
        uid: user.uid,
        name: name,
        email: email,
        hash: 'admin-seed', // Use a placeholder hash
        role: 3, 
        status: 'Ativo',
        creationDate: Timestamp.now()
      };
      
      const encryptedProfile = encryptObjectValues(userProfile);
      
      await setDoc(doc(db, "users", user.uid), encryptedProfile);
      
      toast({
          title: "Conta de Administrador Criada!",
          description: "Sua conta foi criada com sucesso. Redirecionando...",
      });
      
      router.push('/dashboard');

    } catch (error: any) {
       console.error("Signup failed:", error);
       let description = "Não foi possível criar a conta. Verifique os dados.";
       if (error.code === 'auth/email-already-in-use') {
           description = "Este e-mail já está em uso.";
       } else if (error.code === 'auth/weak-password') {
           description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
       } else if (error.code === 'auth/invalid-email') {
           description = "O e-mail fornecido não é válido.";
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
          <CardTitle className="text-2xl">Criar Conta de Administrador</CardTitle>
          <CardDescription>
            Crie a conta principal do sistema. Outros usuários deverão se cadastrar pela página de funcionários.
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
              <Label htmlFor="password">Senha (mínimo 6 caracteres)</Label>
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
