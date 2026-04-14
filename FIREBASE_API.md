# 📚 Référence API Firebase Firestore

## Imports

```typescript
import {
  getAllRowsFromFirestore,
  saveRowToFirestore,
  saveRowsToFirestore,
  deleteRowFromFirestore,
  deleteRowsFromFirestore,
  getRowsWithFilter,
} from '@/firebase/firestoreService';

import { db } from '@/firebase/config';
```

---

## Fonctions Disponibles

### 📥 Charger les Données

#### `getAllRowsFromFirestore()`
Charge **tous** les enregistrements de Firestore.

```typescript
const data = await getAllRowsFromFirestore();
// Returns: GlobalFileRow[]
```

**Exemple:**
```typescript
useEffect(() => {
  const loadData = async () => {
    const rows = await getAllRowsFromFirestore();
    setData(rows);
  };
  loadData();
}, []);
```

---

#### `getRowsWithFilter(field, operator, value)`
Charge les enregistrements avec un **filtre**.

```typescript
const filtered = await getRowsWithFilter('Nom du site', 'where', 'Site A');
// Returns: GlobalFileRow[]
```

**Paramètres:**
- `field: string` - Nom du champ à filtrer
- `operator: 'where' | 'orderBy'` - Type de filtre
- `value: any` - Valeur du filtre

**Exemples:**
```typescript
// Tous les enregistrements pour un site
const site_rows = await getRowsWithFilter('Nom du site', 'where', 'Usine Paris');

// Tous les CLOSED
const closed = await getRowsWithFilter('State SWO', 'where', 'CLOSED');
```

---

### 💾 Sauvegarder les Données

#### `saveRowToFirestore(row)`
Sauvegarde **une** ligne.
- Si `row.id` existe → **UPDATE**
- Sinon → **CREATE** (ID auto-généré)

```typescript
const id = await saveRowToFirestore(row);
// Returns: string (document ID)
```

**Exemple:**
```typescript
const newRow: GlobalFileRow = {
  id: undefined,
  "Description": "Maintenance batterie",
  "Nom du site": "Usine A",
  // ... autres champs
};

const docId = await saveRowToFirestore(newRow);
console.log('Sauvegardé avec ID:', docId);
```

---

#### `saveRowsToFirestore(rows)`
Sauvegarde **plusieurs** lignes en parallèle.

```typescript
await saveRowsToFirestore([row1, row2, row3]);
// Returns: Promise<void>
```

**Exemple:**
```typescript
const newRows = importedData.map(row => ({
  ...row,
  id: undefined, // Laisser vide pour créer un nouvel enregistrement
}));

await saveRowsToFirestore(newRows);
console.log('Tous les enregistrements sont sauvegardés!');
```

**Auto-sync dans App.tsx:**
```typescript
// Sauvegarde automatique toutes les 2 secondes
useEffect(() => {
  if (isLoading || data.length === 0) return;
  const timeoutId = setTimeout(async () => {
    try {
      await saveRowsToFirestore(data);
    } catch (e) {
      console.error('Erreur auto-save:', e);
    }
  }, 2000);
  return () => clearTimeout(timeoutId);
}, [data, isLoading]);
```

---

### 🗑️ Supprimer les Données

#### `deleteRowFromFirestore(rowId)`
Supprime **un** enregistrement.

```typescript
await deleteRowFromFirestore('docId123');
// Returns: Promise<void>
```

**Exemple:**
```typescript
const handleDelete = async (rowId: string) => {
  try {
    await deleteRowFromFirestore(rowId);
    setData(data.filter(r => r.id !== rowId));
  } catch (error) {
    console.error('Erreur suppression:', error);
  }
};
```

---

#### `deleteRowsFromFirestore(rowIds)`
Supprime **plusieurs** enregistrements en parallèle.

```typescript
await deleteRowsFromFirestore(['id1', 'id2', 'id3']);
// Returns: Promise<void>
```

