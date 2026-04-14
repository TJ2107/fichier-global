import React, { useMemo, useRef, useState } from 'react';
import { GlobalFileRow, XStatus } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, LabelList 
} from 'recharts';
import { Briefcase, TrendingUp, AlertCircle, CheckCircle2, Camera, Calendar, RefreshCw, List, X } from 'lucide-react';
import { downloadChartAsJpg } from '../utils/chartHelpers';

interface GMSheetProps {
  data: GlobalFileRow[];
}

const COLORS = {
  created: '#3b82f6',
  closed: '#22c55e',
  backlog: '#ef4444',
  pending: '#f59e0b',
  rattrapage: '#8b5cf6',
  tvx: '#d1d5db', // Gris clair
  spa: '#3b82f6', // Bleu
  atv: '#eab308', // Jaune
  htc: '#f97316'  // Orange
};

// Mappe les noms de catégories utilisés dans stats.pendingXData vers les couleurs spécifiques
const PENDING_X_COLORS: Record<string, string> = {
  "STHIC TRAVAUX EN COURS": COLORS.tvx,
  "STHIC SPA": COLORS.spa,
  "STHIC ATTENTE VALIDATION HTC": COLORS.atv,
  "HTC DIVERS": COLORS.htc
};

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const formatDateShort = (val: any): string => {
  const d = parseDate(val);
  return d ? d.toLocaleDateString('fr-FR') : '-';
};

