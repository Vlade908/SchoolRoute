/**
 * @fileOverview Server action to get a spreadsheet import configuration.
 *
 * - getImportConfig - Retrieves a spreadsheet mapping configuration from Firestore.
 */
'use server';

import { db } from '@/lib/firebase';
import type { ImportConfig } from '@/models/import-config';
import { doc, getDoc } from 'firebase/firestore';


/**
 * Retrieves a spreadsheet import configuration from Firestore.
 *
 * @param {string} fileName - The name of the file to look for.
 * @returns {Promise<ImportConfig | null>} The configuration object if found, otherwise null.
 */
export async function getImportConfig(fileName: string): Promise<ImportConfig | null> {
  try {
    const docRef = doc(db, 'import-configurations', fileName);
    const docSnap = await docRef.get();

    if (docSnap.exists()) {
      console.log(`Configuration for ${fileName} found.`);
      return docSnap.data() as ImportConfig | null;
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
