// Wrapper pour initialiser Firebase avec gestion d'erreur
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Log pour debugging
const logFirebaseConfig = () => {
  console.log('Firebase Configuration Status:');
  console.log('  API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ SET' : '❌ MISSING');
  console.log('  AUTH_DOMAIN:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ SET' : '❌ MISSING');
  console.log('  PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING');
  console.log('  STORAGE_BUCKET:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ SET' : '❌ MISSING');
  console.log('  MESSAGING_SENDER_ID:', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ SET' : '❌ MISSING');
  console.log('  APP_ID:', import.meta.env.VITE_FIREBASE_APP_ID ? '✅ SET' : '❌ MISSING');
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Vérifier que la configuration est valide
const isFirebaseConfigValid = Object.values(firebaseConfig).some(val => val !== "");

if (!isFirebaseConfigValid) {
  console.error('❌ Firebase Configuration Error: Aucune variable d\'environnement trouvée!');
  logFirebaseConfig();
}

// Initialiser Firebase uniquement si la config est valide
let app;
let db;
let auth;

try {
  if (isFirebaseConfigValid) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Activer la persistance locale
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Plusieurs onglets ouverts, persistance désactivée');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Navigateur ne supporte pas la persistance');
      }
    });
    
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase not configured - running in demo mode');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  logFirebaseConfig();
}

export { app, db, auth, isFirebaseConfigValid };
export default app;
