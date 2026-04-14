
import { COLUMNS } from '../constants';
import { GlobalFileRow } from '../types';

/**
 * Dictionnaire des synonymes pour les colonnes critiques
 * Permet de mapper des en-têtes Excel variés vers les clés officielles de l'application.
 */
const SYNONYMS: Record<string, string[]> = {
  "ID": ["ID", "IDENTIFIANT", "N°", "REF", "REFERENCE"],
  "Nom du site": ["NOM DU SITE", "SITE", "NOM SITE", "STATION", "NODE", "NOM DE SITE", "SITE NAME", "NOM_SITE"],
  "Region": ["REGION", "RÉGION", "SECTEUR", "AREA", "PROVINCE", "ZONES", "ZONE"],
  "N° SWO": ["N° SWO", "SWO", "NUMERO SWO", "N°_SWO", "SWO_NUMBER", "SWO #"],
  "Priorité": ["PRIORITÉ", "PRIORITE", "PRIORITY", "Prio", "URGENCE"],
  "State SWO": ["STATE SWO", "STATUT SWO", "ÉTAT SWO", "ETAT SWO", "STATUS"],
  "X": ["X", "STATUT TECHNIQUE", "STATUS X", "X_STATUS", "TECH STATUS"],
  "Date de création du SWO": ["DATE DE CRÉATION DU SWO", "DATE CREATION", "DATE_CREATION", "CREATED DATE", "CREATION_DATE"],
  "Closing date": ["CLOSING DATE", "DATE DE CLÔTURE", "DATE CLOTURE", "DATE DE FERMETURE", "DATE_FERMETURE"]
};

/**
 * Normalise un nom d'en-tête (minuscule, sans accent, sans espace superflu)
 */
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]/g, "") // Garde uniquement alphanumérique
    .trim();
};

/**
 * Tente de trouver la colonne officielle correspondant à un en-tête brut
 */
const findCanonicalKey = (rawHeader: string): string | null => {
  const normalizedRaw = normalizeString(rawHeader);

  // 1. Test direct dans les colonnes officielles
  for (const col of COLUMNS) {
    if (normalizeString(col) === normalizedRaw) return col;
  }

  // 2. Test dans les synonymes
  for (const [canonical, synonyms] of Object.entries(SYNONYMS)) {
    if (synonyms.some(s => normalizeString(s) === normalizedRaw)) {
      return canonical;
    }
  }

  return null;
};

/**
 * Transforme un objet brut (issu d'Excel) en GlobalFileRow avec les clés officielles
 */
export const normalizeRow = (rawRow: any): GlobalFileRow => {
  const normalizedRow: GlobalFileRow = {};
  
  Object.keys(rawRow).forEach(key => {
    const canonicalKey = findCanonicalKey(key);
    if (canonicalKey) {
      normalizedRow[canonicalKey] = rawRow[key];
    } else {
      // Si on ne trouve pas de correspondance, on garde la clé originale nettoyée
      normalizedRow[key.trim()] = rawRow[key];
    }
  });

  return normalizedRow;
};
