/**
 * @fileOverview Flow para salvar configurações de importação de planilhas.
 *
 * - saveImportConfig - Salva uma configuração de mapeamento de planilha no Firestore.
 * - SheetConfig - A definição de tipo para a configuração de uma única planilha.
 * - ImportConfig - A definição de tipo para o payload completo de configuração.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

// Define o schema Zod para uma única configuração de planilha.
const SheetConfigSchema = z.object({
  sheetName: z.string().describe('O nome da planilha (aba).'),
  isPrimary: z.boolean().describe('Se esta é a planilha principal.'),
  headerRow: z.number().describe('O número da linha que contém os cabeçalhos.'),
  columnMapping: z.record(z.string()).describe('O objeto de mapeamento de colunas da planilha para campos do sistema.'),
});

// Define o schema Zod para o payload de entrada do fluxo.
const ImportConfigSchema = z.object({
  fileName: z.string().describe('O nome do arquivo da planilha original.'),
  configurations: z.array(SheetConfigSchema).describe('Uma lista de configurações para cada planilha no arquivo.'),
});

// Exporta os tipos inferidos para uso no frontend.
export type SheetConfig = z.infer<typeof SheetConfigSchema>;
export type ImportConfig = z.infer<typeof ImportConfigSchema>;

/**
 * Salva a configuração de importação de uma planilha no Firestore.
 * Utiliza o nome do arquivo como ID do documento para fácil recuperação.
 *
 * @param {ImportConfig} config - O objeto de configuração de importação.
 * @returns {Promise<{ success: boolean; message: string }>} Um objeto indicando o sucesso da operação.
 */
async function saveImportConfig(config: ImportConfig): Promise<{ success: boolean; message: string }> {
  try {
    const docRef = doc(db, 'import-configurations', config.fileName);
    
    await setDoc(docRef, {
      ...config,
      updatedAt: Timestamp.now(),
    }, { merge: true });

    console.log(`Configuração para ${config.fileName} salva com sucesso.`);
    return { success: true, message: 'Configuração salva com sucesso.' };
  } catch (error) {
    console.error(`Erro ao salvar configuração para ${config.fileName}:`, error);
    if (error instanceof Error) {
        return { success: false, message: error.message };
    }
    return { success: false, message: 'Ocorreu um erro desconhecido.' };
  }
}

// Define o fluxo Genkit que utiliza a função saveImportConfig.
export const saveImportConfigFlow = ai.defineFlow(
  {
    name: 'saveImportConfigFlow',
    inputSchema: ImportConfigSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    return await saveImportConfig(input);
  }
);
