import * as admin from 'firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // For local development without service account key
    // This will use Application Default Credentials
    admin.initializeApp();
  }
}

export const dbAdmin = admin.firestore();
export const auth = getAdminAuth();
