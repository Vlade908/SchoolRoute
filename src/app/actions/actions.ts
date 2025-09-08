/**
 * @fileOverview Server actions for various administrative tasks.
 */
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { Timestamp, setDoc, doc, collection, getDocs } from 'firebase/firestore';
import type { ImportConfig } from '@/models/import-config';
import { auth, dbAdmin } from '@/lib/firebase-admin'; // Use Admin SDK
import { encryptObjectValues, decryptObjectValues } from '@/lib/crypto';


// ===== IMPORT CONFIG ACTIONS =====

const ImportConfigSchema = z.object({
  fileName: z.string().describe('The name of the original spreadsheet file.'),
  primarySheet: z.string().nullable().describe('The name of the primary worksheet (tab).'),
  headerRow: z.number().describe('The row number containing the headers.'),
  mapping: z.record(z.string()).describe('The mapping object from sheet columns to system fields.'),
});

/**
 * Saves a spreadsheet import configuration to Firestore.
 * @param {ImportConfig} config - The import configuration object.
 * @returns {Promise<{ success: boolean; message: string }>} An object indicating the success of the operation.
 */
export async function saveImportConfig(config: ImportConfig): Promise<{ success: boolean; message: string }> {
  try {
    const validatedConfig = ImportConfigSchema.parse(config);
    const docRef = doc(db, 'import-configurations', validatedConfig.fileName);
    const dataToSave = {
      ...validatedConfig,
      updatedAt: Timestamp.now(),
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return { success: true, message: 'Configuração salva com sucesso.' };
  } catch (error) {
    console.error(`Error saving configuration for ${config.fileName}:`, error);
    const message = error instanceof z.ZodError
      ? `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      : error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
}


// ===== ADMIN USER CREATION ACTION =====

const CreateAdminUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});


/**
 * Creates the first administrative user for the application.
 * This action checks if an admin already exists before creating a new one.
 * It uses the Firebase Admin SDK to perform privileged operations.
 * @param {z.infer<typeof CreateAdminUserSchema>} userData - The new admin's data.
 * @returns {Promise<{ success: boolean; message: string, uid?: string }>} An object indicating the result.
 */
export async function createAdminUser(userData: z.infer<typeof CreateAdminUserSchema>): Promise<{ success: boolean; message: string, uid?: string }> {
  try {
    const { name, email, password } = CreateAdminUserSchema.parse(userData);

    // 1. Check if an admin user already exists using the Admin SDK
    const usersRef = dbAdmin.collection("users");
    const querySnapshot = await usersRef.get();
    
    let adminExists = false;
    for (const doc of querySnapshot.docs) {
      const decryptedData = decryptObjectValues(doc.data());
      if (decryptedData && decryptedData.role === 3) {
        adminExists = true;
        break;
      }
    }

    if (adminExists) {
      return { success: false, message: "Uma conta de administrador já existe." };
    }

    // 2. Create user in Firebase Auth using Admin SDK
    const userRecord = await auth.createUser({ email, password, displayName: name });
    const uid = userRecord.uid;

    // 3. Create user profile in Firestore
    const userProfile = {
      uid,
      name,
      email,
      hash: 'admin-seed',
      role: 3,
      status: 'Ativo',
      creationDate: Timestamp.now()
    };

    const encryptedProfile = encryptObjectValues(userProfile);
    await usersRef.doc(uid).set(encryptedProfile);

    return { success: true, message: "Conta de administrador criada com sucesso!", uid };

  } catch (error: any) {
    console.error("Admin creation failed:", error);
    let message = 'Ocorreu um erro desconhecido.';
    if (error.code === 'auth/email-already-exists') {
      message = "Este e-mail já está em uso.";
    } else if (error instanceof z.ZodError) {
      message = `Erro de validação: ${error.errors.map(e => e.message).join(', ')}`;
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, message };
  }
}
