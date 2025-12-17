
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseRenpyScript } from '../services/parsers/renpyParser';
import { translateText } from '../services/geminiService';
import { UploadIcon, TranslateIcon, DownloadIcon, TrashIcon, ChevronRightIcon } from './icons';
import type { RenpyFile } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface RenpyParserPageProps {
  onOpenApiSettings: () => void;
  onShowNotification: (notification: any) => void;
  files: RenpyFile[];
  setFiles: React.Dispatch<React.SetStateAction<RenpyFile[]>>;
}

const RenpyParserPage: React.FC<RenpyParserPageProps> = ({ 
    onOpenApiSettings, 
    onShowNotification,
    files, 
    setFiles
}) => {
  const { activeApiKey, model, safetySettings, keywords, properNouns, rules } = useSettings();
  const [isTranslating, setIsTranslating] = useState(false);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
        file.text().then(text => {
            try {
                const { rawLines, entries } = parseRenpyScript(text);
                
                if (entries.length === 0) {
                     onShowNotification({ type: 'error', message: `Không tìm thấy dòng thoại nào trong ${file.name}` });
                     return;
                }

                const newFile: RenpyFile = {
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    rawLines: rawLines,
                    entries: entries,
                    status: 'loaded'
                };
                setFiles(prev => [...prev, newFile]);
                onShowNotification({ type: 'success', message: `Đã tách ${entries.length} dòng từ ${file.name}` });
            } catch (e) {
                onShowNotification({ type: 'error', message: `Lỗi đọc file ${file.name}` });
            }
        });
    });
  }, [onShowNotification, setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.rpy', '.txt'] }, 
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
              combinedText, 'auto', 'vi', activeApiKey, model, safetySettings, { keywords, properNouns }, rules, 'renpy'
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
          onShowNotification({ type: 'success', message: `Hoàn thành dịch ${entriesToTranslate.length} mục.` });

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
      setSelectedEntryIds(prev => prev);
  };

  const handleExportRenpy = (file: RenpyFile) => {
      const newLines = [...file.rawLines];
      const dialogueRegex = /^(\s*)(?:(\w+)\s+)?(")((?:[^"\\]|\\.)*)(")(.*)$/;

      file.entries.forEach(entry => {
          if (entry.status === 'done' && entry.translatedText) {
              const originalLine = newLines[entry.lineIndex];
              const match = originalLine.match(dialogueRegex);
              if (match) {
                  const [, indent, speaker, openQuote, content, closeQuote, suffix] = match;
                  const escapedTranslation = entry.translatedText.replace(/"/g, '\\"');
                  const newLine = `${indent}${speaker ? speaker + ' ' : ''}${openQuote}${escapedTranslation}${closeQuote}${suffix}`;
                  newLines[entry.lineIndex] = newLine;
              }
          }
      });

      const outputContent = newLines.join('\n');
      const blob = new Blob([outputContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const newFileName = file.fileName.replace(/(\.rpy|\.txt)$/i, '_vi$1'); 
      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
        <header className="mb-6 flex-shrink-0">
            <h1 className="text-3xl font-bold text-gray-100">Dịch Script Ren'Py</h1>
            <p className="mt-2 text-gray-400">Tách thoại từ file .rpy, dịch và tái tạo file code nguyên vẹn.</p>
        </header>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-6 flex-shrink-0 ${isDragActive ? 'bg-gray-700/50 border-[var(--primary-500)]' : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'}`}>
            <input {...getInputProps()} />
            <UploadIcon className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-300">Kéo thả file <strong>.rpy</strong> hoặc <strong>.txt</strong> vào đây.</p>
        </div>

        <div className="flex-grow overflow-y-auto space-y-6 min-h-0">
            {files.map(file => {
                const isFileCollapsed = collapsedKeys.has(file.id);
                const fileEntryIds = file.entries.map(e => e.id);
                const isFileAllSelected = fileEntryIds.length > 0 && fileEntryIds.every(id => selectedEntryIds.has(id));
                const isFilePartialSelected = !isFileAllSelected && fileEntryIds.some(id => selectedEntryIds.has(id));

                return (
                    <div key={file.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
                        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={() => toggleCollapse(file.id)} className="text-gray-400 hover:text-white transition-transform">
                                    <ChevronRightIcon className={`w-5 h-5 transform transition-transform ${isFileCollapsed ? '' : 'rotate-90'}`} />
                                </button>
                                <input type="checkbox" checked={isFileAllSelected} ref={input => { if (input) input.indeterminate = isFilePartialSelected; }} onChange={(e) => toggleGroupSelection(fileEntryIds, e.target.checked)} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]" />
                                <h3 className="font-semibold text-gray-200 truncate" title={file.fileName}>{file.fileName} <span className="text-sm font-normal text-gray-500">({file.entries.length} dòng)</span></h3>
                            </div>
                            <div className="flex gap-2 flex-shrink-0 ml-4">
                                <button onClick={() => translateBatch(file.id, selectedEntryIds)} disabled={isTranslating || !isFilePartialSelected && !isFileAllSelected} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    <TranslateIcon className="w-4 h-4" /> Dịch Đã Chọn
                                </button>
                                <button onClick={() => handleExportRenpy(file)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg" title="Tải về file .rpy đã dịch">
                                    <DownloadIcon className="w-4 h-4" /> Xuất File
                                </button>
                                <button onClick={() => handleRemoveFile(file.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        {!isFileCollapsed && (
                            <div className="bg-gray-900/30 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <tbody className="divide-y divide-gray-700/30">
                                        {file.entries.map(entry => (
                                            <tr key={entry.id} className={`hover:bg-gray-700/30 ${selectedEntryIds.has(entry.id) ? 'bg-purple-900/10' : ''}`}>
                                                <td className="p-3 w-10 align-top"><input type="checkbox" checked={selectedEntryIds.has(entry.id)} onChange={() => toggleSelection(entry.id)} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)] mt-1" /></td>
                                                <td className="p-3 w-24 align-top text-xs text-blue-300 font-mono">{entry.speaker || (entry.type === 'narrator' ? 'Narrator' : 'Choice')}</td>
                                                <td className="p-3 text-gray-300 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed w-1/2 border-r border-gray-700/30">{entry.originalText}</td>
                                                <td className="p-3 text-gray-200 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed w-1/2">{entry.status === 'translating' ? <span className="text-yellow-400 text-xs animate-pulse">Đang dịch...</span> : entry.status === 'error' ? <span className="text-red-400 text-xs">Lỗi</span> : entry.translatedText}</td>
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
    </div>
  );
};

export default RenpyParserPage;
