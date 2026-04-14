import React, { useMemo, useState, useRef } from 'react';
import { GlobalFileRow } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie, LabelList, ComposedChart, Line, Area 
} from 'recharts';
import { Clock, CheckCircle, AlertTriangle, Timer, Filter, Calendar, X, RotateCcw, CheckSquare, TrendingUp, List, XCircle, Camera } from 'lucide-react';
import { downloadChartAsJpg } from '../utils/chartHelpers';

interface TTFAnalysisProps {
  data: GlobalFileRow[];
}

// Configuration des SLA en heures
const SLA_CONFIG: Record<string, number> = {
  'P0': 24,
  'P1': 72,
  'P2': 168, // 7 jours * 24h
  'P3': 720, // 30 jours * 24h
  'P4': Infinity // Indéfini
};

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3', 'P4'];

// Couleurs pour les graphiques
const COLORS = {
  met: '#22c55e', // Green
  missed: '#ef4444', // Red
  undefined: '#9ca3af' // Grey
};

// Helper pour parser les dates (Copie locale pour isolation)
const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

// Helper pour formater la date en dd/MM/yyyy HH:mm
const formatDateTime = (val: any): string => {
  const d = parseDate(val);
  if (!d) return typeof val === 'string' ? val : '';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper pour normaliser la priorité
const getPriorityKey = (row: GlobalFileRow): string => {
  const rawPrio = String(row["Priorité"] || "").toUpperCase();
  if (rawPrio.includes('0') || rawPrio.includes('P0')) return 'P0';
  if (rawPrio.includes('1') || rawPrio.includes('P1')) return 'P1';
  if (rawPrio.includes('2') || rawPrio.includes('P2')) return 'P2';
  if (rawPrio.includes('3') || rawPrio.includes('P3')) return 'P3';
  if (rawPrio.includes('4') || rawPrio.includes('P4')) return 'P4';
  return 'Autre';
};

export const TTFAnalysis: React.FC<TTFAnalysisProps> = ({ data }) => {
  // Filtres State
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(PRIORITY_OPTIONS);
  const [creationDateFilter, setCreationDateFilter] = useState<{start: string, end: string}>({start: '', end: ''});
  const [closingDateFilter, setClosingDateFilter] = useState<{start: string, end: string}>({start: '', end: ''});
  const [backlogOnly, setBacklogOnly] = useState(false);

  // Drill-down Modal State
  const [drillDownData, setDrillDownData] = useState<any[] | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState<string>("");

  // Refs for export
  const priorityChartRef = useRef<HTMLDivElement>(null);
  const durationChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  const togglePriority = (p: string) => {
    setSelectedPriorities(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const resetFilters = () => {
    setSelectedPriorities(PRIORITY_OPTIONS);
    setCreationDateFilter({start: '', end: ''});
    setClosingDateFilter({start: '', end: ''});
    setBacklogOnly(false);
  };

  // --- LOGIQUE DE FILTRAGE COMMUNE ---
  // Cette fonction est utilisée par le useMemo principal ET par le drill-down
  // pour s'assurer que les données affichées dans la modale respectent les filtres globaux.
  const isRowVisible = (row: GlobalFileRow, priorityKey: string, startDate: Date | null, endDate: Date | null) => {
      // Filtre Priorité
      if (!selectedPriorities.includes(priorityKey)) return false;

      // Filtre Période de Création
      if (startDate) {
        const checkCreation = new Date(startDate);
        checkCreation.setHours(0,0,0,0);
        if (creationDateFilter.start && checkCreation < new Date(creationDateFilter.start)) return false;
        if (creationDateFilter.end && checkCreation > new Date(creationDateFilter.end)) return false;
      } else if (creationDateFilter.start || creationDateFilter.end) {
        return false;
      }

      // Filtre Période de Clôture
      if (endDate) {
        const checkClosing = new Date(endDate);
        checkClosing.setHours(0,0,0,0);
        if (closingDateFilter.start && checkClosing < new Date(closingDateFilter.start)) return false;
        if (closingDateFilter.end && checkClosing > new Date(closingDateFilter.end)) return false;
      } else if (closingDateFilter.start || closingDateFilter.end) {
        return false;
      }

      // Filtre Backlog
      if (backlogOnly) {
        if (closingDateFilter.start && startDate) {
          const closingPeriodStart = new Date(closingDateFilter.start);
          closingPeriodStart.setHours(0,0,0,0);
          const checkCreation = new Date(startDate);
          checkCreation.setHours(0,0,0,0);
          if (checkCreation >= closingPeriodStart) return false;
        }
      }
      return true;
  };

  // Calcul des données analytiques
  const analysis = useMemo(() => {
    let totalAnalyzed = 0;
    let totalMet = 0;
    let totalMissed = 0;

    const rowsWithCalculation: any[] = [];
    const statsByPriority: Record<string, { priority: string, met: number, missed: number, totalDuration: number, count: number, target: number }> = {};
    const statsByMonth: Map<string, { dateObj: number, total: number, met: number, duration: number, year: number, month: number }> = new Map();

    PRIORITY_OPTIONS.forEach(p => {
      statsByPriority[p] = { priority: p, met: 0, missed: 0, totalDuration: 0, count: 0, target: SLA_CONFIG[p] };
    });

    data.forEach(row => {
      const priorityKey = getPriorityKey(row);
      const startDate = parseDate(row["Date de création du SWO"]);
      const endDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);

      if (!isRowVisible(row, priorityKey, startDate, endDate)) return;

      if (startDate && endDate && SLA_CONFIG[priorityKey] !== undefined) {
        const diffMs = endDate.getTime() - startDate.getTime();
        const durationHours = diffMs / (1000 * 60 * 60);

        if (durationHours >= 0) { 
          const targetHours = SLA_CONFIG[priorityKey];
          const isMet = durationHours <= targetHours;

          totalAnalyzed++;
          if (isMet) totalMet++;
          else totalMissed++;

          // Stats par Priorité
          statsByPriority[priorityKey].count++;
          statsByPriority[priorityKey].totalDuration += durationHours;
          if (isMet) statsByPriority[priorityKey].met++;
          else statsByPriority[priorityKey].missed++;

          // Stats par Mois
          const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
          if (!statsByMonth.has(monthKey)) {
             statsByMonth.set(monthKey, { 
               dateObj: new Date(endDate.getFullYear(), endDate.getMonth(), 1).getTime(),
               year: endDate.getFullYear(),
               month: endDate.getMonth(), // 0-indexed
               total: 0, met: 0, duration: 0 
             });
          }
          const monthEntry = statsByMonth.get(monthKey)!;
          monthEntry.total++;
          monthEntry.duration += durationHours;
          if (isMet) monthEntry.met++;

          const rowData = {
               ...row,
               calculatedDuration: durationHours,
               calculatedTarget: targetHours,
               calculatedPriority: priorityKey,
               overrun: durationHours - targetHours,
               isMet
          };

          // Top Offenders (uniquement ceux en retard)
          if (!isMet && priorityKey !== 'P4') {
             rowsWithCalculation.push(rowData);
          }
        }
      }
    });

    const chartData = Object.values(statsByPriority)
      .filter(s => s.count > 0)
      .map(s => ({
        name: s.priority,
        Respecté: s.met,
        "Non Respecté": s.missed,
        avgDuration: s.count > 0 ? (s.totalDuration / s.count).toFixed(1) : 0,
        target: s.target === Infinity ? "∞" : s.target
      }));

    const trendData = Array.from(statsByMonth.values())
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(entry => ({
        name: new Date(entry.dateObj).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        "Taux Respect SLA (%)": parseFloat(((entry.met / entry.total) * 100).toFixed(1)),
        "TTF Moyen (h)": parseFloat((entry.duration / entry.total).toFixed(1)),
        "Volume": entry.total,
        year: entry.year,
        month: entry.month
      }));

    const topOffenders = rowsWithCalculation.sort((a, b) => b.overrun - a.overrun).slice(0, 50);

    return {
      totalAnalyzed,
      totalMet,
      totalMissed,
      globalAdherence: totalAnalyzed > 0 ? ((totalMet / totalAnalyzed) * 100).toFixed(1) : 0,
      chartData,
      trendData,
      topOffenders
    };
  }, [data, selectedPriorities, creationDateFilter, closingDateFilter, backlogOnly]);

  // --- HANDLERS CLIC GRAPHIQUES ---

  const handlePriorityChartClick = (chartData: any) => {
    if (!chartData || !chartData.activePayload || !chartData.activePayload.length) return;
    
    const priorityName = chartData.activePayload[0].payload.name;
    const clickedBarKey = chartData.activeTooltipIndex !== undefined ? null : null; // Recharts logic specific

    // Filtrer les données pour cette priorité
    const details = data.filter(row => {
       const priorityKey = getPriorityKey(row);
       if (priorityKey !== priorityName) return false;

       const startDate = parseDate(row["Date de création du SWO"]);
       const endDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
       if (!startDate || !endDate) return false; // Doit être valide pour TTF

       return isRowVisible(row, priorityKey, startDate, endDate);
    }).map(row => {
       const startDate = parseDate(row["Date de création du SWO"])!;
       const endDate = (parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]))!;
       const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
       const target = SLA_CONFIG[priorityName] || 0;
       return {
          ...row,
          calculatedDuration: duration,
          calculatedTarget: target,
          calculatedPriority: priorityName,
          overrun: duration - target,
          isMet: duration <= target
       };
    });

    setDrillDownData(details);
    setDrillDownTitle(`Détails pour la Priorité ${priorityName}`);
  };

  const handleTrendChartClick = (chartData: any) => {
    if (!chartData || !chartData.activePayload || !chartData.activePayload.length) return;
    
    const payload = chartData.activePayload[0].payload;
    const { year, month, name } = payload; // Récupéré de trendData

    // Filtrer les données pour ce mois spécifique
    const details = data.filter(row => {
       const priorityKey = getPriorityKey(row);
       const startDate = parseDate(row["Date de création du SWO"]);
       const endDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
       
       if (!startDate || !endDate) return false;
       
       // Vérifier si le mois correspond
       if (endDate.getFullYear() !== year || endDate.getMonth() !== month) return false;

       return isRowVisible(row, priorityKey, startDate, endDate);
    }).map(row => {
       const priorityKey = getPriorityKey(row);
       const startDate = parseDate(row["Date de création du SWO"])!;
       const endDate = (parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]))!;
       const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
       const target = SLA_CONFIG[priorityKey] || 0;
       return {
          ...row,
          calculatedDuration: duration,
          calculatedTarget: target,
          calculatedPriority: priorityKey,
          overrun: duration - target,
          isMet: duration <= target
       };
    });

    setDrillDownData(details);
    setDrillDownTitle(`Détails pour ${name}`);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-full relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Timer className="w-8 h-8 text-indigo-600" />
             TTF Status & SOP Adhérence
           </h2>
           <p className="text-gray-500 text-sm mt-1">
             Analyse des délais SLA : P0(24h), P1(72h), P2(7j), P3(30j).
           </p>
        </div>
      </div>

      {/* Barre de Filtres Complète */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center flex-wrap">
          {/* 1. Filtre Priorité */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> Priorités
            </span>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                    selectedPriorities.includes(p)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden lg:block"></div>

          {/* 2. Filtre Date Création */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Création SWO
            </span>
            <div className="flex items-center gap-2">
              <input 
                type="date"
                className="border border-gray-600 bg-gray-700 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder-gray-400"
                value={creationDateFilter.start}
                onChange={(e) => setCreationDateFilter(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-gray-400">-</span>
               <input 
                type="date"
                className="border border-gray-600 bg-gray-700 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder-gray-400"
                value={creationDateFilter.end}
                onChange={(e) => setCreationDateFilter(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden lg:block"></div>

           {/* 3. Filtre Date Clôture */}
           <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Date Clôture
            </span>
            <div className="flex items-center gap-2">
              <input 
                type="date"
                className="border border-gray-600 bg-gray-700 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder-gray-400"
                value={closingDateFilter.start}
                onChange={(e) => setClosingDateFilter(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-gray-400">-</span>
               <input 
                type="date"
                className="border border-gray-600 bg-gray-700 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder-gray-400"
                value={closingDateFilter.end}
                onChange={(e) => setClosingDateFilter(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          {/* 4. Option Backlog */}
          <div className="flex flex-col gap-2 justify-end h-full pt-6 lg:pt-0">
             <label className={`flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer transition-colors select-none ${backlogOnly ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  checked={backlogOnly}
                  onChange={(e) => setBacklogOnly(e.target.checked)}
                  disabled={!closingDateFilter.start} // Nécessite une date de début pour comparaison
                />
                <span className="text-sm font-medium">Backlog uniquement</span>
             </label>
             {backlogOnly && !closingDateFilter.start && (
                <span className="text-[10px] text-red-500">Sélectionnez une date de début de clôture</span>
             )}
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-3">
          <button 
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser tous les filtres
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase">Total Dossiers Analysés</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{analysis.totalAnalyzed}</h3>
              <p className="text-xs text-gray-400 mt-1">Sur la sélection actuelle</p>
            </div>
            <Clock className="w-8 h-8 text-indigo-100" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase">SLA Respectés</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-bold text-green-600">{analysis.totalMet}</h3>
                <span className="text-sm font-semibold text-green-600">({analysis.globalAdherence}%)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Dossiers conformes</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-100" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase">SLA Non Respectés</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-bold text-red-600">{analysis.totalMissed}</h3>
                <span className="text-sm font-semibold text-red-600">({(100 - Number(analysis.globalAdherence)).toFixed(1)}%)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Hors délais (sauf P4)</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-100" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: SLA Adherence by Priority (Stacked Bar) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col relative group">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-700">Respect des délais par Priorité</h3>
                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Cliquez pour le détail</span>
             </div>
             <button 
                onClick={() => downloadChartAsJpg(priorityChartRef, 'respect_sla_priorite')}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors"
                title="Exporter en JPG"
             >
                <Camera className="w-5 h-5" />
             </button>
          </div>
          <div className="flex-1 min-h-0 w-full relative" ref={priorityChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={analysis.chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={handlePriorityChartClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.1)'}} />
                <Legend />
                <Bar dataKey="Respecté" stackId="a" fill={COLORS.met} />
                <Bar dataKey="Non Respecté" stackId="a" fill={COLORS.missed} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Duration vs Target */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col relative group">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-700">Temps Moyen de Résolution (Heures)</h3>
                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Cliquez pour le détail</span>
            </div>
            <button 
                onClick={() => downloadChartAsJpg(durationChartRef, 'temps_moyen_resolution')}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors"
                title="Exporter en JPG"
             >
                <Camera className="w-5 h-5" />
             </button>
          </div>
          <div className="flex-1 min-h-0 w-full relative" ref={durationChartRef}>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={analysis.chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={handlePriorityChartClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Heures', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.1)'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border shadow-lg rounded text-sm">
                          <p className="font-bold">{data.name}</p>
                          <p className="text-blue-600">Moyenne: {data.avgDuration} h</p>
                          <p className="text-gray-500">Cible: {data.target} h</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="avgDuration" name="Moyenne Réalisée" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                   <LabelList dataKey="avgDuration" position="top" fontSize={12} formatter={(val: any) => `${val}h`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Evolution Temporelle (Trend) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px] flex flex-col relative group">
         <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Évolution Temporelle de la Performance
                </h3>
                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Cliquez sur un point pour le détail</span>
            </div>
            <button 
                onClick={() => downloadChartAsJpg(trendChartRef, 'evolution_performance_ttf')}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-indigo-600 transition-colors"
                title="Exporter en JPG"
             >
                <Camera className="w-5 h-5" />
             </button>
         </div>
         <div className="flex-1 min-h-0 w-full relative" ref={trendChartRef}>
            <ResponsiveContainer width="100%" height="100%">
               <ComposedChart 
                  data={analysis.trendData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  onClick={handleTrendChartClick}
                  className="cursor-pointer"
               >
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" padding={{ left: 20, right: 20 }} />
                 {/* Left Axis for Volume */}
                 <YAxis yAxisId="left" orientation="left" stroke="#94a3b8" label={{ value: 'Volume', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} />
                 {/* Right Axis for SLA % and Hours */}
                 <YAxis yAxisId="right" orientation="right" stroke="#6366f1" label={{ value: '% / Heures', angle: 90, position: 'insideRight', fill: '#6366f1', fontSize: 12 }} />
                 
                 <Tooltip />
                 <Legend />
                 
                 <Bar yAxisId="left" dataKey="Volume" fill="#e2e8f0" barSize={30} radius={[4, 4, 0, 0]} />
                 <Line yAxisId="right" type="monotone" dataKey="Taux Respect SLA (%)" stroke="#22c55e" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                 <Line yAxisId="right" type="monotone" dataKey="TTF Moyen (h)" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
               </ComposedChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Table: Top Offenders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Dossiers Hors Délais (Top 50 par dépassement)</h3>
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full font-medium">Priorité P4 exclue</span>
        </div>
        <div className="overflow-auto max-h-[500px]">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border">ID</th>
                <th className="px-4 py-3 border">N° SWO</th>
                <th className="px-4 py-3 border">Site / Région</th>
                <th className="px-4 py-3 border text-center">Priorité</th>
                <th className="px-4 py-3 border text-center">Date Création</th>
                <th className="px-4 py-3 border text-center">Date Clôture</th>
                <th className="px-4 py-3 border text-center bg-blue-50">Durée Réelle</th>
                <th className="px-4 py-3 border text-center bg-gray-50">Objectif</th>
                <th className="px-4 py-3 border text-center bg-red-50">Dépassement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analysis.topOffenders.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-bold text-xs text-black">
                    {row["ID"]}
                  </td>
                  <td className="px-4 py-2 border font-bold text-xs text-black">
                    {row["N° SWO"]}
                  </td>
                  <td className="px-4 py-2 border">
                    <div className="font-medium text-gray-900">{row["Nom du site"]}</div>
                    <div className="text-xs text-gray-500">{row["Region"]}</div>
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{row.calculatedPriority}</span>
                  </td>
                  <td className="px-4 py-2 border text-center text-gray-600 text-xs">
                     {formatDateTime(row["Date de création du SWO"])}
                  </td>
                  <td className="px-4 py-2 border text-center text-gray-600 text-xs">
                     {formatDateTime(row["Closing date"] || row["Date de Clôture"])}
                  </td>
                  <td className="px-4 py-2 border text-center font-bold text-blue-700 bg-blue-50">
                    {row.calculatedDuration.toFixed(1)} h
                  </td>
                  <td className="px-4 py-2 border text-center text-gray-500 bg-gray-50">
                    {row.calculatedTarget} h
                  </td>
                  <td className="px-4 py-2 border text-center font-bold text-red-600 bg-red-50">
                    +{row.overrun.toFixed(1)} h
                  </td>
                </tr>
              ))}
              {analysis.topOffenders.length === 0 && (
                 <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Excellent ! Aucun dépassement de SLA détecté pour cette sélection.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DRILL-DOWN */}
      {drillDownData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-in zoom-in-95">
             <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
               <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{drillDownTitle}</h3>
                    <p className="text-sm text-gray-500">{drillDownData.length} dossier(s) trouvé(s)</p>
                  </div>
               </div>
               <button onClick={() => setDrillDownData(null)} className="text-gray-400 hover:text-red-500 transition">
                  <XCircle className="w-8 h-8" />
               </button>
             </div>
             
             <div className="flex-1 overflow-auto p-4">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 border">Statut</th>
                      <th className="px-4 py-3 border">ID</th>
                      <th className="px-4 py-3 border">N° SWO</th>
                      <th className="px-4 py-3 border">Site / Région</th>
                      <th className="px-4 py-3 border text-center">Priorité</th>
                      <th className="px-4 py-3 border text-center">Date Création</th>
                      <th className="px-4 py-3 border text-center">Date Clôture</th>
                      <th className="px-4 py-3 border text-center">TTF (h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {drillDownData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border text-center">
                          {row.isMet ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
                               <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          ) : (
                             <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold">
                               <AlertTriangle className="w-3 h-3" /> KO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 border font-bold text-xs text-black">{row["ID"]}</td>
                        <td className="px-4 py-2 border font-bold text-xs text-black">{row["N° SWO"]}</td>
                        <td className="px-4 py-2 border">
                           <div className="font-medium text-gray-900">{row["Nom du site"]}</div>
                           <div className="text-xs text-gray-500">{row["Region"]}</div>
                        </td>
                        <td className="px-4 py-2 border text-center">
                           <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{row.calculatedPriority}</span>
                        </td>
                        <td className="px-4 py-2 border text-center text-gray-600 text-xs">{formatDateTime(row["Date de création du SWO"])}</td>
                        <td className="px-4 py-2 border text-center text-gray-600 text-xs">{formatDateTime(row["Closing date"] || row["Date de Clôture"])}</td>
                        <td className="px-4 py-2 border text-center font-bold text-blue-700 bg-blue-50">
                           {row.calculatedDuration.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button onClick={() => setDrillDownData(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium">
                  Fermer
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};