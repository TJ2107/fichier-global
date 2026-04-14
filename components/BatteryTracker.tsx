
import React, { useMemo, useState } from 'react';
import { GlobalFileRow } from '../types';
import { Battery, AlertCircle, CheckCircle2, Search, Filter, Calendar, MapPin, History, ArrowRight, Download, CalendarCheck, X, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BatteryTrackerProps {
  data: GlobalFileRow[];
}

interface SiteBatteryStatus {
  siteName: string;
  region: string;
  lastReplacementDate: Date | null;
  nextReplacementDate: Date | null;
  monthsElapsed: number;
  status: 'RED' | 'ORANGE' | 'GREEN';
  lastSWO: string;
}

// Règle métier : 7 mois
const EXPIRATION_THRESHOLD_MONTHS = 7;
const WARNING_THRESHOLD_MONTHS = 6;

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

const getMonthsDifference = (startDate: Date, endDate: Date) => {
  return (
    endDate.getMonth() -
    startDate.getMonth() +
    12 * (endDate.getFullYear() - startDate.getFullYear())
  );
};

export const BatteryTracker: React.FC<BatteryTrackerProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'RED' | 'ORANGE' | 'GREEN'>('ALL');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const batteryData = useMemo(() => {
    const sitesMap: Record<string, GlobalFileRow[]> = {};
    const now = new Date();

    // 1. Filtrer et regrouper par site les mentions de remplacement batterie GE
    data.forEach(row => {
      const desc = String(row["Description"] || "").toLowerCase();
      const site = String(row["Nom du site"] || "Inconnu");
      
      if (desc.includes("remplacement batterie ge")) {
        if (!sitesMap[site]) sitesMap[site] = [];
        sitesMap[site].push(row);
      }
    });

    // 2. Calculer le statut pour chaque site
    const results: SiteBatteryStatus[] = Object.entries(sitesMap).map(([siteName, rows]) => {
      // Trouver la date de clôture la plus récente
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

      let monthsElapsed = 0;
      let status: 'RED' | 'ORANGE' | 'GREEN' = 'GREEN';
      let nextReplacementDate: Date | null = null;

      if (latestDate) {
        monthsElapsed = getMonthsDifference(latestDate, now);
        if (monthsElapsed >= EXPIRATION_THRESHOLD_MONTHS) status = 'RED';
        else if (monthsElapsed >= WARNING_THRESHOLD_MONTHS) status = 'ORANGE';
        else status = 'GREEN';

        // Calculer la prochaine échéance (+ 7 mois)
        nextReplacementDate = new Date(latestDate);
        nextReplacementDate.setMonth(nextReplacementDate.getMonth() + EXPIRATION_THRESHOLD_MONTHS);
      }

      return {
        siteName,
        region,
        lastReplacementDate: latestDate,
        nextReplacementDate,
        monthsElapsed,
        status,
        lastSWO
      };
    });

    // On ne garde que les sites ayant une date de remplacement valide (clôturée)
    return results
      .filter(r => r.lastReplacementDate !== null)
      .sort((a, b) => b.monthsElapsed - a.monthsElapsed);
  }, [data]);

  const filteredResults = useMemo(() => {
    return batteryData.filter(item => {
      // Filtre Recherche
      const matchesSearch = item.siteName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.region.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtre Statut
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;

      // Filtre Période
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
      } else if (dateRange.start || dateRange.end) {
        matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [batteryData, searchTerm, filterStatus, dateRange]);

  const stats = useMemo(() => {
    return {
      total: batteryData.length,
      red: batteryData.filter(d => d.status === 'RED').length,
      orange: batteryData.filter(d => d.status === 'ORANGE').length,
      green: batteryData.filter(d => d.status === 'GREEN').length,
    };
  }, [batteryData]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setDateRange({ start: '', end: '' });
  };

  const exportToExcel = () => {
    const exportData = filteredResults.map(item => ({
      "Statut": item.status === 'RED' ? 'EXPIRÉ' : item.status === 'ORANGE' ? 'À PRÉVOIR' : 'CONFORME',
      "Nom du site": item.siteName,
      "Région": item.region,
      "Dernier Remplacement": item.lastReplacementDate ? item.lastReplacementDate.toLocaleDateString('fr-FR') : 'Inconnu',
      "Prochaine Échéance": item.nextReplacementDate ? item.nextReplacementDate.toLocaleDateString('fr-FR') : 'N/A',
      "Âge Batterie (Mois)": item.monthsElapsed,
      "Dernier SWO": item.lastSWO
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suivi Batteries");
    XLSX.writeFile(wb, `SUIVI_BATTERIES_GE_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Battery className="w-8 h-8 text-indigo-600" />
            DG Battery Tracker
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Suivi périodique des batteries GE (Règle : Remplacement tous les {EXPIRATION_THRESHOLD_MONTHS} mois).
          </p>
        </div>
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
        >
          <Download className="w-5 h-5" />
          Exporter l'analyse
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Batteries Suivies</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-xs font-bold text-red-400 uppercase">Expirées (&gt;7 mois)</p>
          <h3 className="text-3xl font-black text-red-600 mt-1">{stats.red}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-xs font-bold text-orange-400 uppercase">À prévoir (6-7 mois)</p>
          <h3 className="text-3xl font-black text-orange-600 mt-1">{stats.orange}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-xs font-bold text-green-400 uppercase">Conformes (&lt;6 mois)</p>
          <h3 className="text-3xl font-black text-green-600 mt-1">{stats.green}</h3>
        </div>
      </div>

      {/* Toolbar Multi-Filtres */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 items-end">
          {/* Recherche */}
          <div className="flex-1 w-full flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
              <Search className="w-3 h-3" /> Recherche
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Site ou région..." 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Période de Remplacement */}
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Période de dernier remplacement
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
              {(dateRange.start || dateRange.end) && (
                <button onClick={() => setDateRange({ start: '', end: '' })} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Buttons */}
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> État
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterStatus('ALL')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${filterStatus === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Tous
              </button>
              <button 
                onClick={() => setFilterStatus('RED')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${filterStatus === 'RED' ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                Expirées
              </button>
              <button 
                onClick={() => setFilterStatus('ORANGE')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${filterStatus === 'ORANGE' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
              >
                À prévoir
              </button>
            </div>
          </div>

          <button 
            onClick={resetFilters}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-colors border border-gray-200"
            title="Réinitialiser tous les filtres"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Région</th>
                <th className="px-6 py-4">Dernier Remplacement</th>
                <th className="px-6 py-4">Prochaine Échéance</th>
                <th className="px-6 py-4 text-center">Âge</th>
                <th className="px-6 py-4">Dernier SWO</th>
                <th className="px-6 py-4">Progression (7 mois)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {item.status === 'RED' && <span className="flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-full w-fit"><AlertCircle className="w-3.5 h-3.5" /> EXPIRÉ</span>}
                    {item.status === 'ORANGE' && <span className="flex items-center gap-1.5 text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded-full w-fit"><History className="w-3.5 h-3.5" /> À PRÉVOIR</span>}
                    {item.status === 'GREEN' && <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> CONFORME</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-gray-400" />
                       {item.siteName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-medium">{item.region}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-bold">
                       <Calendar className="w-4 h-4 text-gray-400" />
                       {item.lastReplacementDate ? item.lastReplacementDate.toLocaleDateString('fr-FR') : 'Inconnu'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 text-sm font-bold ${item.status === 'RED' ? 'text-red-600' : 'text-indigo-600'}`}>
                       <CalendarCheck className="w-4 h-4" />
                       {item.nextReplacementDate ? item.nextReplacementDate.toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-black ${item.status === 'RED' ? 'text-red-600' : item.status === 'ORANGE' ? 'text-orange-500' : 'text-green-600'}`}>
                      {item.monthsElapsed}
                    </span>
                    <span className="text-gray-400 text-[10px] ml-1 uppercase font-bold">Mois</span>
                  </td>
                  <td className="px-6 py-4">
                     <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.lastSWO}</span>
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-500 ${item.status === 'RED' ? 'bg-red-500' : item.status === 'ORANGE' ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((item.monthsElapsed / EXPIRATION_THRESHOLD_MONTHS) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                       <span>Neuve</span>
                       <span>Limite (7m)</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 italic">
                    Aucun résultat correspondant aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
