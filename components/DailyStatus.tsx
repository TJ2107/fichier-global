import React, { useState, useMemo, useRef } from 'react';
import { GlobalFileRow, XStatus } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Calendar, RefreshCw, Camera, ArrowRightLeft, History, ClipboardList, MapPin, User, CheckCircle2, Clock, FileText, CalendarPlus } from 'lucide-react';
import { downloadChartAsJpg } from '../utils/chartHelpers';

interface DailyStatusProps {
  data: GlobalFileRow[];
}

const X_COLORS: Record<string, string> = {
  [XStatus.CLOSED]: "#22c55e",
  [XStatus.TVX_STHIC]: "#6366f1",
  [XStatus.STHIC_SPA]: "#3b82f6",
  [XStatus.STHIC_ATV_HTC]: "#eab308",
  [XStatus.HTC]: "#f97316",
  "Autre": "#9ca3af"
};

const X_KEYS = [XStatus.CLOSED, XStatus.TVX_STHIC, XStatus.STHIC_SPA, XStatus.STHIC_ATV_HTC, XStatus.HTC];

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        // Gérer aussi les formats potentiels avec l'heure "dd/mm/yyyy hh:mm"
        const dayPart = parts[0];
        const monthPart = parts[1];
        const yearAndTime = parts[2].split(' ');
        const yearPart = yearAndTime[0];
        const date = new Date(parseInt(yearPart), parseInt(monthPart) - 1, parseInt(dayPart));
        
        if (yearAndTime[1]) {
          const timeParts = yearAndTime[1].split(':');
          date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1] || '0'));
        }
        return date;
      }
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

