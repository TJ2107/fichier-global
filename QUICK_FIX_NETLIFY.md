# 🔧 FIX: Écran Blanc sur Netlify

## Le Problème
Les variables Firebase ne sont pas définies sur Netlify → Écran blanc en production.

## La Solution (2 minutes)

### Étape 1: Allez sur Netlify
1. https://app.netlify.com
2. Sélectionnez votre site: `fichier-global`
3. Cliquez sur **Settings** (en haut)

### Étape 2: Ajouter les Variables
1. Dans le menu gauche: **Build & deploy** → **Environment**
2. Cliquez sur **Edit variables**
3. Ajoutez ces 6 variables:

```
VITE_FIREBASE_API_KEY = AIzaSyBl33Ta3P7lkLmpKd7erjZhh5TqqBn4vHA
VITE_FIREBASE_AUTH_DOMAIN = device-streaming-9dc16a46.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = device-streaming-9dc16a46
VITE_FIREBASE_STORAGE_BUCKET = device-streaming-9dc16a46.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 227467608009
VITE_FIREBASE_APP_ID = 1:227467608009:web:60cb14daf673046be23218
```

### Étape 3: Redéployer
1. Allez dans **Deploys** (en haut)
2. Cliquez sur le dernier déploiement
3. Cliquez sur **Trigger deploy** → **Deploy site**
4. Attendez 2-3 minutes ⏳

### Étape 4: Vérifier
1. Ouvrez votre site
2. Appuyez sur **F12** (Console)
3. Vous devriez voir: `✅ Firebase initialized successfully`

---

## ✅ Si Cela Ne Fonctionne Pas

### Option: Vider le cache du navigateur
```
Ctrl + Shift + Delete  (Windows/Linux)
Cmd + Shift + Delete   (Mac)
```

Ou dans Netlify:
1. Settings → Build & deploy → Deploys
2. Cliquez sur le point ... du dernier déploiement
3. **Clear cache & redeploy**

---

## 🎯 Voilà!

Après ces étapes, votre site devrait se charger correctement! 🚀

