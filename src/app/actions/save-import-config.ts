/**
 * @fileOverview Server action to save spreadsheet import configurations.
 *
 * - saveImportConfig - Saves a spreadsheet mapping configuration to Firestore.
 * - ImportConfig - The type definition for the complete configuration payload.
 */
'use server';

import { z } from 'zod';
<<<<<<< HEAD
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import type { ImportConfig } from '@/models/import-config';
import { setDoc, doc } from 'firebase/firestore';
=======
import { dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
<<<<<<< HEAD
>>>>>>> parent of 65d614d (ai faça com que ao carregar algum arquivo na aplicação, verifique se já)
=======
>>>>>>> parent of 65d614d (ai faça com que ao carregar algum arquivo na aplicação, verifique se já)


// Define the Zod schema for the flow's input payload.
const ImportConfigSchema = z.object({
  fileName: z.string().describe('The name of the original spreadsheet file.'),
  primarySheet: z.string().nullable().describe('The name of the primary worksheet (tab).'),
  headerRow: z.number().describe('The row number containing the headers.'),
  mapping: z.record(z.string()).describe('The mapping object from sheet columns to system fields.'),
});

// Export the inferred type for frontend use.
export type ImportConfig = z.infer<typeof ImportConfigSchema>;

/**
 * Saves a spreadsheet import configuration to Firestore using the Admin SDK.
 * Uses the file name as the document ID for easy retrieval.
 *
 * @param {ImportConfig} config - The import configuration object.
 * @returns {Promise<{ success: boolean; message: string }>} An object indicating the success of the operation.
 */
export async function saveImportConfig(config: ImportConfig): Promise<{ success: boolean; message: string }> {
  try {
    // Validate input with Zod
    const validatedConfig = ImportConfigSchema.parse(config);
    
    const docRef = doc(db, 'import-configurations', validatedConfig.fileName);
    
    const dataToSave = {
      ...validatedConfig,
      updatedAt: Timestamp.now(),
    }
    
    await setDoc(docRef, dataToSave, { merge: true });

    console.log(`Configuration for ${validatedConfig.fileName} saved successfully.`);
    return { success: true, message: 'Configuração salva com sucesso.' };
  } catch (error) {
    console.error(`Error saving configuration for ${config.fileName}:`, error);
    
    if (error instanceof z.ZodError) {
        return { success: false, message: `Validation error: ${error.errors.map(e => e.message).join(', ')}` };
    }
    if (error instanceof Error) {
        return { success: false, message: error.message };
    }
    return { success: false, message: 'An unknown error occurred.' };
  }
}
