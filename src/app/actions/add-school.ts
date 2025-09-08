'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { School } from '@/models/school';
import { encryptObjectValues } from '@/lib/crypto';

const AddSchoolSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  hash: z.string().min(1, 'O hash é obrigatório.'),
  schoolType: z.enum(['MUNICIPAL', 'ESTADUAL', 'MUNICIPALIZADA']),
  grades: z.array(z.any()).optional(),
});

export async function addSchool(schoolData: Omit<School, 'id' | 'status'>): Promise<{ success: boolean; message: string }> {
  try {
    const validatedData = AddSchoolSchema.parse(schoolData);

    const dataToSave = {
        ...validatedData,
        status: 'Ativa' as const,
        createdAt: Timestamp.now()
    };

    const encryptedSchool = encryptObjectValues(dataToSave);
    await addDoc(collection(db, "schools"), encryptedSchool);

    return { success: true, message: 'Escola cadastrada com sucesso.' };
  } catch (error) {
    console.error("Error adding school via server action:", error);
    if (error instanceof z.ZodError) {
        return { success: false, message: `Erro de validação: ${error.errors.map(e => e.message).join(', ')}` };
    }
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return { success: false, message: errorMessage };
  }
}
