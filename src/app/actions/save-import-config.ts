/**
 * @fileOverview Server action to save spreadsheet import configurations.
 *
 * - saveImportConfig - Saves a spreadsheet mapping configuration to Firestore.
 * - ImportConfig - The type definition for the complete configuration payload.
 */
'use server';

import { z } from 'zod';
import { dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { ImportConfig } from '@/models/import-config';
import { encryptObjectValues } from '@/lib/crypto';


// Define the Zod schema for the flow's input payload.
const ImportConfigSchema = z.object({
  fileName: z.string().describe('The name of the original spreadsheet file.'),
  primarySheet: z.string().describe('The name of the primary worksheet (tab).'),
  headerRow: z.number().describe('The row number containing the headers.'),
  mapping: z.record(z.string()).describe('The mapping object from sheet columns to system fields.'),
});


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
    
    const docRef = dbAdmin.collection('import-configurations').doc(validatedConfig.fileName);
    
    const dataToSave = {
      ...validatedConfig,
      updatedAt: Timestamp.now(),
    }
    
    const encryptedData = encryptObjectValues(dataToSave);

    await docRef.set(encryptedData, { merge: true });

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