import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const docRef = await addDoc(collection(db, 'test'), { test: true });
    console.log('Success:', docRef.id);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
