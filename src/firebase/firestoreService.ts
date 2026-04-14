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

// Sauvegarde ou mise à jour d'une ligne de données
export const saveRowToFirestore = async (row: GlobalFileRow): Promise<string> => {
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
    console.error('Erreur lors de la sauvegarde à Firestore:', error);
    throw error;
  }
};

// Sauvegarde de plusieurs lignes
export const saveRowsToFirestore = async (rows: GlobalFileRow[]): Promise<void> => {
  try {
    const promises = rows.map(row => saveRowToFirestore(row));
    await Promise.all(promises);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde multiple à Firestore:', error);
    throw error;
  }
};

// Récupération de tous les enregistrements
export const getAllRowsFromFirestore = async (): Promise<GlobalFileRow[]> => {
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
    console.error('Erreur lors de la récupération de Firestore:', error);
    return [];
  }
};

// Récupération avec filtres
export const getRowsWithFilter = async (
  field: string,
  operator: 'where' | 'orderBy' = 'where',
  value: any
): Promise<GlobalFileRow[]> => {
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
    console.error('Erreur lors de la récupération filtrée de Firestore:', error);
    return [];
  }
};

// Suppression d'une ligne
export const deleteRowFromFirestore = async (rowId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, rowId));
  } catch (error) {
    console.error('Erreur lors de la suppression de Firestore:', error);
    throw error;
  }
};

// Suppression de plusieurs lignes
export const deleteRowsFromFirestore = async (rowIds: string[]): Promise<void> => {
  try {
    const promises = rowIds.map(id => deleteDoc(doc(db, COLLECTION_NAME, id)));
    await Promise.all(promises);
  } catch (error) {
    console.error('Erreur lors de la suppression multiple de Firestore:', error);
    throw error;
  }
};
