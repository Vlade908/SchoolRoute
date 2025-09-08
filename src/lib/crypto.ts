import 'dotenv/config';
import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_SECRET_KEY;
if (!secretKey) {
  console.error("A CHAVE DE CRIPTOGRAFIA NÃO FOI DEFINIDA. Defina ENCRYPTION_SECRET_KEY no seu arquivo .env");
}

// Função para criptografar um objeto
export const encryptData = <T extends object>(data: T): string => {
  if (!secretKey) {
    throw new Error("Nenhuma chave de criptografia foi definida. Defina ENCRYPTION_SECRET_KEY.");
  }
  const dataString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(dataString, secretKey).toString();
};

// Função para descriptografar uma string para um objeto
export const decryptData = <T extends object>(encryptedData: string): T | null => {
  if (!secretKey) {
    // No lado do cliente, a chave pode não estar disponível.
    // A lógica deve ser estruturada para evitar a descriptografia no cliente quando a chave é necessária.
    console.warn("Chave de descriptografia não disponível no contexto atual (provavelmente no cliente).");
    return null;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
        return null; // Retorna nulo se a descriptografia falhar
    }
    return JSON.parse(decryptedString) as T;
  } catch (error) {
    console.error("Erro ao descriptografar dados:", error);
    return null;
  }
};

// Função para criptografar um objeto inteiro dentro de um campo 'encryptedData'
export const encryptObjectValues = (obj: Record<string, any>): Record<string, any> => {
    return { 'encryptedData': encryptData(obj) };
};

// Função para descriptografar os campos de um objeto
export const decryptObjectValues = (encryptedObj: Record<string, any>): Record<string, any> | null => {
    if (!encryptedObj || !encryptedObj.encryptedData || typeof encryptedObj.encryptedData !== 'string') {
       return encryptedObj; // Retorna o objeto original se não tiver o campo encryptedData
    }

     if (!secretKey) {
        console.error("Nenhuma chave de descriptografia disponível. Certifique-se de que a ENCRYPTION_SECRET_KEY está definida.");
        return encryptedObj; // Retorna o objeto original se não houver chave
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedObj.encryptedData, secretKey);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) {
            return encryptedObj;
        }
        const decryptedPayload = JSON.parse(decryptedString);
        // Combina o payload descriptografado com quaisquer campos não criptografados (como IDs)
        const finalObject = { ...encryptedObj, ...decryptedPayload };
        delete finalObject.encryptedData; // Remove o campo de dados criptografados
        return finalObject;

    } catch (error) {
        console.error("Erro ao descriptografar objeto:", error);
        return encryptedObj; // Em caso de erro, retorna o objeto original
    }
};
