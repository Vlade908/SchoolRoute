
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { decryptObjectValues, encryptObjectValues } from '@/lib/crypto';
import { Input } from '@/components/ui/input';
import { Search, Send } from 'lucide-react';

type Student = {
    id: string;
    name: string;
    ra: string;
    cpf: string;
    status: string;
};

export default function PassRequestsPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!userLoading) {
            if (!user || user.role < 2) {
                router.push('/dashboard');
                return;
            }

            if (user.schoolId) {
                const fetchStudents = async () => {
                    try {
                        const studentsRef = collection(db, "students");
                        const q = query(studentsRef);
                        const querySnapshot = await getDocs(q);

                        const schoolStudents: Student[] = [];
                        querySnapshot.forEach(doc => {
                            const decryptedData = decryptObjectValues(doc.data()) as any;
                            if (decryptedData && decryptedData.schoolId === user.schoolId) {
                                schoolStudents.push({
                                    id: doc.id,
                                    name: decryptedData.name,
                                    ra: decryptedData.ra,
                                    cpf: decryptedData.cpf,
                                    status: decryptedData.status,
                                });
                            }
                        });
                        setStudents(schoolStudents);
                    } catch (error) {
                        console.error("Error fetching students:", error);
                        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível carregar os alunos." });
                    } finally {
                        setLoading(false);
                    }
                };
                fetchStudents();
            } else {
                setLoading(false);
            }
        }
    }, [user, userLoading, router, toast]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.ra.includes(searchTerm) ||
            student.cpf.includes(searchTerm)
        );
    }, [students, searchTerm]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        if (checked) {
            setSelectedStudents(prev => [...prev, studentId]);
        } else {
            setSelectedStudents(prev => prev.filter(id => id !== studentId));
        }
    };

    const handleSubmitRequest = async () => {
        if (!user || selectedStudents.length === 0) return;

        try {
            setLoading(true);
            const selectedStudentData = students.filter(s => selectedStudents.includes(s.id));
            
            for (const student of selectedStudentData) {
                 const requestData = {
                    studentId: student.id,
                    studentName: student.name,
                    ra: student.ra,
                    schoolId: user.schoolId,
                    school: user.schoolName,
                    status: 'Pendente',
                    requesterId: user.uid,
                    requesterName: user.name,
                    createdAt: serverTimestamp(),
                    type: 'Passe Escolar',
                    distance: 'N/A', // Or calculate if needed
                 };
                 const encryptedRequest = encryptObjectValues(requestData);
                 await addDoc(collection(db, "transport-requests"), encryptedRequest);
            }

            toast({
                title: "Solicitação Enviada!",
                description: `Solicitação para ${selectedStudents.length} aluno(s) foi enviada com sucesso.`
            });
            setSelectedStudents([]);
        } catch (error) {
             console.error("Error submitting request:", error);
             toast({ variant: 'destructive', title: "Erro", description: "Não foi possível enviar a solicitação." });
        } finally {
            setLoading(false);
        }
    };
    
    if (userLoading || loading) {
        return <p>Carregando...</p>;
    }

    if (!user || user.role < 2) {
        return <p>Acesso negado.</p>;
    }
    
    if (!user.schoolId) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Nenhuma Escola Associada</CardTitle>
                    <CardDescription>
                       Você não está associado a nenhuma escola. Entre em contato com um administrador.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <CardTitle>Solicitar Passe Escolar</CardTitle>
                        <CardDescription>Selecione os alunos da sua escola ({user.schoolName}) para solicitar o passe.</CardDescription>
                    </div>
                    <Button onClick={handleSubmitRequest} disabled={selectedStudents.length === 0 || loading}>
                        <Send className="mr-2 h-4 w-4" />
                        Criar Solicitação ({selectedStudents.length})
                    </Button>
                </div>
                 <div className="relative mt-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, RA ou CPF..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>RA</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Status Atual</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedStudents.includes(student.id)}
                                            onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.ra}</TableCell>
                                    <TableCell>{student.cpf}</TableCell>
                                    <TableCell>{student.status}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">Nenhum aluno encontrado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
             <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{filteredStudents.length}</strong> de <strong>{students.length}</strong> alunos.
                </div>
            </CardFooter>
        </Card>
    );
}
