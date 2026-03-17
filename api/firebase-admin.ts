import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

let dbAdmin: admin.firestore.Firestore;

try {
  let app;
  if (!admin.apps.length) {
    // Verifica se as variáveis de ambiente existem antes de tentar usar
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // O replace é necessário porque a Vercel às vezes escapa as quebras de linha (\n) da chave privada
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn("Aviso: Variáveis do Firebase Admin (FIREBASE_PRIVATE_KEY, etc) ausentes. Tentando inicialização padrão.");
      app = admin.initializeApp();
    }
  } else {
    app = admin.app();
  }

  // Lendo o ID do banco de dados do arquivo de configuração importado
  let databaseId = '(default)';
  if (firebaseConfig && firebaseConfig.firestoreDatabaseId) {
    databaseId = firebaseConfig.firestoreDatabaseId;
  }

  dbAdmin = getFirestore(app, databaseId);
} catch (error) {
  console.error('Erro CRÍTICO ao inicializar o Firebase Admin:', error);
  // Cria um objeto falso para evitar que o servidor inteiro (Vercel) caia na inicialização
  // Se tentar usar o banco, ele vai dar erro lá na rota, mas não vai derrubar o site.
  dbAdmin = {
    collection: () => { 
      throw new Error("Firebase Admin não foi inicializado corretamente devido a falta de credenciais."); 
    }
  } as any;
}

export { dbAdmin };
