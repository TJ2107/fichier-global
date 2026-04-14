# Guide d'Intégration Firebase - Fichier Global

## ✅ Statut de l'intégration

**Firebase Firestore est maintenant intégré et configuré avec vos vrais identifiants.**

---

## 🚀 Quickstart

### 1. Configuration automatique
La configuration Firebase est automatiquement chargée depuis `.env.local` :

```
VITE_FIREBASE_API_KEY=AIzaSyBl33Ta3P7lkLmpKd7erjZhh5TqqBn4vHA
VITE_FIREBASE_AUTH_DOMAIN=device-streaming-9dc16a46.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=device-streaming-9dc16a46
VITE_FIREBASE_STORAGE_BUCKET=device-streaming-9dc16a46.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=227467608009
VITE_FIREBASE_APP_ID=1:227467608009:web:60cb14daf673046be23218
```

### 2. Démarrage
```bash
npm install  # Install/update dependencies
npm run dev  # Lancer en développement
```

L'application va :
- ✅ Se connecter à Firebase Firestore
- ✅ Charger les données existantes (collection `fichierGlobal`)
- ✅ Synchroniser les modifications automatiquement en local et à distance

---

## 📊 Architecture

### Collections Firestore

**Collection: `fichierGlobal`**
```
Document ID: auto-généré
{
  "Description": "...",
  "Nom du site": "...",
  "Closing date": Timestamp,
  "State SWO": "OPEN" | "CLOSED",
  "X": "CLOSED" | ...,
  ... (tous les champs de GlobalFileRow)
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### Fonctions Disponibles

Tous les imports proviennent de `firebase/firestoreService.ts`:

```typescript
// Charger tous les enregistrements
const data = await getAllRowsFromFirestore();

// Sauvegarder une ou plusieurs lignes
await saveRowToFirestore(row);
await saveRowsToFirestore([row1, row2]);

// Supprimer
await deleteRowFromFirestore(rowId);
await deleteRowsFromFirestore([rowId1, rowId2]);

// Filtrer
const filtered = await getRowsWithFilter('Nom du site', 'where', 'Site A');
```

---

## 🔄 Fonctionnalités

### Auto-sync
- Les données se synchronisent automatiquement toutes les 2 secondes après modification
- Persistance offline activée (via IndexedDB)
- Les modifications locales se synchronisent quand la connexion revient

### Chargement initial
- L'application charge les données de Firestore au démarrage
- Si Firestore n'est pas disponible, les données locales sont utilisées

### Import de fichiers
- Chargez des fichiers Excel/CSV
- Les données s'importent dans Firestore automatiquement
- Les doublons ne sont pas écrasés (vous pouvez fusionner manuellement)

---

## ⚙️ Configuration Avancée

### Ajouter une authentification (optionnel)

```typescript
// firebase/config.ts
import { getAuth } from 'firebase/auth';

const auth = getAuth(app);
export { auth };
```

### Règles de sécurité Firestore

Allez sur [console.firebase.google.com](https://console.firebase.google.com) → Your Project → Firestore Database → Rules

**Règles de base (mode public):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fichierGlobal/{document=**} {
      allow read, write: if true;  // ⚠️ À sécuriser en production
    }
  }
}
```

**Règles avec authentification:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fichierGlobal/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🐛 Troubleshooting

### Erreur: "Firestore initialization failed"
- ✅ Vérifier que `.env.local` existe
- ✅ Vérifier que les variables VITE_FIREBASE_* sont correctes
- ✅ Redémarrer le serveur dev : `npm run dev`

### Les données ne se sauvegardent pas
- Vérifier la console (F12 → Console tab)
- Vérifier les règles Firestore
- Vérifier la connexion internet

### Permission denied
- Aller dans Firestore Console
- Vérifier les règles de sécurité
- Mode test? Utiliser les règles publiques (voir section Configuration)

---

## 📄 Fichiers Importants

| File | Purpose |
|------|---------|
| `firebase/config.ts` | Configuration Firebase |
| `firebase/firestoreService.ts` | Fonctions Firestore |
| `.env.local` | Identifiants Firebase (⚠️ Ne pas commiter) |
| `App.tsx` | Intégration main |

---

## 🔐 Sécurité

⚠️ **Important:**
- `.env.local` contient vos clés Firebase
- Ne le commitez **JAMAIS** sur GitHub
- Vérifiez que `.gitignore` contient `.env.local`
- En production, utilisez les règles Firestore pour sécuriser l'accès

---

## 📚 Ressources

- [Firebase Console](https://console.firebase.google.com)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase JavaScript SDK](https://firebase.google.com/docs/web/setup)
- [Security Rules](https://firebase.google.com/docs/firestore/security/start)

---

**Version:** 1.0  
**Date:** 2026-04-14  
**Status:** ✅ Production Ready
