import 'dotenv/config';
import CryptoJS from 'crypto-js';

// This will ensure that the .env file is loaded when this module is imported.
const secretKey = process.env.ENCRYPTION_SECRET_KEY;
if (!secretKey && typeof window === 'undefined') {
  // Only log the error on the server side to avoid exposing this in client bundles
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
    console.warn("Chave de descriptografia não disponível no contexto atual (provavelmente no cliente).");
    return null;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
        return null; 
    }
    return JSON.parse(decryptedString) as T;
  } catch (error) {
    console.error("Erro ao descriptografar dados:", error);
    return null;
  }
};


export const encryptObjectValues = (obj: Record<string, any>): Record<string, any> => {
    return { 'encryptedData': encryptData(obj) };
};


export const decryptObjectValues = (encryptedObj: Record<string, any>): Record<string, any> | null => {
    if (!encryptedObj || !encryptedObj.encryptedData || typeof encryptedObj.encryptedData !== 'string') {
       return encryptedObj; 
    }

     if (!secretKey) {
        console.error("Nenhuma chave de descriptografia disponível. Certifique-se de que a ENCRYPTION_SECRET_KEY está definida.");
        return encryptedObj;
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedObj.encryptedData, secretKey);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) {
            return encryptedObj;
        }
        const decryptedPayload = JSON.parse(decryptedString);

        const finalObject = { ...encryptedObj, ...decryptedPayload };
        delete finalObject.encryptedData; 
        return finalObject;

    } catch (error) {
        console.error("Erro ao descriptografar objeto:", error);
        return encryptedObj; 
    }
};
