
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
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { encryptObjectValues } from '@/lib/crypto';
import { validateHash } from '@/app/actions/actions';


export default function SignupEmployeePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hash, setHash] = useState('');
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
    
    // Use the server action to validate the hash
    const isHashValid = await validateHash(hash);
    if (!isHashValid) {
         toast({
            variant: "destructive",
            title: "Chave Hash Inválida",
            description: "A chave fornecida não corresponde a nenhuma escola ou prefeitura.",
        });
        setLoading(false);
        return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userProfile = {
        uid: user.uid,
        name: name,
        email: email,
        hash: hash,
        role: hash.startsWith('pm') ? 0 : 1, // Default role, 0 for pending secretary, 1 for pending school
        status: 'Pendente',
        creationDate: Timestamp.now()
      };
      
      const encryptedProfile = encryptObjectValues(userProfile);
      
      // Use the client SDK to set the document for the newly created user
      await setDoc(doc(db, "users", user.uid), encryptedProfile);
      
      toast({
          title: "Cadastro Enviado!",
          description: "Sua solicitação foi enviada. Aguarde a aprovação do administrador.",
      });
      
      await auth.signOut();
      router.push('/');

    } catch (error: any) {
       console.error("Signup failed:", error);
       let description = "Não foi possível criar a conta. Verifique os dados.";
       if (error.code === 'auth/email-already-in-use') {
           description = "Este e-mail já está em uso.";
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
          <CardTitle className="text-2xl">Cadastro de Funcionário</CardTitle>
          <CardDescription>
            Use a Chave Hash fornecida pela sua instituição para se cadastrar.
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
             <div className="space-y-2">
              <Label htmlFor="hash">Chave Hash da Instituição</Label>
              <Input 
                id="hash" 
                required 
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                disabled={loading}
                placeholder="Chave fornecida pela escola/prefeitura"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : <><UserPlus className="mr-2 h-4 w-4" /> Solicitar Cadastro</>}
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
