# Configuration Firebase pour Global Files

## 📋 Prérequis
- Un compte Google
- Accès à [Console Firebase](https://console.firebase.google.com)

## 🚀 Étapes de Configuration

### 1. Créer un Projet Firebase

1. Allez sur https://console.firebase.google.com
2. Cliquez sur **"Ajouter un projet"**
3. Entrez un nom pour votre projet (ex: `global-files`)
4. Acceptez les conditions
5. Sélectionnez ou créez un compte Google Analytics (optionnel)
6. Cliquez **"Créer un projet"**

### 2. Ajouter une Application Web

1. Dans la console Firebase, cliquez sur l'icône **"<>"** (Ajouter une app)
2. Sélectionnez **"Web"**
3. Entrez un surnom (ex: `global-files-web`)
4. Cochez **"Configurer aussi Firebase Hosting"** (optionnel)
5. Cliquez **"Enregistrer l'application"**

### 3. Récupérer les Identifiants Firebase

Après l'enregistrement, vous verrez la configuration Firebase :

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

**Copiez ces valeurs - vous en aurez besoin ensuite.**

### 4. Configurer les Variables d'Environnement

1. À la racine du projet, créez un fichier `.env` :
   ```bash
   VITE_FIREBASE_API_KEY=votre_api_key
   VITE_FIREBASE_AUTH_DOMAIN=votre_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=votre_project_id
   VITE_FIREBASE_STORAGE_BUCKET=votre_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
   VITE_FIREBASE_APP_ID=votre_app_id
   ```

2. Collez vos identifiants Firebase dans ce fichier

### 5. Activer Firestore Database

1. Dans la console Firebase, allez sur **"Firestore Database"** (menu de gauche)
2. Cliquez **"Créer une base de données"**
3. Sélectionnez le mode : **"Mode de test"** (pour développement)
   - Vous pouvez passer en mode de production plus tard
4. Choisissez un emplacement (ex: `europe-west1`)
5. Cliquez **"Créer"**

### 6. Configurer les Règles de Sécurité (Optionnel)

Par défaut, toutes les lectures/écritures sont autorisées en mode test. Pour plus tard, vous pouvez ajouter l'authentification.

### 7. Tester la Configuration

Lancez l'application :
```bash
npm run dev
```

L'app devrait :
- Charger les données existantes depuis Firestore
- Auto-sauvegarder les modifications dans Firestore
- Fonctionner hors ligne grâce à la persistance IndexedDB

## 🔐 Sécurité - À Faire Plus Tard

### Activer l'Authentification
```javascript
// Dans src/firebase/config.ts - Déjà importé
import { getAuth } from 'firebase/auth';
export const auth = getAuth(app);
```

### Mettre en Place des Règles de Sécurité
Dans Firestore → Règles :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fichierGlobal/{document=**} {
      // À adapter selon vos besoins
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🆘 Dépannage

### "Erreur : Clé API manquante"
→ Vérifiez que votre fichier `.env` est à la racine du projet et que les variables sont correctes

### "Firestore non initialisée"
→ Rafraîchissez la page et vérifiez que la base de données est créée

### "Erreur de persistance"
→ C'est normal si plusieurs onglets sont ouverts. Essayez en mode Incognito

## 📚 Documentation Officielle
- [Firebase Console](https://console.firebase.google.com)
- [Guide d'intégration Firebase Web](https://firebase.google.com/docs/web/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
