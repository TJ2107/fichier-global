import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase - Variables d'environnement uniquement
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validation de la configuration
const validateFirebaseConfig = (config: any) => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    console.error('❌ Configuration Firebase incomplète. Champs manquants:', missingFields);
    console.error('Variables d\'environnement actuelles:', {
      VITE_FIREBASE_API_KEY: config.apiKey ? '✅' : '❌',
      VITE_FIREBASE_AUTH_DOMAIN: config.authDomain ? '✅' : '❌',
      VITE_FIREBASE_PROJECT_ID: config.projectId ? '✅' : '❌',
      VITE_FIREBASE_STORAGE_BUCKET: config.storageBucket ? '✅' : '❌',
      VITE_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId ? '✅' : '❌',
      VITE_FIREBASE_APP_ID: config.appId ? '✅' : '❌',
    });
    return false;
  }

  console.log('✅ Configuration Firebase valide');
  return true;
};

// Initialiser Firebase uniquement si la configuration est valide
let app: any = null;
let db: any = null;
let auth: any = null;

if (validateFirebaseConfig(firebaseConfig)) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Activer la persistance locale (synchronisation offline)
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Plusieurs onglets ouverts, persistance désactivée');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Navigateur ne supporte pas la persistance');
      }
    });

    console.log('✅ Firebase initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation Firebase:', error);
  }
} else {
  console.warn('⚠️ Firebase non configuré - mode démo activé');
}

export { app, db, auth };
export default app;
