/**
 * @fileOverview Server actions for various administrative tasks.
 */
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { Timestamp, setDoc, doc } from 'firebase/firestore';
import type { ImportConfig } from '@/models/import-config';


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
