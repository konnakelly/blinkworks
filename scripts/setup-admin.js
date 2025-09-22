require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
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

async function setupAdmin() {
  const adminEmail = process.argv[2] || 'admin@blinkworks.com';
  const adminPassword = process.argv[3] || 'admin123456';
  const adminName = process.argv[4] || 'Admin User';

  try {
    console.log('Creating admin user...');
    
    // Create Firebase Auth user
    const { user } = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('Firebase Auth user created:', user.uid);

    // Create user profile in Firestore
    const userProfile = {
      id: user.uid,
      name: adminName,
      email: adminEmail,
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log('Admin user profile created in Firestore');

    console.log('\n✅ Admin user setup complete!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ADMIN`);
    console.log('\nYou can now log in to the admin panel at /admin');

  } catch (error) {
    console.error('Error setting up admin user:', error);
    process.exit(1);
  }
}

setupAdmin();
