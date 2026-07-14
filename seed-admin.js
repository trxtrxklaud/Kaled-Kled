import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize firebase-admin
// Since we are in AI Studio environment, initializeApp() should pick up the default credentials.
try {
  initializeApp({
    projectId: 'gen-lang-client-0796269511'
  });
  
  const auth = getAuth();
  const db = getFirestore();
  db.settings({ databaseId: 'ai-studio-ef614327-c07d-45d6-8997-bc4e52c3d2b6' });

  async function seed() {
    const email = 'admin@providence.com';
    const password = 'adminpassword123';
    let uid;
    
    try {
      const user = await auth.getUserByEmail(email);
      uid = user.uid;
      console.log('User already exists, updating password...');
      await auth.updateUser(uid, { password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const user = await auth.createUser({
          email,
          password,
          displayName: 'System Admin'
        });
        uid = user.uid;
        console.log('User created successfully.');
      } else {
        throw e;
      }
    }
    
    await db.collection('users').doc(uid).set({
      role: 'admin',
      name: 'System Admin',
      assignedClasses: [],
      childrenIds: [],
      phone: '00000000'
    }, { merge: true });
    
    console.log('Firestore document updated. Login with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
  
  seed().catch(console.error);
} catch (e) {
  console.error(e);
}
