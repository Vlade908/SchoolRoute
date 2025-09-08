import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_SECRET_KEY;
const publicKey = process.env.NEXT_PUBLIC_CRYPTO_SECRET_KEY;

if (!secretKey) {
  throw new Error("Nenhuma chave de criptografia foi definida. Defina ENCRYPTION_SECRET_KEY.");
}

// Função para criptografar um objeto
export const encryptData = <T extends object>(data: T): string => {
  const dataString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(dataString, secretKey).toString();
};

// Função para descriptografar uma string para um objeto
export const decryptData = <T extends object>(encryptedData: string): T | null => {
  const key = secretKey || publicKey;
  if (!key) {
    // This part is tricky because the key exists on server but not client.
    // The logic should be structured to only call decrypt on the client with the public key
    // if that's the intended pattern. For now, we prioritize server-side decryption.
    console.warn("Chave de descriptografia não disponível no contexto atual.");
    return null;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
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
    if(!secretKey) {
        throw new Error("A chave de criptografia do servidor não está disponível para encryptObjectValues.");
    }
    return { 'encryptedData': encryptData(obj) };
};

// Função para descriptografar os campos de um objeto
export const decryptObjectValues = (encryptedObj: Record<string, any>): Record<string, any> | null => {
    if (!encryptedObj || !encryptedObj.encryptedData || typeof encryptedObj.encryptedData !== 'string') {
       return encryptedObj; // Retorna o objeto original se não tiver o campo encryptedData
    }

    const key = secretKey || publicKey;
     if (!key) {
        console.error("Nenhuma chave de descriptografia disponível.");
        return encryptedObj; // Retorna o objeto original se não houver chave
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedObj.encryptedData, key);
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