
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { decryptObjectValues, encryptObjectValues } from '@/lib/crypto';
import { Input } from '@/components/ui/input';
import { Search, Send, ListFilter } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


type Student = {
    id: string;
    uid: string; // Ensure UID is part of the student type
    name: string;
    ra: string;
    cpf: string;
    status: string;
    schoolId: string;
};

type School = {
    id: string;
    name: string;
}

export default function PassRequestsPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('all');

    useEffect(() => {
        if (userLoading) return;
        if (!user || user.role < 2) {
            router.push('/dashboard');
            return;
        }

        const fetchSchoolsAndStudents = async () => {
            setLoading(true);
            try {
                // Fetch all schools for the filter
                const schoolsSnapshot = await getDocs(collection(db, 'schools'));
                const schoolsData: School[] = [];
                schoolsSnapshot.forEach(doc => {
                    const data = decryptObjectValues(doc.data()) as any;
                    if (data) {
                       schoolsData.push({ id: doc.id, name: data.name });
                    }
                });
                setSchools(schoolsData);


                // Fetch all students
                const studentsRef = collection(db, "students");
                const q = query(studentsRef);
                const querySnapshot = await getDocs(q);

                const studentData: Student[] = [];
                querySnapshot.forEach(doc => {
                    const decryptedData = decryptObjectValues(doc.data()) as any;
                    if (decryptedData) {
                        studentData.push({
                            id: doc.id,
                            uid: decryptedData.uid, 
                            name: decryptedData.name,
                            ra: decryptedData.ra,
                            cpf: decryptedData.cpf,
                            status: decryptedData.status,
                            schoolId: decryptedData.schoolId,
                        });
                    }
                });
                setAllStudents(studentData);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: "Erro", description: "Não foi possível carregar os dados." });
            } finally {
                setLoading(false);
            }
        };
        fetchSchoolsAndStudents();

    }, [user, userLoading, router, toast]);

    const filteredStudents = useMemo(() => {
        let students = allStudents;
        
        // Filter by school
        if (user?.role === 2) {
            students = students.filter(student => student.schoolId === user.schoolId);
        } else if (user?.role >= 3 && schoolFilter !== 'all') {
            students = students.filter(student => student.schoolId === schoolFilter);
        }

        // Filter by search term
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            students = students.filter(student =>
                student.name.toLowerCase().includes(lowerCaseSearch) ||
                student.ra.includes(lowerCaseSearch) ||
                student.cpf.includes(lowerCaseSearch)
            );
        }

        return students;
    }, [allStudents, searchTerm, schoolFilter, user]);
    
    const selectedSchoolName = useMemo(() => {
        if (user?.role === 2) return user.schoolName;
        if (schoolFilter === 'all' || !schools.length) return "todas as escolas";
        return schools.find(s => s.id === schoolFilter)?.name || "escola selecionada";
    }, [user, schoolFilter, schools]);


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
            const selectedStudentData = allStudents.filter(s => selectedStudents.includes(s.id));
            
            for (const student of selectedStudentData) {
                 const school = schools.find(s => s.id === student.schoolId);
                 if (!school || !school.name) {
                     console.warn(`Escola com ID ${student.schoolId} não encontrada ou sem nome para o aluno ${student.name}. Pulando.`);
                     continue; 
                 }

                 const requestData = {
                    studentName: student.name,
                    studentId: student.id,
                    ra: student.ra,
                    schoolId: student.schoolId,
                    school: school.name,
                    status: 'Pendente',
                    requesterId: user.uid,
                    requesterName: user.name,
                    createdAt: Timestamp.now(),
                    type: 'Passe Escolar',
                    distance: 'N/A',
                 };

                 const encryptedRequest = encryptObjectValues(requestData);
                 
                 await addDoc(collection(db, "transport-requests"), {
                    ...encryptedRequest,
                    studentUid: student.id 
                 });
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
    
    if (user.role === 2 && !user.schoolId) {
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
                        <CardDescription>Selecione os alunos de {selectedSchoolName} para solicitar o passe.</CardDescription>
                    </div>
                    <Button onClick={handleSubmitRequest} disabled={selectedStudents.length === 0 || loading}>
                        <Send className="mr-2 h-4 w-4" />
                        Criar Solicitação ({selectedStudents.length})
                    </Button>
                </div>
                 <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, RA ou CPF..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {user.role >= 3 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto gap-1">
                                    <ListFilter className="h-3.5 w-3.5" />
                                    Filtrar por Escola
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Selecione uma escola</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={schoolFilter === 'all'} onCheckedChange={() => setSchoolFilter('all')}>
                                    Todas as Escolas
                                </DropdownMenuCheckboxItem>
                                {schools.map(school => (
                                    <DropdownMenuCheckboxItem key={school.id} checked={schoolFilter === school.id} onCheckedChange={() => setSchoolFilter(school.id)}>
                                        {school.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
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
                    Mostrando <strong>{filteredStudents.length}</strong> de <strong>{allStudents.length}</strong> alunos.
                </div>
            </CardFooter>
        </Card>
    );
}