**Exemple:**
```typescript
const handleBulkDelete = async (selectedIds: string[]) => {
  try {
    await deleteRowsFromFirestore(selectedIds);
    setData(data.filter(r => !selectedIds.includes(r.id || '')));
  } catch (error) {
    console.error('Erreur suppression:', error);
  }
};
```

---

## 🔥 Types de Données

### `GlobalFileRow`
```typescript
interface GlobalFileRow {
  id?: string;
  Description: string;
  'Nom du site': string;
  'Closing date'?: string | Date;
  'Date de Clôture'?: string | Date;
  'State SWO'?: 'OPEN' | 'CLOSED';
  X?: string;
  // ... autres champs
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 💡 Patterns Courants

### 1️⃣ Charger Données + Afficher Loader

```typescript
const [data, setData] = useState<GlobalFileRow[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      const rows = await getAllRowsFromFirestore();
      setData(rows);
    } catch (error) {
      console.error('Erreur load:', error);
    } finally {
      setIsLoading(false);
    }
  };
  loadData();
}, []);

if (isLoading) return <LoadingSpinner />;
return <DataTable data={data} />;
```

---

### 2️⃣ Importer Données Excel

```typescript
const handleImport = async (excelFile: File) => {
  const workbook = XLSX.read(excelFile, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<GlobalFileRow>(sheet);
  
  // Assigner des IDs vides pour créer
  const newRows = rows.map(row => ({ ...row, id: undefined }));
  
  try {
    setIsSaving(true);
    await saveRowsToFirestore(newRows);
    setData([...data, ...newRows]);
    alert('Importation réussie!');
  } catch (error) {
    alert('Erreur lors de l\'importation');
  } finally {
    setIsSaving(false);
  }
};
```

---

### 3️⃣ Filtrer par Site

```typescript
const [selectedSite, setSelectedSite] = useState('');
const [filteredData, setFilteredData] = useState<GlobalFileRow[]>([]);

const handleSiteFilter = async (siteName: string) => {
  setSelectedSite(siteName);
  if (siteName) {
    const rows = await getRowsWithFilter('Nom du site', 'where', siteName);
    setFilteredData(rows);
  } else {
    setFilteredData(data);
  }
};
```

---

### 4️⃣ Modifier une Ligne

```typescript
const handleSave = async (updatedRow: GlobalFileRow) => {
  try {
    await saveRowToFirestore(updatedRow);
    // Mettre à jour l'état local
    setData(data.map(r => r.id === updatedRow.id ? updatedRow : r));
    alert('Sauvegardé!');
  } catch (error) {
    alert('Erreur lors de la sauvegarde');
  }
};
```

---

## ⚙️ Configuration Firestore

### Persistence (Offline Support)
Activée dans `firebase/config.ts`:
```typescript
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Plusieurs onglets ouverts');
  } else if (err.code === 'unimplemented') {
    console.warn('Navegateur ne supporte pas la persistance');
  }
});
```

### Collection Name
```typescript
const COLLECTION_NAME = 'fichierGlobal';  // firebase/firestoreService.ts
```

---

## 🚨 Gestion Erreurs

```typescript
try {
  await saveRowsToFirestore(data);
} catch (error) {
  // Erreur réseau
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      console.error('Accès refusé (vérifier les règles Firestore)');
    } else if (error.code === 'invalid-argument') {
      console.error('Données invalides');
    }
  }
  console.error(error);
}
```

---

## 📊 Performance

- **Batch Size:** Les opérations bulk utilisent `Promise.all()` pour paralléliser
- **Auto-sync:** 2 secondes de délai après modification (configurable dans App.tsx)
- **Offline:** Les modifications sont stockées localement et synchronisées quand la connexion revient
- **Indexing:** Configurable dans Firebase Console pour optimiser les requêtes

---

## 🔒 Sécurité

Les données sont sécurisées via les **Firestore Security Rules**.

Règles par défaut (mode test - ⚠️ À sécuriser en production):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fichierGlobal/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Règles avec authentification:
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

## 📞 Support

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Console](https://console.firebase.google.com)
- [firestoreService.ts](./firebase/firestoreService.ts) - Code source
- [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md) - Configuration

