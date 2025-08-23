import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_SECRET_KEY ?? process.env.NEXT_PUBLIC_CRYPTO_SECRET_KEY;


if (!secretKey) {
  throw new Error("Nenhuma chave de criptografia foi definida. Defina ENCRYPTION_SECRET_KEY ou NEXT_PUBLIC_CRYPTO_SECRET_KEY.");
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

// Função para criptografar um objeto inteiro dentro de um campo 'encryptedData'
export const encryptObjectValues = (obj: Record<string, any>): Record<string, any> => {
    return { 'encryptedData': encryptData(obj) };
};


// Função para descriptografar os campos de um objeto
// Lida com objetos que estão totalmente criptografados dentro de 'encryptedData'
// ou objetos onde cada valor é criptografado individualmente (legado).
export const decryptObjectValues = (encryptedObj: Record<string, any>): Record<string, any> | null => {
    if (!encryptedObj) return null;

    // Cenário 1: O objeto inteiro está criptografado em 'encryptedData'
    if (encryptedObj.encryptedData && typeof encryptedObj.encryptedData === 'string') {
        const decryptedPayload = decryptData(encryptedObj.encryptedData);
        if (!decryptedPayload) return null;
        
        // Mantém outros campos de nível superior (como 'studentUid')
        const finalObject = { ...encryptedObj, ...decryptedPayload };
        delete finalObject.encryptedData; // Remove o campo de dados brutos
        return finalObject;
    }

    // Cenário 2 (Legado): Tenta descriptografar cada valor do objeto.
    // Isso é menos eficiente e propenso a erros, mas mantido para retrocompatibilidade.
    try {
        const decrypted: Record<string, any> = {};
        let hasDecryptedField = false;

        for (const key in encryptedObj) {
            if (Object.prototype.hasOwnProperty.call(encryptedObj, key)) {
                if (typeof encryptedObj[key] === 'string') {
                    const bytes = CryptoJS.AES.decrypt(encryptedObj[key], secretKey);
                    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                    
                    if (decryptedText) {
                        try {
                           decrypted[key] = JSON.parse(decryptedText);
                           hasDecryptedField = true;
                        } catch (e) {
                           // Se não for um JSON, usa o texto direto.
                           decrypted[key] = decryptedText;
                           hasDecryptedField = true; // Considera como sucesso se algo for descriptografado.
                        }
                    } else {
                        // Se a descriptografia falhar para uma string, mantém o valor original.
                        decrypted[key] = encryptedObj[key];
                    }
                } else {
                     // Mantém valores não-string como estão (ex: Timestamps, números).
                     decrypted[key] = encryptedObj[key];
                }
            }
        }
        // Se pelo menos um campo foi descriptografado, retorna o objeto.
        // Se nenhum foi, provavelmente o objeto não estava criptografado no formato legado.
        return hasDecryptedField ? decrypted : encryptedObj;
    } catch (error) {
        // Se um erro inesperado ocorrer durante o processo legado, retorna nulo.
        console.error("Falha no fallback de descriptografia de valores individuais:", error);
        return null;
    }
};
