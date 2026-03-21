import { dbAdmin } from "./api/_firebase-admin.js";

async function checkPrompts() {
  const doc = await dbAdmin.collection('settings').doc('prompts').get();
  if (doc.exists) {
    console.log("Prompts found:", JSON.stringify(doc.data(), null, 2));
  } else {
    console.log("Prompts doc not found");
  }
}

checkPrompts();
