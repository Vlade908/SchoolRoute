/**
 * @fileOverview Server actions for various administrative tasks.
 */
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { Timestamp, setDoc, doc, collection, getDocs, query } from 'firebase/firestore';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { decryptObjectValues, encryptObjectValues } from '@/lib/crypto';


// ===== ADMIN USER ACTIONS =====

const CreateAdminUserInputSchema = z.object({
    name: z.string().min(1, "O nome é obrigatório."),
    email: z.string().email("O e-mail é inválido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

/**
 * Creates the first administrative user for the system.
 * @param {z.infer<typeof CreateAdminUserInputSchema>} adminData - The admin user's data.
 * @returns {Promise<{ success: boolean; message: string }>} An object indicating the success of the operation.
 */
export async function createAdminUser(adminData: z.infer<typeof CreateAdminUserInputSchema>): Promise<{ success: boolean; message: string; uid?: string }> {
    try {
        const { name, email, password } = CreateAdminUserInputSchema.parse(adminData);

        // 1. Check if an admin user already exists using the Admin SDK
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        
        let adminExists = false;
        for (const docSnap of querySnapshot.docs) {
            const userData = decryptObjectValues(docSnap.data());
            if (userData && userData.role === 3) {
                adminExists = true;
                break;
            }
        }

        if (adminExists) {
            return { success: false, message: "Uma conta de administrador já existe." };
        }

        // 2. Create user with Firebase Admin Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        // 3. Create user profile in Firestore
        const userProfile = {
            uid: userRecord.uid,
            name,
            email,
            hash: 'admin-seed',
            role: 3, // Admin role
            status: 'Ativo',
            creationDate: Timestamp.now()
        };

        const encryptedProfile = encryptObjectValues(userProfile);
        await setDoc(doc(db, "users", userRecord.uid), encryptedProfile);

        return { success: true, message: 'Conta de administrador criada com sucesso.', uid: userRecord.uid };

    } catch (error: any) {
        console.error("Error creating admin user:", error);
        let message = 'Ocorreu um erro desconhecido.';
        if (error.code === 'auth/email-already-exists') {
            message = "Este e-mail já está em uso.";
        } else if (error.code === 'auth/invalid-password') {
             message = 'A senha fornecida é inválida. Deve ter pelo menos 6 caracteres.';
        } else if (error.code === 'auth/insufficient-permission'){
            message = 'Permissões insuficientes para criar um usuário. Verifique as credenciais do Admin SDK.';
        } else if (error.message) {
            message = error.message;
        }
        return { success: false, message };
    }
}
