/**
 * @fileOverview Server action to get a spreadsheet import configuration.
 *
 * - getImportConfig - Retrieves a spreadsheet mapping configuration from Firestore.
 */
'use server';

import { dbAdmin } from '@/lib/firebase-admin';
import type { ImportConfig } from '@/models/import-config';
import { decryptObjectValues } from '@/lib/crypto';

/**
 * Retrieves a spreadsheet import configuration from Firestore.
 *
 * @param {string} fileName - The name of the file to look for.
 * @returns {Promise<ImportConfig | null>} The configuration object if found, otherwise null.
 */
export async function getImportConfig(fileName: string): Promise<ImportConfig | null> {
  try {
    const docRef = dbAdmin.collection('import-configurations').doc(fileName);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      console.log(`Configuration for ${fileName} found.`);
      const decryptedData = decryptObjectValues(docSnap.data() as any);
      return decryptedData as ImportConfig | null;
    } else {
      console.log(`No configuration found for ${fileName}.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching configuration for ${fileName}:`, error);
    // Don't re-throw to the client, just return null and handle it gracefully on the frontend.
    return null;
  }
}
