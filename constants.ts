import { XStatus, SWOState } from './types';

export const COLUMNS = [
  "ID",
  "Nom du site",
  "Region",
  "N° SWO",
  "Priorité",
  "Assigned to",
  "Short description",
  "Description",
  "Date de création du SWO",
  "Date de remontée",
  "Date de Clôture",
  "Date de planification",
  "Intervenant",
  "N° FIT &/ou DP",
  "Date de transmission au client",
  "Date de validation Client",
  "Comments Reco",
  "Commentaire",
  "Closing date",
  "State SWO",
  "X",
  "N°MRO",
  "Montant (Fcfa)",
  "PM Date",
  "SWAP BATTERIE",
  "SWAP COURROIE",
  "SWO A CANCELLE",
  "CM RETIRES",
  "PM RETIRES"
];

export const X_OPTIONS = [
  XStatus.CLOSED,
  XStatus.TVX_STHIC,
  XStatus.STHIC_SPA,
  XStatus.STHIC_ATV_HTC,
  XStatus.HTC
];

export const SWO_OPTIONS = [
  SWOState.CLOSED,
  SWOState.OPEN
];

// Coordinates for regions in Congo-Brazzaville for the SiteMap component
export const REGION_COORDINATES: Record<string, [number, number]> = {
  "BRAZZAVILLE": [-4.263, 15.283],
  "POINTENOIRE": [-4.778, 11.859],
  "NIARI": [-3.500, 12.500],
  "LEKOUMOU": [-2.917, 13.583],
  "BOUENZA": [-4.167, 13.583],
  "POOL": [-3.500, 15.000],
  "PLATEAUX": [-1.917, 15.583],
  "CUVETTE": [-0.500, 16.000],
  "CUVETTEOUEST": [0.000, 14.500],
  "SANGHA": [1.500, 15.000],
  "LIKOUALA": [1.500, 17.500],
  "KOUILOU": [-4.250, 11.833]
};

export const getRowColorClass = (xValue: string | number | undefined): string => {
  const val = String(xValue);
  switch (val) {
    case XStatus.CLOSED:
      return "bg-green-100 hover:bg-green-200 text-green-900";
    case XStatus.STHIC_SPA:
      return "bg-blue-100 hover:bg-blue-200 text-blue-900";
    case XStatus.STHIC_ATV_HTC:
      return "bg-yellow-100 hover:bg-yellow-200 text-yellow-900";
    case XStatus.HTC:
      return "bg-orange-100 hover:bg-orange-200 text-orange-900";
    case XStatus.TVX_STHIC:
    default:
      return "bg-white hover:bg-gray-50 text-gray-900";
  }
};