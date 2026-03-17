import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "gen-lang-client-0603078132",
  "appId": "1:945025005408:web:c994571e82c5294283d005",
  "apiKey": "AIzaSyAGUkDrOcIxuHoDTPxBlhL-Y-Y1y8CksOU",
  "authDomain": "gen-lang-client-0603078132.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-3164f084-8316-4c34-b88f-a75b997c5d7d",
  "storageBucket": "gen-lang-client-0603078132.firebasestorage.app",
  "messagingSenderId": "945025005408",
  "measurementId": ""
};

let db: any;

try {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.error('Erro CRÍTICO ao inicializar o Firebase Client:', error);
  db = {
    collection: () => { 
      throw new Error("Firebase Client não foi inicializado corretamente."); 
    }
  } as any;
}

export { db };
