# 🚀 Configuration Firebase sur Netlify

## ❌ Problème: Écran Blanc en Production

Les variables d'environnement Firebase ne sont pas exposées au navigateur par défaut lors du déploiement.

---

## ✅ Solutions

### Solution 1: Configurer les Variables sur Netlify (RECOMMANDÉ)

1. **Allez sur Netlify** → Votre site → Settings → Build & deploy → Environment

2. **Ajoutez les variable d'environnement:**
```
VITE_FIREBASE_API_KEY=[Votre_API_Key_Firebase]
VITE_FIREBASE_AUTH_DOMAIN=[Votre_Domaine_Auth_Firebase]
VITE_FIREBASE_PROJECT_ID=[Votre_ID_Projet_Firebase]
VITE_FIREBASE_STORAGE_BUCKET=[Votre_Bucket_Stockage_Firebase]
VITE_FIREBASE_MESSAGING_SENDER_ID=[Votre_ID_Expediteur_Messaging]
VITE_FIREBASE_APP_ID=[Votre_ID_Application_Firebase]
```

3. **Déclenchez un nouveau build:**
   - Allez dans Deploys
   - Cliquez sur "Trigger deploy" → "Deploy site"

### Solution 2: Créer un fichier .env.production

Créez `/workspaces/fichier-global/.env.production`:

```
VITE_FIREBASE_API_KEY=[Votre_API_Key_Firebase]
VITE_FIREBASE_AUTH_DOMAIN=[Votre_Domaine_Auth_Firebase]
VITE_FIREBASE_PROJECT_ID=[Votre_ID_Projet_Firebase]
VITE_FIREBASE_STORAGE_BUCKET=[Votre_Bucket_Stockage_Firebase]
VITE_FIREBASE_MESSAGING_SENDER_ID=[Votre_ID_Expediteur_Messaging]
VITE_FIREBASE_APP_ID=[Votre_ID_Application_Firebase]
```

---

## 🔍 Vérifier Localement

Test du build avant le déploiement:

```bash
npm run build
npm run preview
```

Ouvrir http://localhost:4173 et vérifier que l'app charge correctement.

---

## 🐛 Debugging en Production

### Ouvrir la Console du Navigateur

1. Sur votre site Netlify, appuyez sur **F12**
2. Allez dans l'onglet **Console**
3. Cherchez les erreurs Firebase

Vous devriez voir:
- ✅ `Firebase initialized successfully` - Tout est OK
- ❌ `Firebase Configuration Error` - Variables manquantes
- ⚠️ `Firebase not configured` - Mode démo

---

## 📋 Checklist

- [ ] Variables d'environnement ajoutées à Netlify
- [ ] Nouveau build déclenché
- [ ] Console du navigateur ouverte (F12)
- [ ] Aucune erreur Firebase visible
- [ ] Site charge correctement

---

## 💡 Notes Importantes

1. **Les variables VITE_** sont exposées au navigateur (c'est normal)
2. **Ne jamais exposer les clés API sensibles** - utiliser des clés restrictives
3. **Firestore Security Rules** doivent être configurées
4. Les clés actuelles sont en mode test - à sécuriser en production

---

## ✅ Si Ça ne Fonctionne Pas

1. Effacez le cache du navigateur (Ctrl+Shift+Delete)
2. Forcez un hard refresh (Ctrl+F5)
3. Attendez quelques minutes après le déploiement
4. Vérifiez la console (F12) pour les erreurs
5. Vérifiez que Firestore Database est active sur Firebase Console

