import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { GlobalFileRow } from '../types';
import { normalizeRow } from '../utils/dataNormalization';

interface FileUploadProps {
  onDataLoaded: (data: GlobalFileRow[]) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, className = "" }) => {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("No data found");
        
        // Utilisation d'ArrayBuffer pour une meilleure compatibilité
        const workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse raw data
        const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
        
        // Utilisation du normalisateur pour corriger les en-têtes Excel
        const sanitizedData = rawData.map(row => normalizeRow(row));
        
        onDataLoaded(sanitizedData);
      } catch (error) {
        console.error("Error parsing file", error);
        alert("Erreur lors de la lecture du fichier Excel. Vérifiez le format du fichier.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [onDataLoaded]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`w-full p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-200
        ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:border-indigo-300'} ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {loading ? (
        <div className="flex flex-col items-center text-indigo-600 py-8">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-lg font-medium animate-pulse">Traitement des données...</p>
        </div>
      ) : (
        <>
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <FileSpreadsheet className="w-12 h-12 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Charger un fichier</h3>
          <p className="text-gray-500 text-center mb-6 max-w-sm">
            Déposez votre fichier .xlsx ou .xls ici pour mettre à jour la base de données.
          </p>
          
          <label className="relative cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg active:scale-95 flex items-center gap-2 font-bold">
            <Upload className="w-5 h-5" />
            <span>Parcourir les fichiers</span>
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls, .csv"
              onChange={handleChange}
            />
          </label>
        </>
      )}
    </div>
  );
};