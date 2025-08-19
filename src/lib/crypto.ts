import CryptoJS from 'crypto-js';

const secretKey = process.env.NEXT_PUBLIC_CRYPTO_SECRET_KEY;

if (!secretKey) {
  throw new Error("A variável de ambiente NEXT_PUBLIC_CRYPTO_SECRET_KEY não está definida.");
}

// Função para criptografar um objeto
export const encryptData = <T extends object>(data: T): string => {
  const dataString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(dataString, secretKey).toString();
};

// Função para descriptografar uma string para um objeto
export const decryptData = <T extends object>(encryptedData: string): T | null => {
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

// Função para criptografar apenas os campos sensíveis de um objeto
export const encryptObjectValues = (obj: Record<string, any>): Record<string, any> => {
    const encryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if(obj[key] !== null && obj[key] !== undefined) {
                 encryptedObj[key] = CryptoJS.AES.encrypt(JSON.stringify(obj[key]), secretKey).toString();
            } else {
                 encryptedObj[key] = obj[key];
            }
        }
    }
    return { 'encryptedData': encryptData(obj) };
};


// Função para descriptografar os campos de um objeto que foi salvo como um todo
export const decryptObjectValues = (encryptedObj: Record<string, any>): Record<string, any> | null => {
    if (encryptedObj && encryptedObj.encryptedData) {
        return decryptData(encryptedObj.encryptedData);
    }
    return null;
};
