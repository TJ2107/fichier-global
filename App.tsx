
import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { GlobalFileRow, XStatus, SWOState } from './types';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { LayoutDashboard, Table, Download, FilterX, Upload, Plus, X, Timer, Briefcase, Trash2, Loader2, Save, ClipboardList, CalendarDays, FileUp, Info, Smartphone, Battery, Settings2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeRow } from './utils/dataNormalization';

// Chargement paresseux
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const DailyStatus = lazy(() => import('./components/DailyStatus').then(m => ({ default: m.DailyStatus })));
const TTFAnalysis = lazy(() => import('./components/TTFAnalysis').then(m => ({ default: m.TTFAnalysis })));
const GMSheet = lazy(() => import('./components/GMSheet').then(m => ({ default: m.GMSheet })));
const BatteryTracker = lazy(() => import('./components/BatteryTracker').then(m => ({ default: m.BatteryTracker })));
const BeltTracker = lazy(() => import('./components/BeltTracker').then(m => ({ default: m.BeltTracker })));

// --- CONFIGURATION INDEXEDDB ---
const DB_NAME = 'FichierGlobalDB';
const STORE_NAME = 'dataStore';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (data: GlobalFileRow[]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, 'mainData');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadFromDB = async (): Promise<GlobalFileRow[] | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('mainData');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const clearDB = async () => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const applyBusinessRules = (row: GlobalFileRow): GlobalFileRow => {
  const newRow = { ...row };
  const xValue = String(newRow["X"] || "").trim();
  if (xValue) {
    if (xValue === XStatus.CLOSED) {
      newRow["State SWO"] = SWOState.CLOSED;
    } else {
      newRow["State SWO"] = SWOState.OPEN;
    }
  }
  return newRow;
};

const parseDateSimple = (val: any): Date | null => {
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

const TabLoading = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12">
    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
    <p className="text-gray-500 font-medium animate-pulse">Chargement de l'analyse...</p>
  </div>
);

