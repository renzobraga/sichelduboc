import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // O replace é necessário porque a Vercel às vezes escapa as quebras de linha (\n) da chave privada
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin:', error);
    // Fallback para o padrão (útil para rodar localmente ou no Cloud Run)
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
}

export const dbAdmin = admin.firestore();