export const GMSheet: React.FC<GMSheetProps> = ({ data }) => {
  const flowChartRef = useRef<HTMLDivElement>(null);
  const efficiencyChartRef = useRef<HTMLDivElement>(null);
  const pendingChartRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<{start: string, end: string}>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: formatDate(start), end: formatDate(end) };
  });

  const [drillDownData, setDrillDownData] = useState<GlobalFileRow[] | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState("");

  const stats = useMemo(() => {
    let createdCount = 0;
    let closedCount = 0;
    let historicalStock = 0; 
    let processedBacklogCount = 0;

    let statusXCounts = { "STHIC TRAVAUX EN COURS": 0, "STHIC SPA": 0, "STHIC ATTENTE VALIDATION HTC": 0, "HTC DIVERS": 0 };
    let pendingRegionCounts: Record<string, number> = {};

    const startDate = period.start ? new Date(period.start) : null;
    const endDate = period.end ? new Date(period.end) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);

    data.forEach(row => {
      const creationDate = parseDate(row["Date de création du SWO"]);
      const closingDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      const xStatus = String(row["X"] || "");

      if (creationDate && startDate && endDate) {
        if (creationDate >= startDate && creationDate <= endDate) createdCount++;
      }

      if (closingDate && startDate && endDate) {
        if (closingDate >= startDate && closingDate <= endDate) {
          closedCount++;
          if (creationDate && creationDate < startDate) processedBacklogCount++;
        }
      }

      if (creationDate && startDate && endDate) {
         const isCreatedDuringPeriod = creationDate >= startDate && creationDate <= endDate;
         const isOpenAtEnd = !closingDate || closingDate > endDate;
         if (isCreatedDuringPeriod && isOpenAtEnd) {
             historicalStock++;
             if (xStatus === XStatus.TVX_STHIC) statusXCounts["STHIC TRAVAUX EN COURS"]++;
             else if (xStatus === XStatus.STHIC_SPA) statusXCounts["STHIC SPA"]++;
             else if (xStatus === XStatus.STHIC_ATV_HTC) statusXCounts["STHIC ATTENTE VALIDATION HTC"]++;
             else if (xStatus === XStatus.HTC) statusXCounts["HTC DIVERS"]++;
             const region = String(row["Region"] || "Non défini");
             pendingRegionCounts[region] = (pendingRegionCounts[region] || 0) + 1;
         }
      }
    });

    const flowData = [ { name: 'Créés', value: createdCount, fill: COLORS.created }, { name: 'Fermés', value: closedCount, fill: COLORS.closed } ];
    const efficiencyData = [ { name: 'Total Fermés', value: closedCount, fill: COLORS.closed }, { name: 'Dont Rattrapage', value: processedBacklogCount, fill: COLORS.rattrapage }, { name: 'Stock Restant', value: historicalStock, fill: COLORS.pending } ];
    const pendingXData = Object.entries(statusXCounts).filter(([_, val]) => val > 0).map(([key, val]) => ({ name: key, value: val }));

    return { flowData, efficiencyData, pendingXData, totals: { createdCount, closedCount, historicalStock, processedBacklogCount } };
  }, [data, period]);

  const handleDrillDown = (entry: any, chartType: string) => {
    if (!entry) return;
    const { name } = entry;
    const startDate = period.start ? new Date(period.start) : null;
    const endDate = period.end ? new Date(period.end) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);

    const filtered = data.filter(row => {
      const creationDate = parseDate(row["Date de création du SWO"]);
      const closingDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      const xStatus = String(row["X"] || "");

      if (chartType === 'FLOW') {
         if (name === 'Créés') return creationDate && startDate && endDate && creationDate >= startDate && creationDate <= endDate;
         if (name === 'Fermés') return closingDate && startDate && endDate && closingDate >= startDate && closingDate <= endDate;
      }
      if (chartType === 'EFFICIENCY') {
         if (name === 'Total Fermés') return closingDate && startDate && endDate && closingDate >= startDate && closingDate <= endDate;
         if (name === 'Dont Rattrapage') return closingDate && startDate && endDate && creationDate && closingDate >= startDate && closingDate <= endDate && creationDate < startDate;
         if (name === 'Stock Restant') {
            const isCreatedDuringPeriod = creationDate && startDate && endDate && creationDate >= startDate && creationDate <= endDate;
            const isOpenAtEnd = !closingDate || (endDate && closingDate > endDate);
            return isCreatedDuringPeriod && isOpenAtEnd;
         }
      }
      if (chartType === 'PENDING_X') {
         const isCreatedDuringPeriod = creationDate && startDate && endDate && creationDate >= startDate && creationDate <= endDate;
         const isOpenAtEnd = !closingDate || (endDate && closingDate > endDate);
         if (!isCreatedDuringPeriod || !isOpenAtEnd) return false;
         
         let targetX = "";
         if (name === "STHIC TRAVAUX EN COURS") targetX = XStatus.TVX_STHIC;
         else if (name === "STHIC SPA") targetX = XStatus.STHIC_SPA;
         else if (name === "STHIC ATTENTE VALIDATION HTC") targetX = XStatus.STHIC_ATV_HTC;
         else if (name === "HTC DIVERS") targetX = XStatus.HTC;
         return xStatus === targetX;
      }
      return false;
    });

    setDrillDownData(filtered);
    setDrillDownTitle(`${name} (${formatDateShort(startDate)} au ${formatDateShort(endDate)})`);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Briefcase className="w-8 h-8 text-indigo-600" /> GM Sheet - Rapport</h2>
           <p className="text-gray-500 text-sm mt-1">Analyse des flux et stock restant de la période (créés dans l'intervalle).</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border">
           <Calendar className="w-4 h-4 text-indigo-500" />
           <input type="date" className="border rounded px-2 py-1 text-sm outline-none" value={period.start} onChange={(e) => setPeriod(prev => ({ ...prev, start: e.target.value }))} />
           <span className="text-gray-400">-</span>
           <input type="date" className="border rounded px-2 py-1 text-sm outline-none" value={period.end} onChange={(e) => setPeriod(prev => ({ ...prev, end: e.target.value }))} />
           <button onClick={() => setPeriod({ start: '2025-01-01', end: '2025-01-31' })} className="p-1.5 hover:bg-indigo-50 rounded transition-colors"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 uppercase font-bold">Nouveaux SWO</p>
            <h3 className="text-3xl font-bold text-blue-600">{stats.totals.createdCount}</h3>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Fermés</p>
            <h3 className="text-3xl font-bold text-green-600">{stats.totals.closedCount}</h3>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-xs text-gray-500 uppercase font-bold">Rattrapage Backlog</p>
            <h3 className="text-3xl font-bold text-red-600">{stats.totals.processedBacklogCount}</h3>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border h-96 flex flex-col group">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-gray-700">Flux : Créés vs Fermés</h3>
             <button onClick={() => downloadChartAsJpg(flowChartRef, 'flux_periode')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Camera className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 w-full relative" ref={flowChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.flowData} barSize={60} onClick={(data) => data && handleDrillDown(data.activePayload?.[0]?.payload, 'FLOW')} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="value" position="top" fill="#374151" fontWeight="bold" />
                   {stats.flowData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border h-96 flex flex-col group">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-gray-700">Performance & Stock Restant</h3>
             <button onClick={() => downloadChartAsJpg(efficiencyChartRef, 'performance')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Camera className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 w-full relative" ref={efficiencyChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.efficiencyData} barSize={60} onClick={(data) => data && handleDrillDown(data.activePayload?.[0]?.payload, 'EFFICIENCY')} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="value" position="top" fill="#374151" fontWeight="bold" />
                   {stats.efficiencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border h-96 flex flex-col group">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Stock Restant par Statut (Créés dans la période)</h3>
        <div className="flex-1 w-full relative" ref={pendingChartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.pendingXData} layout="vertical" onClick={(data) => data && handleDrillDown(data.activePayload?.[0]?.payload, 'PENDING_X')} className="cursor-pointer">
              <XAxis type="number" /><YAxis dataKey="name" type="category" width={220} fontSize={11} /><Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                 {stats.pendingXData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PENDING_X_COLORS[entry.name] || COLORS.tvx} />
                 ))}
                 <LabelList dataKey="value" position="right" fontWeight="bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {drillDownData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
             <div className="flex justify-between items-center p-4 border-b">
               <h3 className="text-lg font-bold">{drillDownTitle}</h3>
               <button onClick={() => setDrillDownData(null)}><X className="w-8 h-8" /></button>
             </div>
             <div className="flex-1 overflow-auto p-4">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100">
                    <tr><th className="p-2 border">ID</th><th className="p-2 border">N° SWO</th><th className="p-2 border">Site</th><th className="p-2 border">Date Création</th><th className="p-2 border">État</th><th className="p-2 border">Statut X</th></tr>
                  </thead>
                  <tbody>
                    {drillDownData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2 border">{row["ID"]}</td><td className="p-2 border">{row["N° SWO"]}</td><td className="p-2 border">{row["Nom du site"]}</td><td className="p-2 border">{formatDateShort(row["Date de création du SWO"])}</td><td className="p-2 border">{row["State SWO"]}</td><td className="p-2 border font-bold text-xs">{row["X"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};