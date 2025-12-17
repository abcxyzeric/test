
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseRpgMakerData } from '../services/parsers/rpgMakerParser';
import { translateText } from '../services/geminiService';
import { UploadIcon, TranslateIcon, DownloadIcon, TrashIcon, ChevronRightIcon } from './icons';
import type { RpgMakerFile, RpgMakerEntry } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface RpgMakerParserPageProps {
  onOpenApiSettings: () => void;
  onShowNotification: (notification: any) => void;
  // State lifted from App.tsx via props previously, now potentially manageable via context or kept local if specific to this page instance.
  // For this refactor, we keep files as props to avoid moving EVERYTHING to context if it's transient, 
  // OR we can stick to the request of using Context API.
  // Let's use props for files to keep it simple as per original, but use Context for settings.
  files: RpgMakerFile[]; 
  setFiles: React.Dispatch<React.SetStateAction<RpgMakerFile[]>>; 
  mapInfos: Record<number, any>; 
  setMapInfos: React.Dispatch<React.SetStateAction<Record<number, any>>>; 
}

const RpgMakerParserPage: React.FC<RpgMakerParserPageProps> = ({ 
    onOpenApiSettings, 
    onShowNotification,
    files, 
    setFiles, 
    mapInfos, 
    setMapInfos 
}) => {
  const { activeApiKey, model, safetySettings, keywords, properNouns, rules } = useSettings();
  const [isTranslating, setIsTranslating] = useState(false);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set()); 
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set()); 

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filePromises = acceptedFiles.map(file => 
        file.text().then(text => ({ name: file.name, text }))
    );

    Promise.all(filePromises).then(results => {
        let currentMapInfos = { ...mapInfos };
        const mapInfoFile = results.find(r => r.name === 'MapInfos.json');
        if (mapInfoFile) {
            try {
                const parsed = JSON.parse(mapInfoFile.text);
                if (Array.isArray(parsed)) {
                    parsed.forEach((info: any) => {
                        if (info && info.id) currentMapInfos[info.id] = info;
                    });
                }
                setMapInfos(currentMapInfos);
                onShowNotification({ type: 'success', message: 'Đã tải thông tin Map Tree (MapInfos.json)!' });
            } catch (e) {
                onShowNotification({ type: 'error', message: 'Lỗi đọc file MapInfos.json' });
            }
        }

        results.forEach(fileData => {
            if (fileData.name === 'MapInfos.json') return;
            try {
                const entries = parseRpgMakerData(fileData.text, fileData.name, currentMapInfos);
                const newFile: RpgMakerFile = {
                    id: crypto.randomUUID(),
                    fileName: fileData.name,
                    entries: entries,
                    status: 'loaded'
                };
                setFiles(prev => [...prev, newFile]);
                onShowNotification({ type: 'success', message: `Đã tách ${entries.length} dòng từ ${fileData.name}` });
            } catch (e) {
                onShowNotification({ type: 'error', message: `Lỗi đọc file ${fileData.name}` });
            }
        });
    });
  }, [onShowNotification, mapInfos, setFiles, setMapInfos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    multiple: true,
  });

  const toggleCollapse = (key: string) => {
      setCollapsedKeys(prev => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
      });
  };

  const toggleSelection = (id: string) => {
      setSelectedEntryIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleGroupSelection = (idsToCheck: string[], shouldSelect: boolean) => {
      setSelectedEntryIds(prev => {
          const next = new Set(prev);
          idsToCheck.forEach(id => {
              if (shouldSelect) next.add(id);
              else next.delete(id);
          });
          return next;
      });
  };

  const handleTranslateEntry = async (fileId: string, entryId: string) => {
    if (!activeApiKey) {
        onOpenApiSettings();
        return;
    }
    setFiles(prev => prev.map(f => {
        if (f.id !== fileId) return f;
        return {
            ...f,
            entries: f.entries.map(e => e.id === entryId ? { ...e, status: 'translating' } : e)
        };
    }));
    const file = files.find(f => f.id === fileId);
    const entry = file?.entries.find(e => e.id === entryId);
    if (!entry) return;
    try {
        const result = await translateText(
            entry.originalText, 'auto', 'vi', activeApiKey, model, safetySettings, { keywords, properNouns }, rules, 'rpg_maker'
        );
        setFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                entries: f.entries.map(e => e.id === entryId ? { ...e, translatedText: result.text, status: 'done' } : e)
            };
        }));
    } catch (error) {
        setFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                entries: f.entries.map(e => e.id === entryId ? { ...e, status: 'error' } : e)
            };
        }));
    }
  };

  const translateBatch = async (fileId: string, targetEntryIds?: Set<string>) => {
      if (!activeApiKey) {
          onOpenApiSettings();
          return;
      }
      setIsTranslating(true);
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      const entriesToTranslate = file.entries.filter(e => {
          const isPendingOrError = e.status === 'pending' || e.status === 'error';
          const isSelected = targetEntryIds ? targetEntryIds.has(e.id) : true;
          return isPendingOrError && isSelected;
      });
      
      if (entriesToTranslate.length === 0) {
          onShowNotification({ type: 'success', message: 'Không có dòng nào cần dịch trong phạm vi đã chọn.' });
          setIsTranslating(false);
          return;
      }

      setFiles(prev => prev.map(f => {
          if (f.id !== fileId) return f;
          return {
              ...f,
              entries: f.entries.map(e => entriesToTranslate.some(target => target.id === e.id) ? { ...e, status: 'translating' } : e)
          };
      }));

      const DELIMITER = '#####';
      const combinedText = entriesToTranslate.map(e => e.originalText).join(`\n${DELIMITER}\n`);

      try {
          const result = await translateText(
              combinedText, 'auto', 'vi', activeApiKey, model, safetySettings, { keywords, properNouns }, rules, 'rpg_maker'
          );
          const translatedSegments = result.text.split(new RegExp(`\\s*${DELIMITER}\\s*`));

          setFiles(prev => prev.map(f => {
              if (f.id !== fileId) return f;
              return {
                  ...f,
                  entries: f.entries.map(e => {
                      const index = entriesToTranslate.findIndex(target => target.id === e.id);
                      if (index !== -1) {
                          const segment = translatedSegments[index];
                          return {
                              ...e,
                              translatedText: segment ? segment.trim() : '',
                              status: segment ? 'done' : 'error'
                          };
                      }
                      return e;
                  })
              };
          }));
          onShowNotification({ type: 'success', message: `Hoàn thành dịch ${entriesToTranslate.length} mục trong 1 lần.` });

      } catch (error) {
           setFiles(prev => prev.map(f => {
              if (f.id !== fileId) return f;
              return {
                  ...f,
                  entries: f.entries.map(e => entriesToTranslate.some(target => target.id === e.id) ? { ...e, status: 'error' } : e)
              };
          }));
          onShowNotification({ type: 'error', message: 'Lỗi khi dịch hàng loạt.' });
      }
      setIsTranslating(false);
  };
  
  const handleRemoveFile = (fileId: string) => {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedEntryIds(prev => { const next = new Set(prev); return next; });
  };

  const handleExportJson = (file: RpgMakerFile) => {
      const exportData = JSON.stringify(file.entries, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.fileName}_extracted.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
        <header className="mb-6 flex-shrink-0">
            <h1 className="text-3xl font-bold text-gray-100">Dịch RPG Maker MZ</h1>
            <p className="mt-2 text-gray-400">Tách text từ file Map/CommonEvents JSON và dịch tự động.</p>
        </header>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-6 flex-shrink-0 ${isDragActive ? 'bg-gray-700/50 border-[var(--primary-500)]' : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'}`}>
            <input {...getInputProps()} />
            <UploadIcon className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-300">Kéo thả file <strong>MapXXX.json</strong> và <strong>MapInfos.json</strong> vào đây.</p>
            <p className="text-xs text-gray-500 mt-2">(Nên thả file MapInfos.json cùng lúc để hiển thị đúng tên Map)</p>
        </div>

        <div className="flex-grow overflow-y-auto space-y-6 min-h-0">
            {files.map(file => {
                const isFileCollapsed = collapsedKeys.has(file.id);
                const fileEntryIds = file.entries.map(e => e.id);
                const isFileAllSelected = fileEntryIds.length > 0 && fileEntryIds.every(id => selectedEntryIds.has(id));
                const isFilePartialSelected = !isFileAllSelected && fileEntryIds.some(id => selectedEntryIds.has(id));

                const groupedByContext: Record<string, RpgMakerEntry[]> = file.entries.reduce((acc, entry) => {
                    const key = entry.context || 'Khác';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(entry);
                    return acc;
                }, {} as Record<string, RpgMakerEntry[]>);

                return (
                    <div key={file.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
                        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={() => toggleCollapse(file.id)} className="text-gray-400 hover:text-white transition-transform">
                                    <ChevronRightIcon className={`w-5 h-5 transform transition-transform ${isFileCollapsed ? '' : 'rotate-90'}`} />
                                </button>
                                <input 
                                    type="checkbox" 
                                    checked={isFileAllSelected} 
                                    ref={input => { if (input) input.indeterminate = isFilePartialSelected; }}
                                    onChange={(e) => toggleGroupSelection(fileEntryIds, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                                />
                                <h3 className="font-semibold text-gray-200 truncate" title={file.fileName}>
                                    {file.fileName} <span className="text-sm font-normal text-gray-500">({file.entries.length} mục)</span>
                                </h3>
                            </div>
                            <div className="flex gap-2 flex-shrink-0 ml-4">
                                <button onClick={() => translateBatch(file.id, selectedEntryIds)} disabled={isTranslating || !isFilePartialSelected && !isFileAllSelected} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    <TranslateIcon className="w-4 h-4" /> Dịch Đã Chọn (Gom 1 lần)
                                </button>
                                <button onClick={() => translateBatch(file.id)} disabled={isTranslating} className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg disabled:opacity-50">Dịch Hết</button>
                                <button onClick={() => handleExportJson(file)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"><DownloadIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleRemoveFile(file.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        {!isFileCollapsed && (
                            <div className="bg-gray-900/30 p-2 space-y-2">
                                {(Object.entries(groupedByContext) as [string, RpgMakerEntry[]][]).map(([contextName, entries]) => {
                                    const contextKey = `${file.id}_${contextName}`; 
                                    const isEventCollapsed = collapsedKeys.has(contextKey);
                                    const eventEntryIds = entries.map(e => e.id);
                                    const isEventAllSelected = eventEntryIds.length > 0 && eventEntryIds.every(id => selectedEntryIds.has(id));
                                    const isEventPartialSelected = !isEventAllSelected && eventEntryIds.some(id => selectedEntryIds.has(id));

                                    return (
                                        <div key={contextKey} className="border border-gray-700/30 rounded-lg bg-gray-800/40 overflow-hidden">
                                            <div className="flex items-center gap-3 p-2 bg-gray-800/80 hover:bg-gray-700/50 cursor-pointer select-none border-b border-gray-700/20" onClick={() => toggleCollapse(contextKey)}>
                                                 <button className="text-gray-500 hover:text-gray-300"><ChevronRightIcon className={`w-4 h-4 transform transition-transform ${isEventCollapsed ? '' : 'rotate-90'}`} /></button>
                                                <input type="checkbox" checked={isEventAllSelected} ref={input => { if (input) input.indeterminate = isEventPartialSelected; }} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleGroupSelection(eventEntryIds, e.target.checked)} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]" />
                                                <span className="text-sm font-semibold text-blue-300 truncate">{contextName}</span>
                                                <span className="text-xs text-gray-500 ml-auto">{entries.length} dòng</span>
                                            </div>
                                            {!isEventCollapsed && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <tbody className="divide-y divide-gray-700/30">
                                                            {entries.map(entry => (
                                                                <tr key={entry.id} className={`hover:bg-gray-700/30 ${selectedEntryIds.has(entry.id) ? 'bg-purple-900/10' : ''}`}>
                                                                    <td className="p-3 w-10 align-top"><input type="checkbox" checked={selectedEntryIds.has(entry.id)} onChange={() => toggleSelection(entry.id)} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)] mt-1" /></td>
                                                                    <td className="p-3 text-gray-300 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed w-1/2 border-r border-gray-700/30">{entry.originalText}</td>
                                                                    <td className="p-3 text-gray-200 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed w-1/2">{entry.status === 'translating' ? <span className="text-yellow-400 text-xs animate-pulse">Đang dịch...</span> : entry.status === 'error' ? <span className="text-red-400 text-xs">Lỗi</span> : entry.translatedText}</td>
                                                                    <td className="p-3 w-10 align-top"><button onClick={() => handleTranslateEntry(file.id, entry.id)} className="p-1.5 text-gray-500 hover:text-white bg-gray-700/50 hover:bg-[var(--primary-600)] rounded-md transition-colors"><TranslateIcon className="w-4 h-4" /></button></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
            {files.length === 0 && <div className="text-center text-gray-500 py-10">Chưa có file nào được tải lên.</div>}
        </div>
    </div>
  );
};

export default RpgMakerParserPage;