const formatDateTimeFull = (val: any): string => {
  const d = parseDate(val);
  if (!d) return typeof val === 'string' ? val : '-';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toInputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toDisplayDate = (dStr: string) => {
  if (!dStr) return '-';
  const d = new Date(dStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const DailyStatus: React.FC<DailyStatusProps> = ({ data }) => {
  const [dateLeft, setDateLeft] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toInputDate(d);
  });
  const [dateRight, setDateRight] = useState(toInputDate(new Date()));

  const chartLeftRef = useRef<HTMLDivElement>(null);
  const chartRightRef = useRef<HTMLDivElement>(null);

  const getChartDataForDate = (targetDateStr: string) => {
    if (!targetDateStr) return [];
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0,0,0,0);
    const endTargetDate = new Date(targetDateStr);
    endTargetDate.setHours(23,59,59,999);
    const regionMap: Record<string, any> = {};
    data.forEach(row => {
      const creationDate = parseDate(row["Date de création du SWO"]);
      const closingDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      const xStatus = String(row["X"] || "Autre");
      const region = String(row["Region"] || "Non défini");
      if ((creationDate && creationDate >= targetDate && creationDate <= endTargetDate) || (closingDate && closingDate >= targetDate && closingDate <= endTargetDate)) {
         if (!regionMap[region]) {
           regionMap[region] = { name: region, total: 0 };
           X_KEYS.forEach(k => regionMap[region][k] = 0);
           regionMap[region]["Autre"] = 0;
         }
         if (X_KEYS.includes(xStatus as any)) regionMap[region][xStatus]++;
         else regionMap[region]["Autre"]++;
         regionMap[region].total++;
      }
    });
    return Object.values(regionMap).sort((a: any, b: any) => b.total - a.total);
  };

  const getPlannedDataForDate = (targetDateStr: string) => {
    if (!targetDateStr) return [];
    const targetStart = new Date(targetDateStr);
    targetStart.setHours(0,0,0,0);
    const targetEnd = new Date(targetDateStr);
    targetEnd.setHours(23,59,59,999);
    return data.filter(row => {
        const plannedDate = parseDate(row["Date de planification"]);
        return plannedDate && plannedDate >= targetStart && plannedDate <= targetEnd;
    });
  };

  const leftData = useMemo(() => getChartDataForDate(dateLeft), [data, dateLeft]);
  const rightData = useMemo(() => getChartDataForDate(dateRight), [data, dateRight]);
  const leftPlannedData = useMemo(() => getPlannedDataForDate(dateLeft), [data, dateLeft]);
  const rightPlannedData = useMemo(() => getPlannedDataForDate(dateRight), [data, dateRight]);

  const PlanList = ({ items, title }: { items: GlobalFileRow[], title: string }) => (
    <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[500px]">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h4 className="font-bold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-indigo-500" /> {title}</h4>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{items.length} Planifiés</span>
        </div>
        <div className="flex-1 overflow-auto p-2">
            {items.length > 0 ? (
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const isClosed = String(item["State SWO"]).toUpperCase() === "CLOSED";
                        return (
                          <div key={idx} className="p-4 border rounded-lg bg-white shadow-sm border-l-4 border-l-indigo-500">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-sm flex items-center gap-2"><MapPin className="w-3 h-3 text-indigo-500" /> {item["Nom du site"]}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isClosed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {item["State SWO"]}
                                  </span>
                              </div>
                              <div className="flex flex-col gap-2 mb-3">
                                  <div className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded border line-clamp-3">
                                      <div className="flex items-start gap-1"><FileText className="w-3 h-3 mt-0.5 text-gray-400" /> <span>{item["Description"] || item["Short description"] || "Pas de description"}</span></div>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                                      <CalendarPlus className="w-3 h-3 text-indigo-400" />
                                      <span>Créé le : <span className="text-gray-700 font-bold">{formatDateTimeFull(item["Date de création du SWO"])}</span></span>
                                  </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-2 border-t">
                                  <div className="flex items-center gap-1.5 text-gray-600"><User className="w-3 h-3" /> <span className="font-semibold">{item["Intervenant"] || "N/A"}</span></div>
                                  <div className="font-mono text-gray-400">#{item["N° SWO"]}</div>
                              </div>
                          </div>
                        );
                    })}
                </div>
            ) : <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">Aucune planification.</div>}
        </div>
    </div>
  );

  return (
    <div className="p-6 space-y-12 bg-gray-50 min-h-full">
      <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center sticky top-0 z-30">
         <div><h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-7 h-7 text-indigo-600" /> Daily Status</h2></div>
         <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border shadow-sm">
            <input type="date" className="border rounded px-3 py-1.5 text-sm" value={dateLeft} onChange={(e) => setDateLeft(e.target.value)} />
            <ArrowRightLeft className="w-5 h-5 text-gray-400" />
            <input type="date" className="border rounded px-3 py-1.5 text-sm" value={dateRight} onChange={(e) => setDateRight(e.target.value)} />
            <button onClick={() => setDateRight(toInputDate(new Date()))} className="p-2 hover:bg-white rounded-full transition-colors"><RefreshCw className="w-5 h-5" /></button>
         </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-700 border-l-4 border-indigo-500 pl-3">1. Activité Globale (Production)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border h-[400px] flex flex-col relative" ref={chartLeftRef}>
                <div className="flex justify-between items-center mb-2 border-b"><h3 className="font-bold text-gray-800">{toDisplayDate(dateLeft)}</h3><button onClick={() => downloadChartAsJpg(chartLeftRef, 'activity_left')} className="p-1.5"><Camera className="w-4 h-4" /></button></div>
                <div className="flex-1 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={leftData} margin={{bottom: 60}}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={10} /><YAxis /><Tooltip /><Legend verticalAlign="top" height={36} />{X_KEYS.map(key => <Bar key={key} dataKey={key} stackId="a" fill={X_COLORS[key]} />)}</BarChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border h-[400px] flex flex-col relative" ref={chartRightRef}>
                <div className="flex justify-between items-center mb-2 border-b"><h3 className="font-bold text-indigo-700">{toDisplayDate(dateRight)}</h3><button onClick={() => downloadChartAsJpg(chartRightRef, 'activity_right')} className="p-1.5"><Camera className="w-4 h-4" /></button></div>
                <div className="flex-1 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={rightData} margin={{bottom: 60}}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={10} /><YAxis /><Tooltip /><Legend verticalAlign="top" height={36} />{X_KEYS.map(key => <Bar key={key} dataKey={key} stackId="a" fill={X_COLORS[key]} />)}</BarChart></ResponsiveContainer></div>
            </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-700 border-l-4 border-emerald-500 pl-3">2. Daily Plan (Planification du jour)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlanList items={leftPlannedData} title={toDisplayDate(dateLeft)} />
            <PlanList items={rightPlannedData} title={toDisplayDate(dateRight)} />
        </div>
      </div>
    </div>
  );
};