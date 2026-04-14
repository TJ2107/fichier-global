import { db } from './config';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  getDocs as getDocsFirestore,
  QueryConstraint,
} from 'firebase/firestore';
import { GlobalFileRow } from '../types';

const COLLECTION_NAME = 'fichierGlobal';

// Vérifier si Firebase est disponible
const isFirebaseAvailable = () => {
  return db !== null && db !== undefined;
};

// Fonction utilitaire pour gérer les erreurs Firebase
const handleFirebaseError = (error: any, operation: string) => {
  console.error(`❌ Erreur Firebase lors de ${operation}:`, error);
  if (error.code) {
    console.error(`Code d'erreur: ${error.code}`);
  }
  throw error;
};

// Sauvegarde ou mise à jour d'une ligne de données
export const saveRowToFirestore = async (row: GlobalFileRow): Promise<string> => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️ Firebase non disponible, sauvegarde locale uniquement');
    return row.id || 'local-' + Date.now();
  }

  try {
    const dataWithTimestamp = {
      ...row,
      createdAt: row.createdAt ? Timestamp.fromDate(new Date(row.createdAt)) : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Si l'ID existe, c'est une mise à jour
    if (row.id) {
      const docRef = doc(db, COLLECTION_NAME, row.id);
      await updateDoc(docRef, dataWithTimestamp);
      return row.id;
    }

    // Sinon, c'est une nouvelle création
    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataWithTimestamp);
    return docRef.id;
  } catch (error) {
    return handleFirebaseError(error, 'la sauvegarde');
  }
};

// Sauvegarde de plusieurs lignes
export const saveRowsToFirestore = async (rows: GlobalFileRow[]): Promise<void> => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️ Firebase non disponible, sauvegarde locale uniquement');
    return;
  }

  try {
    const promises = rows.map(row => saveRowToFirestore(row));
    await Promise.all(promises);
  } catch (error) {
    return handleFirebaseError(error, 'la sauvegarde multiple');
  }
};

// Récupération de tous les enregistrements
export const getAllRowsFromFirestore = async (): Promise<GlobalFileRow[]> => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️ Firebase non disponible, retour de tableau vide');
    return [];
  }

  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const rows: GlobalFileRow[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rows.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as GlobalFileRow);
    });

    return rows;
  } catch (error) {
    console.warn('⚠️ Erreur lors de la récupération Firestore, retour de tableau vide');
    console.error(error);
    return [];
  }
};

// Récupération avec filtres
export const getRowsWithFilter = async (
  field: string,
  operator: 'where' | 'orderBy' = 'where',
  value: any
): Promise<GlobalFileRow[]> => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️ Firebase non disponible, retour de tableau vide');
    return [];
  }

  try {
    const constraints: QueryConstraint[] = [];
    if (operator === 'where') {
      constraints.push(where(field, '==', value));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocsFirestore(q);
    const rows: GlobalFileRow[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rows.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as GlobalFileRow);
    });

    return rows;
  } catch (error) {
    console.warn('⚠️ Erreur lors de la récupération filtrée, retour de tableau vide');
    console.error(error);
    return [];
  }
};

// Suppression d'une ligne
export const deleteRowFromFirestore = async (rowId: string): Promise<void> => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️ Firebase non disponible, suppression locale uniquement');
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, rowId));
  } catch (error) {
    return handleFirebaseError(error, 'la suppression');
  }
};

// Suppression de plusieurs lignes
export const deleteRowsFromFirestore = async (rowIds: string[]): Promise<void> => {
  if (!isFirebaseAvailable()) {
    console.warn('⚠️ Firebase non disponible, suppression locale uniquement');
    return;
  }

  try {
    const promises = rowIds.map(id => deleteDoc(doc(db, COLLECTION_NAME, id)));
    await Promise.all(promises);
  } catch (error) {
    return handleFirebaseError(error, 'la suppression multiple');
  }
};
