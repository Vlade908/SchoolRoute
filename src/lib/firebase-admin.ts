import * as admin from 'firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import 'dotenv/config';

// Verifica se o SDK já foi inicializado
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
       console.log("Firebase Admin SDK inicializado com sucesso.");
    } catch (error) {
      console.error("Erro ao fazer parse da FIREBASE_SERVICE_ACCOUNT_KEY:", error);
      // Fallback para Application Default Credentials se o parse falhar
      admin.initializeApp();
      console.log("Firebase Admin SDK inicializado com Application Default Credentials (fallback).");
    }
  } else {
    // Se a variável de ambiente não estiver definida, use Application Default Credentials
    // Isso é útil para ambientes como Google Cloud Run/Functions
    admin.initializeApp();
    console.log("Firebase Admin SDK inicializado com Application Default Credentials.");
  }
}

export const dbAdmin = admin.firestore();
export const auth = getAdminAuth();
