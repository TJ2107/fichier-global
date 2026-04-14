
export interface GlobalFileRow {
  [key: string]: string | number | undefined;
  "ID"?: string;
  "Nom du site"?: string;
  "Region"?: string;
  "N° SWO"?: string;
  "Priorité"?: string;
  "Assigned to"?: string;
  "Short description"?: string;
  "Description"?: string;
  "Date de création du SWO"?: string;
  "Date de remontée"?: string;
  "Date de Clôture"?: string;
  "Date de planification"?: string;
  "Intervenant"?: string;
  "N° FIT &/ou DP"?: string;
  "Date de transmission au client"?: string;
  "Date de validation Client"?: string;
  "Comments Reco"?: string;
  "Commentaire"?: string;
  "Closing date"?: string;
  "State SWO"?: string;
  "X"?: string;
  "N°MRO"?: string;
  "Montant (Fcfa)"?: string;
  "PM Date"?: string;
  "SWAP BATTERIE"?: string;
  "SWAP COURROIE"?: string;
  "SWO A CANCELLE"?: string;
  "CM RETIRES"?: string;
  "PM RETIRES"?: string;
}

export enum XStatus {
  CLOSED = "1- CLOSED",
  TVX_STHIC = "2- TVX STHIC",
  STHIC_SPA = "3- STHIC SPA",
  STHIC_ATV_HTC = "4- STHIC ATV HTC",
  HTC = "5- HTC"
}

export enum SWOState {
  CLOSED = "CLOSED",
  OPEN = "OPEN"
}
