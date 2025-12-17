
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { TranslationHistoryItem, AnalysisHistoryItem, HistoryFolder } from '../types';
import { generateTitleForTranslation } from '../services/geminiService';
import { useSettings } from './SettingsContext';

interface HistoryContextType {
  translationHistory: TranslationHistoryItem[];
  setTranslationHistory: React.Dispatch<React.SetStateAction<TranslationHistoryItem[]>>;
  analysisHistory: AnalysisHistoryItem[];
  setAnalysisHistory: React.Dispatch<React.SetStateAction<AnalysisHistoryItem[]>>;
  historyFolders: HistoryFolder[];
  setHistoryFolders: React.Dispatch<React.SetStateAction<HistoryFolder[]>>;
  
  addTranslationHistory: (item: Omit<TranslationHistoryItem, 'id' | 'timestamp' | 'folderId'>) => void;
  addAnalysisHistory: (item: Omit<AnalysisHistoryItem, 'id' | 'timestamp' | 'folderId'>) => void;
  
  renameTranslationItem: (id: string, newName: string) => void;
  renameAnalysisItem: (id: string, newName: string) => void;
  deleteTranslationItems: (ids: string[]) => void;
  deleteAnalysisItems: (ids: string[]) => void;
  
  folderActions: {
      add: (name: string, type: 'translation' | 'analysis', parentId?: string | null) => HistoryFolder | undefined;
      rename: (id: string, newName: string) => void;
      delete: (id: string) => void;
      moveTranslations: (itemIds: string[], folderId: string | null) => void;
      moveAnalyses: (itemIds: string[], folderId: string | null) => void;
  };
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeApiKey } = useSettings();
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [historyFolders, setHistoryFolders] = useState<HistoryFolder[]>([]);

  useEffect(() => {
    const load = (key: string, setter: any) => {
        const data = localStorage.getItem(key);
        if (data) setter(JSON.parse(data));
    };
    load('translation_history', setTranslationHistory);
    load('analysis_history', setAnalysisHistory);
    load('history_folders', setHistoryFolders);
  }, []);

  useEffect(() => localStorage.setItem('translation_history', JSON.stringify(translationHistory)), [translationHistory]);
  useEffect(() => localStorage.setItem('analysis_history', JSON.stringify(analysisHistory)), [analysisHistory]);
  useEffect(() => localStorage.setItem('history_folders', JSON.stringify(historyFolders)), [historyFolders]);

  const addTranslationHistory = useCallback((item: Omit<TranslationHistoryItem, 'id' | 'timestamp' | 'folderId'>) => {
      const newItem: TranslationHistoryItem = { 
          ...item, 
          id: crypto.randomUUID(), 
          timestamp: Date.now(), 
          folderId: null,
          name: 'Đang tạo tên...'
      };
      setTranslationHistory(prev => [newItem, ...prev].slice(0, 100));

      if (activeApiKey) {
          generateTitleForTranslation(item.inputText, item.translatedText, activeApiKey)
              .then(title => {
                  setTranslationHistory(prev => 
                      prev.map(historyItem => 
                          historyItem.id === newItem.id ? { ...historyItem, name: title } : historyItem
                      )
                  );
              })
              .catch(err => {
                  setTranslationHistory(prev => 
                      prev.map(historyItem => 
                          historyItem.id === newItem.id ? { ...historyItem, name: 'Lỗi tạo tên' } : historyItem
                      )
                  );
              });
      } else {
           setTranslationHistory(prev => 
              prev.map(historyItem => 
                  historyItem.id === newItem.id ? { ...historyItem, name: 'Cần API Key để tạo tên' } : historyItem
              )
          );
      }
  }, [activeApiKey]);

  const addAnalysisHistory = useCallback((item: Omit<AnalysisHistoryItem, 'id' | 'timestamp' | 'folderId'>) => {
      const newItem: AnalysisHistoryItem = { ...item, id: crypto.randomUUID(), timestamp: Date.now(), folderId: null };
      setAnalysisHistory(prev => [newItem, ...prev].slice(0, 100));
  }, []);

  const renameTranslationItem = useCallback((id: string, newName: string) => {
    setTranslationHistory(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
  }, []);

  const renameAnalysisItem = useCallback((id: string, newName: string) => {
    setAnalysisHistory(prev => prev.map(item => item.id === id ? { ...item, fileName: newName } : item));
  }, []);

  const deleteTranslationItems = useCallback((ids: string[]) => {
      setTranslationHistory(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const deleteAnalysisItems = useCallback((ids: string[]) => {
      setAnalysisHistory(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const folderActions = {
    add: (name: string, type: 'translation' | 'analysis', parentId: string | null = null): HistoryFolder | undefined => {
        if (!name.trim() || historyFolders.some(f => f.name === name.trim() && f.type === type && f.parentId === parentId)) return;
        const newFolder: HistoryFolder = { id: crypto.randomUUID(), name: name.trim(), type: type as any, parentId };
        setHistoryFolders(prev => [...prev, newFolder]);
        return newFolder;
    },
    rename: (id: string, newName: string) => {
        if (!newName.trim()) return;
        setHistoryFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    },
    delete: (id: string) => {
        const foldersToDeleteIds: string[] = [];
        const findDescendants = (folderId: string) => {
            foldersToDeleteIds.push(folderId);
            const children = historyFolders.filter(f => f.parentId === folderId);
            children.forEach(child => findDescendants(child.id));
        };
        findDescendants(id);

        setHistoryFolders(prev => prev.filter(f => !foldersToDeleteIds.includes(f.id)));
        setTranslationHistory(prev => prev.map(item => foldersToDeleteIds.includes(item.folderId || '') ? { ...item, folderId: null } : item));
        setAnalysisHistory(prev => prev.map(item => foldersToDeleteIds.includes(item.folderId || '') ? { ...item, folderId: null } : item));
    },
    moveTranslations: (itemIds: string[], folderId: string | null) => {
        setTranslationHistory(prev => prev.map(item => itemIds.includes(item.id) ? { ...item, folderId } : item));
    },
    moveAnalyses: (itemIds: string[], folderId: string | null) => {
        setAnalysisHistory(prev => prev.map(item => itemIds.includes(item.id) ? { ...item, folderId } : item));
    }
  };

  return (
    <HistoryContext.Provider value={{
      translationHistory, setTranslationHistory,
      analysisHistory, setAnalysisHistory,
      historyFolders, setHistoryFolders,
      addTranslationHistory, addAnalysisHistory,
      renameTranslationItem, renameAnalysisItem,
      deleteTranslationItems, deleteAnalysisItems,
      folderActions
    }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) throw new Error("useHistory must be used within a HistoryProvider");
  return context;
};
