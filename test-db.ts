import { dbAdmin } from './api/_firebase-admin.js';

async function test() {
  try {
    const doc = await dbAdmin.collection('test').add({ test: true });
    console.log('Success:', doc.id);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