const App: React.FC = () => {
  const [data, setData] = useState<GlobalFileRow[]>([]);
  const [activeTab, setActiveTab] = useState<'data' | 'dashboard' | 'ttf' | 'gm' | 'daily' | 'battery' | 'belt'>('data');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  
  const [pendingData, setPendingData] = useState<GlobalFileRow[] | null>(null);
  const [pasteContent, setPasteContent] = useState('');

  // Badges d'alertes
  const expiredCounts = useMemo(() => {
    if (data.length === 0) return { battery: 0, belt: 0 };
    const now = new Date();
    const batterySites: Record<string, Date> = {};
    const beltSites: Record<string, Date> = {};
    
    data.forEach(row => {
      const desc = String(row["Description"] || "").toLowerCase();
      const date = parseDateSimple(row["Closing date"]) || parseDateSimple(row["Date de Clôture"]);
      const site = String(row["Nom du site"] || "Inconnu");
      
      if (date) {
        if (desc.includes("remplacement batterie ge")) {
          if (!batterySites[site] || date > batterySites[site]) batterySites[site] = date;
        }
        if (desc.includes("courroie") || desc.includes("swap courroie") || desc.includes("remplacement courroie")) {
          if (!beltSites[site] || date > beltSites[site]) beltSites[site] = date;
        }
      }
    });

    const expiredBattery = Object.values(batterySites).filter(d => {
      const m = (now.getMonth() - d.getMonth() + 12 * (now.getFullYear() - d.getFullYear()));
      return m >= 7;
    }).length;

    const expiredBelt = Object.values(beltSites).filter(d => {
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      return diffDays >= 180;
    }).length;

    return { battery: expiredBattery, belt: expiredBelt };
  }, [data]);

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        const storedData = await loadFromDB();
        if (isMounted) {
          if (storedData && storedData.length > 0) setData(storedData);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) setIsLoading(false);
      }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isLoading || data.length === 0) return;
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try { await saveToDB(data); } catch (e) {} finally { setIsSaving(false); }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [data, isLoading]);

  const handleDataLoaded = (newData: GlobalFileRow[]) => {
    const processedData = newData.map(applyBusinessRules);
    setIsUploadModalOpen(false);
    if (data.length === 0) {
      setData(processedData);
      saveToDB(processedData);
    } else {
      setPendingData(processedData);
      setIsImportModalOpen(true);
    }
  };

  const processPaste = () => {
    if (!pasteContent.trim()) return;
    try {
        const rows = pasteContent.split(/\r?\n/).filter(r => r.trim() !== '');
        if (rows.length < 2) return alert("Format invalide.");
        const rawHeaders = rows[0].split('\t').map(h => h.trim());
        const newRows: GlobalFileRow[] = rows.slice(1).map(rowStr => {
            const cells = rowStr.split('\t');
            const rawRowObj: any = {};
            rawHeaders.forEach((header, index) => {
                let val = cells[index] ? cells[index].trim() : "";
                if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1).replace(/""/g, '"');
                rawRowObj[header] = val;
            });
            return normalizeRow(rawRowObj);
        });
        handleDataLoaded(newRows);
        setIsPasteModalOpen(false);
        setPasteContent('');
    } catch (e) { alert("Erreur analyse."); }
  };

  const confirmAppend = () => {
    if (pendingData) {
      setData(prev => [...prev, ...pendingData]);
      setPendingData(null);
      setIsImportModalOpen(false);
    }
  };

  const confirmReplace = () => {
    if (pendingData) {
      setData(pendingData);
      setPendingData(null);
      setIsImportModalOpen(false);
    }
  };

  const handleUpdateRow = (index: number, field: string, value: string) => {
    const newData = [...data];
    let updatedRow = { ...newData[index], [field]: value };
    if (field === "X") updatedRow = applyBusinessRules(updatedRow);
    newData[index] = updatedRow;
    setData(newData);
  };

  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };

  const clearFilters = () => setFilters({});

  const resetApplication = async () => {
    if (window.confirm("Tout effacer définitivement ?")) {
      setData([]);
      setFilters({});
      setActiveTab('data');
      await clearDB();
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données");
    XLSX.writeFile(wb, `FICHIER_GLOBAL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-gray-100">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-gray-800">Initialisation</h2>
          <p className="text-gray-500 mt-2 text-center max-w-xs">Accès sécurisé à votre base de données locale en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-900 relative">
      <header className="bg-indigo-700 text-white p-3 md:p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg cursor-pointer hover:bg-white/30 transition-colors" onClick={() => setIsAboutModalOpen(true)}>
                  <Table className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-black tracking-tight flex items-center gap-2">
                    GLOBAL FILES
                    <button onClick={() => setIsAboutModalOpen(true)} className="hover:text-indigo-200 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </h1>
                  {isSaving && <span className="text-[10px] text-indigo-200 flex items-center gap-1"><Save className="w-3 h-3 animate-pulse" /> Auto-sauvegarde...</span>}
                </div>
            </div>
          </div>
          
          {data.length > 0 && (
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <button onClick={() => setActiveTab('data')} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'data' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <Table className="w-4 h-4" /><span className="hidden lg:inline text-sm">Données</span>
              </button>
              <button onClick={() => setActiveTab('dashboard')} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <LayoutDashboard className="w-4 h-4" /><span className="hidden lg:inline text-sm">Dashboard</span>
              </button>
              <button onClick={() => setActiveTab('daily')} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'daily' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <CalendarDays className="w-4 h-4" /><span className="hidden lg:inline text-sm">Daily</span>
              </button>
              
              <button onClick={() => setActiveTab('battery')} className={`flex-shrink-0 relative flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'battery' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <Battery className="w-4 h-4" /><span className="hidden lg:inline text-sm">Battery</span>
                {expiredCounts.battery > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[10px] font-bold text-white items-center justify-center">{expiredCounts.battery}</span>
                  </span>
                )}
              </button>

              <button onClick={() => setActiveTab('belt')} className={`flex-shrink-0 relative flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'belt' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <Settings2 className="w-4 h-4" /><span className="hidden lg:inline text-sm">Belt Tracking</span>
                {expiredCounts.belt > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-600 text-[10px] font-bold text-white items-center justify-center">{expiredCounts.belt}</span>
                  </span>
                )}
              </button>

              <button onClick={() => setActiveTab('ttf')} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'ttf' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <Timer className="w-4 h-4" /><span className="hidden lg:inline text-sm">TTF</span>
              </button>
              <button onClick={() => setActiveTab('gm')} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'gm' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-indigo-100 hover:bg-indigo-600'}`}>
                <Briefcase className="w-4 h-4" /><span className="hidden lg:inline text-sm">GM</span>
              </button>
              
              <div className="w-px h-6 bg-indigo-500 mx-2 flex-shrink-0"></div>
              
              {Object.values(filters).some(val => val) && (
                <button onClick={clearFilters} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition shadow-sm font-medium mr-1">
                  <FilterX className="w-4 h-4" /><span className="hidden lg:inline text-sm">Filtres</span>
                </button>
              )}

              <button onClick={() => setIsPasteModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition shadow-sm font-medium border border-indigo-400">
                <ClipboardList className="w-4 h-4" /><span className="hidden lg:inline text-sm">Coller</span>
              </button>
              <button onClick={() => setIsUploadModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm font-medium border border-indigo-400">
                <Upload className="w-4 h-4" /><span className="hidden lg:inline text-sm">Importer</span>
              </button>

              <button onClick={exportToExcel} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition shadow-md font-medium">
                <Download className="w-4 h-4" /><span className="hidden lg:inline text-sm">Exporter</span>
              </button>
              
              <div className="w-px h-6 bg-indigo-500 mx-2 flex-shrink-0"></div>
              <button onClick={resetApplication} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-md font-medium" title="Réinitialiser l'application">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1920px] mx-auto w-full p-2 md:p-4 overflow-hidden flex flex-col">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-indigo-100 p-8 rounded-[2rem] mb-6 shadow-inner ring-8 ring-indigo-50">
                <Table className="w-20 h-20 text-indigo-600" />
              </div>
              <h2 className="text-4xl font-black text-gray-800 tracking-tight">GLOBAL FILES</h2>
              <p className="text-gray-500 mt-3 max-w-md text-lg">Centralisez, suivez et optimisez vos interventions de maintenance en toute simplicité.</p>
            </div>
            
            <div className="flex flex-col gap-5 w-full max-w-2xl animate-in zoom-in-95 duration-500 delay-200">
                <FileUpload onDataLoaded={handleDataLoaded} />
                <button onClick={() => setIsPasteModalOpen(true)} className="w-full py-5 border-2 border-dashed border-indigo-300 bg-white hover:bg-indigo-50 rounded-2xl text-indigo-700 font-black flex items-center justify-center gap-4 transition-all shadow-sm group">
                  <ClipboardList className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  Coller directement depuis Excel
                </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full flex flex-col min-h-0">
             {activeTab === 'data' && <DataTable data={data} setData={setData} onUpdateRow={handleUpdateRow} filters={filters} onFilterChange={handleFilterChange} />}
             <Suspense fallback={<TabLoading />}>
                {activeTab === 'dashboard' && <div className="overflow-auto h-full"><Dashboard data={data} onFilterChange={handleFilterChange} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'daily' && <div className="overflow-auto h-full"><DailyStatus data={data} /></div>}
                {activeTab === 'ttf' && <div className="overflow-auto h-full"><TTFAnalysis data={data} /></div>}
                {activeTab === 'gm' && <div className="overflow-auto h-full"><GMSheet data={data} /></div>}
                {activeTab === 'battery' && <div className="overflow-auto h-full"><BatteryTracker data={data} /></div>}
                {activeTab === 'belt' && <div className="overflow-auto h-full"><BeltTracker data={data} /></div>}
             </Suspense>
          </div>
        )}
      </main>

      {/* Modal À Propos / Aide */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-indigo-100">
            <div className="bg-indigo-700 p-10 text-white relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <Table className="w-48 h-48" />
              </div>
              <h3 className="text-3xl font-black mb-2">Guide GLOBAL FILES</h3>
              <p className="text-indigo-100 text-sm font-medium">Maîtrisez vos données opérationnelles</p>
              <button onClick={() => setIsAboutModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-green-50 border border-green-100">
                  <Battery className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-green-900">Maintenance Préventive</h4>
                    <p className="text-xs text-green-700 leading-relaxed mt-1">Calcul automatique des échéances batteries (7 mois) et courroies (180j) basé sur la date de clôture effective.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 flex justify-center">
              <button onClick={() => setIsAboutModalOpen(false)} className="px-12 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">J'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals d'Importation */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Upload className="w-6 h-6 text-indigo-600" /> Importer un fichier</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-red-500 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-10"><FileUpload onDataLoaded={handleDataLoaded} /></div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl p-10 text-center border-t-8 border-indigo-500">
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileUp className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-800 mb-4">Données existantes</h3>
            <p className="text-gray-600 mb-10 leading-relaxed">
              Votre base contient déjà <span className="font-black text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">{data.length} lignes</span>. Souhaitez-vous ajouter les nouvelles données ou remplacer le fichier actuel ?
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={confirmAppend} className="flex-1 p-6 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700 font-black flex flex-col items-center gap-3 transition-all shadow-sm">
                <Plus className="w-10 h-10" /><span>AJOUTER</span>
              </button>
              <button onClick={confirmReplace} className="flex-1 p-6 border-2 border-red-100 rounded-2xl hover:bg-red-50 hover:border-red-300 text-red-600 font-black flex flex-col items-center gap-3 transition-all shadow-sm">
                <Trash2 className="w-10 h-10" /><span>REMPLACER</span>
              </button>
            </div>
            <button onClick={() => { setPendingData(null); setIsImportModalOpen(false); }} className="mt-8 text-gray-400 font-bold hover:text-gray-600 underline">Annuler l'importation</button>
          </div>
        </div>
      )}

      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
               <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-indigo-600" /> Coller depuis Excel</h3>
               <button onClick={() => setIsPasteModalOpen(false)} className="text-gray-400 hover:text-red-500 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 p-8 flex flex-col">
              <p className="text-xs text-gray-400 mb-3 font-bold uppercase tracking-widest">Zone de dépôt de données</p>
              <textarea 
                className="flex-1 p-6 border-2 border-gray-100 rounded-2xl font-mono text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 outline-none resize-none shadow-inner bg-gray-50/50" 
                placeholder="Sélectionnez vos colonnes dans Excel, copiez (Ctrl+C) et collez-les ici (Ctrl+V)..."
                value={pasteContent} 
                onChange={(e) => setPasteContent(e.target.value)} 
              />
              <div className="flex justify-end gap-4 mt-8">
                <button onClick={() => setIsPasteModalOpen(false)} className="px-8 py-3 text-gray-400 font-black hover:text-gray-600 transition-colors uppercase text-sm">Annuler</button>
                <button onClick={processPaste} className="px-12 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 uppercase text-sm">Traiter les données</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
