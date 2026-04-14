
import React, { useMemo, useRef, useState } from 'react';
import { GlobalFileRow, XStatus } from '../types';
import { X_OPTIONS } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Camera, ArrowRightLeft, Calendar, TrendingUp, TrendingDown, Minus, Battery, AlertTriangle } from 'lucide-react';
import { downloadChartAsJpg, downloadTableAsJpg } from '../utils/chartHelpers';

interface DashboardProps {
  data: GlobalFileRow[];
  onFilterChange: (column: string, value: string) => void;
  onSwitchToData: () => void;
}

const X_COLORS: Record<string, string> = {
  [XStatus.CLOSED]: "#22c55e",
  [XStatus.TVX_STHIC]: "#6366f1", 
  [XStatus.STHIC_SPA]: "#3b82f6",
  [XStatus.STHIC_ATV_HTC]: "#eab308",
  [XStatus.HTC]: "#f97316",
  "Non défini": "#e5e7eb"
};

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
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
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const toInputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const Dashboard: React.FC<DashboardProps> = ({ data, onFilterChange, onSwitchToData }) => {
  const pieChartRef = useRef<HTMLDivElement>(null);
  const regionChartRef = useRef<HTMLDivElement>(null);
  const pivotTableRef = useRef<HTMLDivElement>(null);
  const compareTableRef = useRef<HTMLDivElement>(null);

  const [dateA, setDateA] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toInputDate(d);
  });
  const [dateB, setDateB] = useState(toInputDate(new Date()));

  const handleChartClick = (entry: any, column: string) => {
     if (entry && entry.name) {
       onFilterChange(column, entry.name);
       onSwitchToData();
     }
  };

  const statsByX = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const x = String(row["X"] || "Non défini");
      counts[x] = (counts[x] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [data]);

  const statsByRegion = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const reg = String(row["Region"] || "Inconnue");
      counts[reg] = (counts[reg] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] })).sort((a,b) => b.count - a.count);
  }, [data]);

  const batteryStats = useMemo(() => {
    const sitesMap: Record<string, Date> = {};
    const now = new Date();
    
    data.forEach(row => {
      const desc = String(row["Description"] || "").toLowerCase();
      if (desc.includes("remplacement batterie ge")) {
        const site = String(row["Nom du site"] || "Inconnu");
        // Logique mise à jour : On ignore la date de création
        const date = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
        if (date && (!sitesMap[site] || date > sitesMap[site])) {
          sitesMap[site] = date;
        }
      }
    });

    const values = Object.values(sitesMap);
    const red = values.filter(d => (now.getMonth() - d.getMonth() + 12 * (now.getFullYear() - d.getFullYear())) >= 7).length;
    const orange = values.filter(d => {
        const m = (now.getMonth() - d.getMonth() + 12 * (now.getFullYear() - d.getFullYear()));
        return m >= 6 && m < 7;
    }).length;
    const green = values.length - red - orange;

    return { total: values.length, red, orange, green, percentHealthy: values.length > 0 ? Math.round((green / values.length) * 100) : 100 };
  }, [data]);

  const pivotTableData = useMemo(() => {
    const distinctRegions = Array.from(new Set(data.map(d => String(d["Region"] || "Non défini")))).sort();
    return distinctRegions.map(region => {
      const regionData = data.filter(d => String(d["Region"] || "Non défini") === region);
      const countsByX: Record<string, number> = {};
      X_OPTIONS.forEach(opt => countsByX[opt] = 0);
      countsByX["Autre"] = 0;
      regionData.forEach(row => {
        const xVal = row["X"];
        if (xVal && X_OPTIONS.includes(xVal as any)) countsByX[String(xVal)] = (countsByX[String(xVal)] || 0) + 1;
        else countsByX["Autre"] = (countsByX["Autre"] || 0) + 1;
      });
      return { region, ...countsByX, total: regionData.length };
    });
  }, [data]);

  const comparisonData = useMemo(() => {
    const getDayStats = (dateStr: string) => {
      const target = new Date(dateStr);
      target.setHours(0,0,0,0);
      const end = new Date(dateStr);
      end.setHours(23,59,59,999);
      
      const filtered = data.filter(row => {
        const cDate = parseDate(row["Date de création du SWO"]);
        const clDate = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
        return (cDate && cDate >= target && cDate <= end) || (clDate && clDate >= target && clDate <= end);
      });

      const regionMap: Record<string, any> = {};
      filtered.forEach(row => {
        const reg = String(row["Region"] || "Non défini");
        const xVal = String(row["X"] || "Autre");
        if (!regionMap[reg]) {
          regionMap[reg] = { total: 0 };
          X_OPTIONS.forEach(opt => regionMap[reg][opt] = 0);
        }
        if (X_OPTIONS.includes(xVal as any)) regionMap[reg][xVal]++;
        regionMap[reg].total++;
      });
      return regionMap;
    };

    const statsA = getDayStats(dateA);
    const statsB = getDayStats(dateB);
    const regions = Array.from(new Set([...Object.keys(statsA), ...Object.keys(statsB)])).sort();

    return regions.map(reg => ({
      region: reg,
      dataA: statsA[reg] || { total: 0, ...Object.fromEntries(X_OPTIONS.map(o => [o, 0])) },
      dataB: statsB[reg] || { total: 0, ...Object.fromEntries(X_OPTIONS.map(o => [o, 0])) }
    }));
  }, [data, dateA, dateB]);

  const totalsCompare = useMemo(() => {
    const sums = {
      dataA: { total: 0, ...Object.fromEntries(X_OPTIONS.map(o => [o, 0])) },
      dataB: { total: 0, ...Object.fromEntries(X_OPTIONS.map(o => [o, 0])) }
    };
    comparisonData.forEach(row => {
      sums.dataA.total += row.dataA.total;
      sums.dataB.total += row.dataB.total;
      X_OPTIONS.forEach(opt => {
        (sums.dataA as any)[opt] += (row.dataA as any)[opt];
        (sums.dataB as any)[opt] += (row.dataB as any)[opt];
      });
    });
    return sums;
  }, [comparisonData]);

  const TrendIcon = ({ a, b, isClosed }: { a: number, b: number, isClosed: boolean }) => {
    if (a === b) return <Minus className="w-3 h-3 text-gray-300" />;
    if (isClosed) {
      return b > a ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-400" />;
    }
    return b > a ? <TrendingUp className="w-3 h-3 text-red-500" /> : <TrendingDown className="w-3 h-3 text-green-500" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-12 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Tableau de Bord Analytique</h2>
        <div className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-lg text-white shadow-md">
           <Calendar className="w-4 h-4" />
           <span className="text-xs font-bold uppercase">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-b-4 border-b-gray-400">
          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total SWO</p>
          <p className="text-3xl font-black text-gray-900">{data.length}</p>
        </div>
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-b-4 border-b-blue-500">
          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Ouverts</p>
          <p className="text-3xl font-black text-blue-600">{data.filter(d => d["State SWO"] === "OPEN").length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-b-4 border-b-green-500">
          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Fermés</p>
          <p className="text-3xl font-black text-green-600">{data.filter(d => d["State SWO"] === "CLOSED").length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-b-4 border-b-orange-500">
          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Urgences HTC</p>
          <p className="text-3xl font-black text-orange-600">{data.filter(d => d["X"] === XStatus.HTC).length}</p>
        </div>
      </div>

      {batteryStats.total > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 border-l-8 border-l-red-500">
           <div className="bg-red-50 p-4 rounded-2xl">
              <Battery className={`w-12 h-12 ${batteryStats.red > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black text-gray-800 flex items-center justify-center md:justify-start gap-2">
                Santé du Parc Batteries GE
                {batteryStats.red > 0 && <AlertTriangle className="w-5 h-5 text-red-600" />}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-bold text-red-600">{batteryStats.red} sites expirés</span>, 
                <span className="font-bold text-orange-500"> {batteryStats.orange} à prévoir </span> 
                et {batteryStats.green} conformes.
              </p>
           </div>
           <div className="w-full md:w-64">
              <div className="flex justify-between mb-2">
                 <span className="text-xs font-bold text-gray-400 uppercase">Taux de Conformité</span>
                 <span className={`text-xs font-black ${batteryStats.percentHealthy < 70 ? 'text-red-600' : 'text-green-600'}`}>{batteryStats.percentHealthy}%</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
                 <div className="h-full bg-green-500" style={{ width: `${(batteryStats.green / batteryStats.total) * 100}%` }}></div>
                 <div className="h-full bg-orange-400" style={{ width: `${(batteryStats.orange / batteryStats.total) * 100}%` }}></div>
                 <div className="h-full bg-red-600" style={{ width: `${(batteryStats.red / batteryStats.total) * 100}%` }}></div>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border h-96 flex flex-col" ref={pieChartRef}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><div className="w-2 h-6 bg-indigo-600 rounded-full"></div> Répartition Statut X</h3>
             <button onClick={() => downloadChartAsJpg(pieChartRef, 'statut_x')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><Camera className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statsByX} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`} onClick={(data) => handleChartClick(data, "X")} className="cursor-pointer">
                  {statsByX.map((entry, index) => <Cell key={`cell-${index}`} fill={X_COLORS[entry.name] || '#8884d8'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border h-96 flex flex-col" ref={regionChartRef}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><div className="w-2 h-6 bg-indigo-600 rounded-full"></div> Volume par Région</h3>
             <button onClick={() => downloadChartAsJpg(regionChartRef, 'region_volume')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><Camera className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsByRegion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#9ca3af'}} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="SWO" onClick={(data) => handleChartClick(data, "Region")} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col" ref={compareTableRef}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
              Comparatif d'Évolution Quotidienne
            </h3>
            <p className="text-sm text-gray-400 mt-1">Analyse de la production par région entre deux dates spécifiques.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-inner">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Date A</span>
              <input type="date" className="border-none bg-transparent text-sm font-bold focus:ring-0 cursor-pointer" value={dateA} onChange={(e) => setDateA(e.target.value)} />
            </div>
            <div className="px-2 text-gray-300"><ArrowRightLeft className="w-4 h-4" /></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Date B</span>
              <input type="date" className="border-none bg-transparent text-sm font-bold text-indigo-600 focus:ring-0 cursor-pointer" value={dateB} onChange={(e) => setDateB(e.target.value)} />
            </div>
            <button onClick={() => downloadTableAsJpg(compareTableRef, 'evolution_quotidienne_dashboard')} className="ml-3 p-3 bg-white border rounded-xl hover:bg-gray-100 transition shadow-sm text-gray-500"><Camera className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="min-w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-4 py-4 border-r border-gray-700 sticky left-0 bg-gray-800 z-10 text-white font-black" rowSpan={2}>Région</th>
                {X_OPTIONS.map(opt => (
                  <th key={opt} className="px-2 py-2 border-r border-gray-700 text-center" colSpan={2} style={{ backgroundColor: X_COLORS[opt], color: opt === XStatus.STHIC_ATV_HTC ? 'black' : 'white' }}>{opt}</th>
                ))}
                <th className="px-4 py-2 border-l border-gray-700 text-center bg-gray-700 text-white font-black" colSpan={2}>Total Général</th>
              </tr>
              <tr className="bg-gray-100 text-[10px] text-gray-500 font-black uppercase">
                {X_OPTIONS.map(opt => (
                  <React.Fragment key={`${opt}-sub`}>
                    <th className="px-2 py-2 border-r border-gray-200 text-center font-black">A</th>
                    <th className="px-2 py-2 border-r border-gray-200 text-center bg-indigo-50/50 text-indigo-600 font-black">B</th>
                  </React.Fragment>
                ))}
                <th className="px-2 py-2 border-r border-gray-200 text-center font-black">A</th>
                <th className="px-2 py-2 text-center bg-indigo-100 text-indigo-800 font-black">B</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparisonData.map((row, idx) => (
                <tr key={row.region} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-indigo-50/20 transition-colors`}>
                  <td className="px-4 py-3 border-r font-black text-black sticky left-0 bg-inherit z-10">{row.region}</td>
                  {X_OPTIONS.map(opt => {
                    const valA = (row.dataA as any)[opt] || 0;
                    const valB = (row.dataB as any)[opt] || 0;
                    return (
                      <React.Fragment key={`${row.region}-${opt}`}>
                        <td className="px-2 py-3 border-r text-center text-gray-400">{valA || '-'}</td>
                        <td className="px-2 py-3 border-r text-center font-bold bg-indigo-50/10">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={valB > 0 ? 'text-gray-900 font-black' : 'text-gray-300'}>{valB || '-'}</span>
                            {(valA > 0 || valB > 0) && <TrendIcon a={valA} b={valB} isClosed={opt === XStatus.CLOSED} />}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-3 border-r text-center font-black text-black bg-gray-100/30">{row.dataA.total}</td>
                  <td className="px-2 py-3 text-center font-black text-black bg-indigo-100/30">
                    <div className="flex items-center justify-center gap-1.5">
                      {row.dataB.total}
                      {(row.dataA.total > 0 || row.dataB.total > 0) && <TrendIcon a={row.dataA.total} b={row.dataB.total} isClosed={true} />}
                    </div>
                  </td>
                </tr>
              ))}
              {comparisonData.length > 0 && (
                <tr className="bg-gray-800 text-white font-black text-xs uppercase">
                  <td className="px-4 py-4 border-r border-gray-700 sticky left-0 bg-gray-800 z-10 text-right">TOTAUX</td>
                  {X_OPTIONS.map(opt => {
                    const sumA = (totalsCompare.dataA as any)[opt];
                    const sumB = (totalsCompare.dataB as any)[opt];
                    return (
                      <React.Fragment key={`total-${opt}`}>
                        <td className="px-2 py-4 border-r border-gray-700 text-center opacity-70">{sumA}</td>
                        <td className="px-2 py-4 border-r border-gray-700 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {sumB}
                            <TrendIcon a={sumA} b={sumB} isClosed={opt === XStatus.CLOSED} />
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-4 border-r border-gray-700 text-center font-black text-white bg-gray-700">{totalsCompare.dataA.total}</td>
                  <td className="px-2 py-4 text-center bg-indigo-900 font-black text-white">
                    <div className="flex items-center justify-center gap-1.5">
                      {totalsCompare.dataB.total}
                      <TrendIcon a={totalsCompare.dataA.total} b={totalsCompare.dataB.total} isClosed={true} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col" ref={pivotTableRef}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Production Globale par Région (Cumul)</h3>
          <button onClick={() => downloadTableAsJpg(pivotTableRef, 'production_globale')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><Camera className="w-5 h-5" /></button>
        </div>
        <div className="overflow-auto max-h-[400px] rounded-xl border border-gray-100">
          <table className="min-w-full text-[11px] text-left border-collapse">
            <thead className="bg-gray-100 text-black font-black uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 border-b min-w-[150px] bg-gray-100 text-black font-black">Région</th>
                {X_OPTIONS.map(opt => (
                  <th key={opt} className="px-2 py-4 border-b text-center min-w-[110px] font-black" style={{ backgroundColor: X_COLORS[opt], color: opt === XStatus.STHIC_ATV_HTC ? 'black' : 'white' }}>{opt}</th>
                ))}
                <th className="px-4 py-4 border-b bg-gray-200 text-center text-black font-black">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pivotTableData.map((row, idx) => (
                <tr key={row.region} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3 border-r font-black text-black">{row.region}</td>
                  {X_OPTIONS.map(opt => <td key={opt} className="px-2 py-3 border-r text-center font-bold text-gray-700">{(row as any)[opt] || '-'}</td>)}
                  <td className="px-4 py-3 text-center font-black text-black bg-gray-100/50">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
