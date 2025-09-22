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

async function createTestUsers() {
  const testUsers = [
    {
      email: 'client@example.com',
      password: 'password123',
      name: 'John Client',
      role: 'CLIENT'
    },
    {
      email: 'designer@example.com',
      password: 'password123',
      name: 'Jane Designer',
      role: 'DESIGNER'
    },
    {
      email: 'client2@example.com',
      password: 'password123',
      name: 'Bob Smith',
      role: 'CLIENT'
    }
  ];

  for (const userData of testUsers) {
    try {
      console.log(`Creating user: ${userData.email}...`);
      
      // Create Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      console.log(`Firebase Auth user created: ${user.uid}`);

      // Create user profile in Firestore
      const userProfile = {
        id: user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log(`User profile created in Firestore: ${userData.email}`);

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`User ${userData.email} already exists, skipping...`);
      } else {
        console.error(`Error creating user ${userData.email}:`, error.message);
      }
    }
  }

  console.log('\n✅ Test users creation complete!');
  console.log('You can now see these users in the admin panel at /admin/users');
}

createTestUsers();
