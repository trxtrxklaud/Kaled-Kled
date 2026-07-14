import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seedUser(email, password, role, name) {
  try {
    let user;
    try {
      // Try to create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log(`Created user: ${email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`User ${email} already exists, signing in...`);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } else {
        throw error;
      }
    }

    // Set the user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      role: role,
      name: name,
      email: email,
      assignedClasses: role === 'teacher' ? ['1A', '2B'] : [],
      childrenIds: [],
      phone: '00000000',
      mustChangePassword: false
    }, { merge: true });

    console.log(`Successfully seeded Firestore document for ${email} with role: ${role}`);
  } catch (error) {
    console.error(`Error seeding ${email}:`, error);
  }
}

async function run() {
  await seedUser('admin@providence.com', 'adminpassword123', 'admin', 'System Admin');
  await seedUser('teacher@providence.com', 'teacherpassword123', 'teacher', 'Prof. Martin');
  console.log('Seeding complete. Exiting...');
  process.exit(0);
}

run();
