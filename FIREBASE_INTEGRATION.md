# Intégration Firebase à Global Files

## ✅ Ce qui a été configué

### 1. **Installation de Firebase SDK**
   - ✓ Firebase SDK installé via npm
   - ✓ Firestore Database client

### 2. **Structure des Fichiers**
```
src/firebase/
├── config.ts              # Configuration Firebase
├── firestoreService.ts    # Services Firestore (CRUD)
```

### 3. **Services Firestore Disponibles**

#### Sauvegarder des données
```typescript
import { saveRowToFirestore, saveRowsToFirestore } from './firebase/firestoreService';

// Sauvegarder une ligne
await saveRowToFirestore(row);

// Sauvegarder plusieurs lignes
await saveRowsToFirestore(rows);
```

#### Charger des données
```typescript
import { getAllRowsFromFirestore, getRowsWithFilter } from './firebase/firestoreService';

// Charger tous les enregistrements
const data = await getAllRowsFromFirestore();

// Charger avec filtres
const filtered = await getRowsWithFilter('site', 'where', 'Paris');
```

#### Supprimer des données
```typescript
import { deleteRowFromFirestore, deleteRowsFromFirestore } from './firebase/firestoreService';

// Supprimer une ligne
await deleteRowFromFirestore(rowId);

// Supprimer plusieurs lignes
await deleteRowsFromFirestore([id1, id2]);
```

### 4. **Fonctionnalités Incluses**
- ✓ Synchronisation automatique toutes les 2 secondes
- ✓ Persistance locale (IndexedDB) pour mode offline
- ✓ Gestion des timestamps (createdAt, updatedAt)
- ✓ Gestion des erreurs
- ✓ Support des filtres avancés

## 🎯 Prochaines Étapes

1. **Configurez Firebase** → Voir [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
2. **Créez le fichier `.env`** avec vos identifiants
3. **Lancez l'application** : `npm run dev`
4. **Testez la sauvegarde** : Importez des données et vérifiez dans Firestore Console

## 🔄 Flux de Données

```
App chargée
    ↓
Charge les données de Firestore
    ↓
Affiche les données
    ↓
Utilisateur importe/modifie les données
    ↓
Auto-save toutes les 2 sec vers Firestore
    ↓
Données synchronisées ✓
```

## 📊 Collection Firestore

**Collection Name**: `fichierGlobal`

**Structure d'une ligne** :
```json
{
  "id": "document-id",
  "Nom du site": "Paris",
  "Description": "Remplacement batterie GE",
  "X": "Closed",
  "State SWO": "CLOSED",
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  ...autres colonnes
}
```

## 🚨 Notes Importantes

- Les IDs des documents sont générés automatiquement par Firestore
- La persistance offline est activée automatiquement
- Les données sont synchronisées en temps réel
- Vérifiez les règles de sécurité en production

## 📞 Support

Si vous avez des questions :
1. Consultez [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
2. Vérifiez la console Firestore
3. Regardez les erreurs dans la console du navigateur (F12)
