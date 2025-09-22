require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixAdminUser() {
  const adminEmail = 'admin@blinkworks.com';
  const adminPassword = 'admin123456';

  try {
    console.log('Signing in as admin user...');
    
    // Sign in to get the UID
    const { user } = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('Admin user UID:', user.uid);

    // Create admin user profile in Firestore
    const adminProfile = {
      id: user.uid,
      name: 'Admin User',
      email: adminEmail,
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), adminProfile);
    console.log('Admin user profile created/updated in Firestore');

    console.log('\n✅ Admin user fixed!');
    console.log(`UID: ${user.uid}`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Role: ADMIN`);
    console.log('\nYou can now log in to the admin panel at /admin');

  } catch (error) {
    console.error('Error fixing admin user:', error);
    process.exit(1);
  }
}

fixAdminUser();
