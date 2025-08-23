import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_SECRET_KEY;

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
    throw new Error("Nenhuma chave de criptografia foi definida. Defina ENCRYPTION_SECRET_KEY.");
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
    if (!encryptedObj) return null;

    if (encryptedObj.encryptedData && typeof encryptedObj.encryptedData === 'string') {
        const decryptedPayload = decryptData(encryptedObj.encryptedData);
        if (!decryptedPayload) return null;
        
        const finalObject = { ...encryptedObj, ...decryptedPayload };
        delete finalObject.encryptedData;
        return finalObject;
    }
    
    // Fallback para o formato antigo se necessário, mas o novo formato é o preferido.
    return encryptedObj; 
};