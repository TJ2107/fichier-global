
import React, { useMemo, useState } from 'react';
import { GlobalFileRow } from '../types';
import { Settings2, AlertCircle, CheckCircle2, Search, Filter, Calendar, MapPin, History, Download, CalendarCheck, X, RotateCcw, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BeltTrackerProps {
  data: GlobalFileRow[];
}

interface SiteBeltStatus {
  siteName: string;
  region: string;
  lastReplacementDate: Date | null;
  nextReplacementDate: Date | null;
  daysElapsed: number;
  estimatedHours: number;
  status: 'RED' | 'ORANGE' | 'GREEN';
  lastSWO: string;
}

// Règle métier : 1000h estimées
// Hypothèse : 5.5h / jour -> 1000h / 5.5 ≈ 181 jours
const EXPIRATION_THRESHOLD_DAYS = 180;
const WARNING_THRESHOLD_DAYS = 150;
const HOURS_PER_DAY_ESTIMATE = 5.5;

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

export const BeltTracker: React.FC<BeltTrackerProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'RED' | 'ORANGE' | 'GREEN'>('ALL');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const beltData = useMemo(() => {
    const sitesMap: Record<string, GlobalFileRow[]> = {};
    const now = new Date();

    // 1. Filtrer et regrouper par site les mentions de remplacement courroie
    data.forEach(row => {
      const desc = String(row["Description"] || "").toLowerCase();
      const site = String(row["Nom du site"] || "Inconnu");
      
      const isBeltTask = desc.includes("courroie") || 
                         desc.includes("swap courroie") || 
                         desc.includes("remplacement courroie");

      if (isBeltTask) {
        if (!sitesMap[site]) sitesMap[site] = [];
        sitesMap[site].push(row);
      }
    });

    // 2. Calculer le statut pour chaque site
    const results: SiteBeltStatus[] = Object.entries(sitesMap).map(([siteName, rows]) => {
      let latestDate: Date | null = null;
      let lastSWO = "N/A";
      let region = "Inconnu";

      rows.forEach(r => {
        // Logique mise à jour : Priorité Closing Date > Date de Clôture, On ignore Date de Création
        const date = parseDate(r["Closing date"]) || parseDate(r["Date de Clôture"]);
        if (date && (!latestDate || date > latestDate)) {
          latestDate = date;
          lastSWO = String(r["N° SWO"] || "N/A");
          region = String(r["Region"] || "Inconnu");
        }
      });

      let daysElapsed = 0;
      let estimatedHours = 0;
      let status: 'RED' | 'ORANGE' | 'GREEN' = 'GREEN';
      let nextReplacementDate: Date | null = null;

      if (latestDate) {
        const diffMs = now.getTime() - latestDate.getTime();
        daysElapsed = Math.floor(diffMs / (1000 * 3600 * 24));
        estimatedHours = Math.floor(daysElapsed * HOURS_PER_DAY_ESTIMATE);

        if (daysElapsed >= EXPIRATION_THRESHOLD_DAYS) status = 'RED';
        else if (daysElapsed >= WARNING_THRESHOLD_DAYS) status = 'ORANGE';
        else status = 'GREEN';

        // Échéance théorique
        nextReplacementDate = new Date(latestDate);
        nextReplacementDate.setDate(nextReplacementDate.getDate() + EXPIRATION_THRESHOLD_DAYS);
      }

      return { siteName, region, lastReplacementDate: latestDate, nextReplacementDate, daysElapsed, estimatedHours, status, lastSWO };
    });

    // On ne garde que les sites ayant une date de remplacement valide (clôturée)
    return results
      .filter(r => r.lastReplacementDate !== null)
      .sort((a, b) => b.daysElapsed - a.daysElapsed);
  }, [data]);

  const filteredResults = useMemo(() => {
    return beltData.filter(item => {
      const matchesSearch = item.siteName.toLowerCase().includes(searchTerm.toLowerCase()) || item.region.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      
      let matchesDate = true;
      if (item.lastReplacementDate) {
        const itemTime = item.lastReplacementDate.getTime();
        if (dateRange.start) {
          const startTime = new Date(dateRange.start).setHours(0, 0, 0, 0);
          if (itemTime < startTime) matchesDate = false;
        }
        if (dateRange.end) {
          const endTime = new Date(dateRange.end).setHours(23, 59, 59, 999);
          if (itemTime > endTime) matchesDate = false;
        }
      } else if (dateRange.start || dateRange.end) matchesDate = false;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [beltData, searchTerm, filterStatus, dateRange]);

  const stats = useMemo(() => ({
    total: beltData.length,
    red: beltData.filter(d => d.status === 'RED').length,
    orange: beltData.filter(d => d.status === 'ORANGE').length,
    green: beltData.filter(d => d.status === 'GREEN').length,
  }), [beltData]);

  const exportToExcel = () => {
    const exportData = filteredResults.map(item => ({
      "Statut": item.status === 'RED' ? 'EXCÈS 1000H' : item.status === 'ORANGE' ? 'PROCHE 1000H' : 'CONFORME',
      "Nom du site": item.siteName,
      "Région": item.region,
      "Dernier Remplacement": item.lastReplacementDate ? item.lastReplacementDate.toLocaleDateString('fr-FR') : 'Inconnu',
      "Échéance Estimée": item.nextReplacementDate ? item.nextReplacementDate.toLocaleDateString('fr-FR') : 'N/A',
      "Jours Écoulés": item.daysElapsed,
      "Heures Estimées": item.estimatedHours,
      "Dernier SWO": item.lastSWO
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suivi Courroies");
    XLSX.writeFile(wb, `SUIVI_COURROIES_DG_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings2 className="w-8 h-8 text-indigo-600" />
            DG Belt Tracking (Seuil 1000h)
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Estimation de l'usure des courroies basée sur la date du dernier remplacement (Seuil critique : {EXPIRATION_THRESHOLD_DAYS}j ≈ 1000h).
          </p>
        </div>
        <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
          <Download className="w-5 h-5" /> Exporter le suivi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Sites Suivis</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-xs font-bold text-red-400 uppercase">Excès 1000h</p>
          <h3 className="text-3xl font-black text-red-600 mt-1">{stats.red}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-xs font-bold text-orange-400 uppercase">Proche Seuil</p>
          <h3 className="text-3xl font-black text-orange-600 mt-1">{stats.orange}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-xs font-bold text-green-400 uppercase">Conformes</p>
          <h3 className="text-3xl font-black text-green-600 mt-1">{stats.green}</h3>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 items-end">
        <div className="flex-1 w-full flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase">Recherche Site / Région</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Filtrer..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <label className="text-xs font-bold text-gray-400 uppercase">Date dernier changement</label>
          <div className="flex items-center gap-2">
            <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
            <span className="text-gray-400">-</span>
            <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filterStatus === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Tous</button>
          <button onClick={() => setFilterStatus('RED')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filterStatus === 'RED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>Expirés</button>
          <button onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); setDateRange({start:'', end:''}); }} className="p-2.5 bg-gray-100 text-gray-500 rounded-lg border border-gray-200 hover:bg-gray-200"><RotateCcw className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Site / Région</th>
                <th className="px-6 py-4">Dernier Changement</th>
                <th className="px-6 py-4">Échéance Estimée</th>
                <th className="px-6 py-4 text-center">Heures Estimées</th>
                <th className="px-6 py-4 text-center">Jours</th>
                <th className="px-6 py-4">Santé Courroie (1000h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {item.status === 'RED' && <span className="flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-full w-fit"><AlertCircle className="w-3.5 h-3.5" /> EXCÈS 1000H</span>}
                    {item.status === 'ORANGE' && <span className="flex items-center gap-1.5 text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded-full w-fit"><History className="w-3.5 h-3.5" /> PROCHE SEUIL</span>}
                    {item.status === 'GREEN' && <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> CONFORME</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {item.siteName}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold ml-6">{item.region}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-bold"><Calendar className="w-4 h-4 text-gray-400" /> {item.lastReplacementDate ? item.lastReplacementDate.toLocaleDateString('fr-FR') : 'Inconnu'}</div>
                    <div className="text-[10px] text-gray-400 ml-6">SWO: {item.lastSWO}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 text-sm font-bold ${item.status === 'RED' ? 'text-red-600' : 'text-indigo-600'}`}><CalendarCheck className="w-4 h-4" /> {item.nextReplacementDate ? item.nextReplacementDate.toLocaleDateString('fr-FR') : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`text-lg font-black ${item.status === 'RED' ? 'text-red-600' : 'text-gray-900'}`}>{item.estimatedHours} h</div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-gray-500">{item.daysElapsed}j</td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                      <div className={`h-full transition-all duration-500 ${item.status === 'RED' ? 'bg-red-500' : item.status === 'ORANGE' ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min((item.daysElapsed / EXPIRATION_THRESHOLD_DAYS) * 100, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] font-black text-gray-400 uppercase">
                       <span>Neuve</span>
                       <span>Limite (1000h)</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">Aucune donnée de remplacement de courroie trouvée ou ne correspond aux filtres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
