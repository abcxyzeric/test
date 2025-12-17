
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { translateText } from '../services/geminiService';
import { SUPPORTED_LANGUAGES, SOURCE_LANGUAGES_WITH_AUTO } from '../constants';
import type { Keyword, ProperNoun, Rule, TranslationResult, TranslationPreset } from '../types';
import LanguageSelector from '../components/LanguageSelector';
import TextAreaPanel from '../components/TextAreaPanel';
import TokenUsageDisplay from '../components/TokenUsageDisplay';
import { TranslateIcon, SwitchIcon, BookOpenIcon, ChevronRightIcon, PlusIcon, TrashIcon, ShieldCheckIcon, SettingsIcon } from '../components/icons';
import { useSettings } from '../contexts/SettingsContext';
import { useHistory } from '../contexts/HistoryContext';

// --- Sub-components (Term/Rule Managers) ---

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void; }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={onChange} className="sr-only peer" />
        <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--primary-700)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-500)]"></div>
    </label>
);

const RulesManager = ({ rules, setRules }: { rules: Rule[], setRules: React.Dispatch<React.SetStateAction<Rule[]>> }) => {
    const [newRule, setNewRule] = useState('');
    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRule.trim() && !rules.some((r) => r.text.toLowerCase() === newRule.trim().toLowerCase())) {
            setRules((prev) => [...prev, { id: crypto.randomUUID(), text: newRule.trim(), enabled: true }]);
            setNewRule('');
        }
    };
    const handleDeleteRule = (id: string) => setRules((prev) => prev.filter(r => r.id !== id));
    const handleToggleRule = (id: string) => setRules((prev) => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));

    return (
        <section>
            <form onSubmit={handleAddRule} className="flex gap-2 mb-3">
                <input type="text" value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="VD: Claire xưng 'em' với Lily..." className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2" />
                <button type="submit" className="p-2 text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg"><PlusIcon className="w-5 h-5" /></button>
            </form>
            <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                {rules.length > 0 ? rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg gap-4">
                        <p className={`text-gray-200 text-sm transition-opacity flex-1 ${!rule.enabled ? 'opacity-50 line-through' : ''}`}>{rule.text}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <ToggleSwitch enabled={rule.enabled} onChange={() => handleToggleRule(rule.id)} />
                            <button onClick={() => handleDeleteRule(rule.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 text-sm py-4">Chưa có luật lệ nào.</p>}
            </div>
        </section>
    );
};

const TerminologyManager = ({ keywords, setKeywords, properNouns, setProperNouns }: any) => {
    const [newKeyword, setNewKeyword] = useState('');
    const [newProperNounSource, setNewProperNounSource] = useState('');
    const [newProperNounTranslation, setNewProperNounTranslation] = useState('');

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newKeyword.trim() && !keywords.some((k: Keyword) => k.value.toLowerCase() === newKeyword.trim().toLowerCase())) {
            setKeywords((prev: Keyword[]) => [...prev, { id: crypto.randomUUID(), value: newKeyword.trim(), enabled: true }]);
            setNewKeyword('');
        }
    };
    const handleDeleteKeyword = (id: string) => setKeywords((prev: Keyword[]) => prev.filter(k => k.id !== id));
    const handleToggleKeyword = (id: string) => setKeywords((prev: Keyword[]) => prev.map(k => k.id === id ? { ...k, enabled: !k.enabled } : k));

    const handleAddProperNoun = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProperNounSource.trim() && newProperNounTranslation.trim() && !properNouns.some((p: ProperNoun) => p.source.toLowerCase() === newProperNounSource.trim().toLowerCase())) {
            setProperNouns((prev: ProperNoun[]) => [...prev, { id: crypto.randomUUID(), source: newProperNounSource.trim(), translation: newProperNounTranslation.trim(), enabled: true }]);
            setNewProperNounSource('');
            setNewProperNounTranslation('');
        }
    };
    const handleDeleteProperNoun = (id: string) => setProperNouns((prev: ProperNoun[]) => prev.filter(p => p.id !== id));
    const handleToggleProperNoun = (id: string) => setProperNouns((prev: ProperNoun[]) => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
                <h3 className="text-base font-semibold mb-3 text-gray-300">Từ khóa (Không dịch)</h3>
                <form onSubmit={handleAddKeyword} className="flex gap-2 mb-3">
                    <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="Thêm từ khóa..." className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2" />
                    <button type="submit" className="p-2 text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg"><PlusIcon className="w-5 h-5" /></button>
                </form>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                    {keywords.length > 0 ? keywords.map((keyword: Keyword) => (
                        <div key={keyword.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                            <span className={`text-gray-200 text-sm transition-opacity ${!keyword.enabled ? 'opacity-50 line-through' : ''}`}>{keyword.value}</span>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch enabled={keyword.enabled} onChange={() => handleToggleKeyword(keyword.id)} />
                                <button onClick={() => handleDeleteKeyword(keyword.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500 text-sm py-4">Chưa có từ khóa.</p>}
                </div>
            </section>
            <section>
                <h3 className="text-base font-semibold mb-3 text-gray-300">Tên riêng (Dịch theo quy tắc)</h3>
                <form onSubmit={handleAddProperNoun} className="space-y-2 mb-3">
                    <div className="flex gap-2">
                        <input type="text" value={newProperNounSource} onChange={(e) => setNewProperNounSource(e.target.value)} placeholder="Tên gốc" className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2" />
                        <input type="text" value={newProperNounTranslation} onChange={(e) => setNewProperNounTranslation(e.target.value)} placeholder="Bản dịch" className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2" />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 p-2 text-sm text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg"><PlusIcon className="w-5 h-5" /> Thêm quy tắc</button>
                </form>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                    {properNouns.length > 0 ? properNouns.map((noun: ProperNoun) => (
                         <div key={noun.id} className={`flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm transition-opacity ${!noun.enabled ? 'opacity-50' : ''}`}>
                            <div className={`flex items-center gap-2 ${!noun.enabled ? 'line-through' : ''}`}>
                                <span className="text-gray-300">{noun.source}</span>
                                <span className="text-gray-500">→</span>
                                <span className="text-purple-300 font-semibold">{noun.translation}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <ToggleSwitch enabled={noun.enabled} onChange={() => handleToggleProperNoun(noun.id)} />
                                <button onClick={() => handleDeleteProperNoun(noun.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500 text-sm py-4">Chưa có quy tắc.</p>}
                </div>
            </section>
        </div>
    );
};

interface TranslationPageProps {
  onOpenApiSettings: (isOpen: boolean) => void;
}

const TranslationPage: React.FC<TranslationPageProps> = ({ onOpenApiSettings }) => {
  const { 
    activeApiKey, model, safetySettings, 
    keywords, setKeywords, properNouns, setProperNouns, rules, setRules,
    isAutoSpacingEnabled, setIsAutoSpacingEnabled,
    modelParams, presets, activePresetId, setActivePresetId,
    addNotification 
  } = useSettings();
  
  const { addTranslationHistory } = useHistory();

  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('vi');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TranslationResult['usage'] | null>(null);
  
  const [isTerminologyManagerOpen, setIsTerminologyManagerOpen] = useState(false);
  const [isRulesManagerOpen, setIsRulesManagerOpen] = useState(false);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [textAreaPanelHeight, setTextAreaPanelHeight] = useState<number | null>(null);
  const [isVResizing, setIsVResizing] = useState(false);
  const textAreaContainerRef = useRef<HTMLDivElement>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const isSyncing = useRef(false);

  // Load saved input text
  useEffect(() => {
    const saved = localStorage.getItem('translation_input_text');
    if (saved) setInputText(saved);
  }, []);

  useEffect(() => {
     const handler = setTimeout(() => localStorage.setItem('translation_input_text', inputText), 500);
     return () => clearTimeout(handler);
  }, [inputText]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isAutoSpacingEnabled) return;
    e.preventDefault(); 
    const pastedText = e.clipboardData.getData('text');
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = inputText.substring(0, start);
    const textAfter = inputText.substring(end);
    let prefix = "";
    if (textBefore.length > 0) {
         if (!textBefore.endsWith('\n')) prefix = "\n\n"; 
         else if (!textBefore.endsWith('\n\n')) prefix = "\n"; 
    }
    const textToInsert = prefix + pastedText + '\n\n';
    const newText = textBefore + textToInsert + textAfter;
    setInputText(newText);
    setTimeout(() => {
        if (textarea) {
            textarea.value = newText;
            const newCursorPosition = start + textToInsert.length;
            textarea.selectionStart = newCursorPosition;
            textarea.selectionEnd = newCursorPosition;
            textarea.blur(); textarea.focus(); textarea.scrollTop = textarea.scrollHeight;
        }
    }, 0);
  }, [isAutoSpacingEnabled, inputText]);

  const handleTranslate = useCallback(() => {
    if (!inputText.trim() || isLoading) return;
    if (!activeApiKey) {
        setError('Vui lòng thiết lập một API Key hợp lệ trong phần Cài đặt.');
        onOpenApiSettings(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    setTranslatedText('');
    setTokenUsage(null);

    const terminology = { keywords, properNouns };
    const currentPreset = presets.find(p => p.id === activePresetId);

    translateText(
        inputText, 
        sourceLang, 
        targetLang, 
        activeApiKey, 
        model, 
        safetySettings, 
        terminology, 
        rules, 
        'general',
        modelParams,
        currentPreset
    )
    .then(result => {
        setTranslatedText(result.text);
        if (result.usage) setTokenUsage(result.usage);
        addTranslationHistory({ inputText, translatedText: result.text, sourceLang, targetLang });
        addNotification({ type: 'success', message: 'Dịch thành công!' });
    })
    .catch(err => {
        const errorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
        setError(errorMessage);
        addNotification({ type: 'error', message: `Lỗi: ${errorMessage}` });
    })
    .finally(() => setIsLoading(false));
  }, [inputText, sourceLang, targetLang, activeApiKey, model, onOpenApiSettings, addTranslationHistory, safetySettings, keywords, properNouns, rules, isLoading, addNotification, modelParams, presets, activePresetId]);

  const handleScroll = useCallback((scroller: HTMLTextAreaElement, target: HTMLTextAreaElement | null) => {
    if (!target || isSyncing.current) return;
    isSyncing.current = true;
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const scrollRatio = scrollHeight - clientHeight > 0 ? scrollTop / (scrollHeight - clientHeight) : 0;
    target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
            if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
        }
        if (isVResizing && textAreaContainerRef.current) {
             const rect = textAreaContainerRef.current.getBoundingClientRect();
             let newHeight = e.clientY - rect.top;
             if (newHeight < 200) newHeight = 200;
             setTextAreaPanelHeight(newHeight);
        }
    };
    const handleMouseUp = () => { setIsDragging(false); setIsVResizing(false); };
    if (isDragging || isVResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, isVResizing]);


  return (
     <div className="max-w-7xl mx-auto h-full flex flex-col">
        <header className="text-center mb-4 flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Bắt đầu Dịch</h1>
            <p className="mt-2 text-gray-400">Công cụ dịch thuật chuyên dụng cho visual novel và game.</p>
        </header>

        <main className="flex-grow flex flex-col min-h-0">
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex-shrink-0" role="alert">
                <strong className="font-bold">Lỗi: </strong><span className="block sm:inline">{error}</span>
                </div>
            )}
             <div className="flex-shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                     <div className="flex items-center gap-3">
                        <ToggleSwitch enabled={isAutoSpacingEnabled} onChange={() => setIsAutoSpacingEnabled(p => !p)} />
                        <label className="text-xs text-gray-400 cursor-pointer" onClick={() => setIsAutoSpacingEnabled(p => !p)}>Tự động cách dòng</label>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Preset:</label>
                        <select 
                            value={activePresetId}
                            onChange={(e) => setActivePresetId(e.target.value)}
                            className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg p-2 focus:ring-purple-500"
                        >
                            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-6">
                    <div className="w-full md:w-auto md:flex-1"><LanguageSelector label="Dịch từ" value={sourceLang} onChange={setSourceLang} options={SOURCE_LANGUAGES_WITH_AUTO} /></div>
                    <button onClick={() => { if(sourceLang !== 'auto') { const t = sourceLang; setSourceLang(targetLang); setTargetLang(t); } }} disabled={sourceLang === 'auto'} className="p-2 mt-4 md:mt-6 rounded-full bg-gray-700 hover:bg-[var(--primary-600)] text-white transition-all transform hover:rotate-180 disabled:opacity-50 disabled:transform-none"><SwitchIcon className="w-6 h-6" /></button>
                    <div className="w-full md:w-auto md:flex-1"><LanguageSelector label="Sang" value={targetLang} onChange={setTargetLang} options={SUPPORTED_LANGUAGES} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-shrink-0">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl self-start">
                    <button onClick={() => setIsTerminologyManagerOpen(!isTerminologyManagerOpen)} className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-200 hover:bg-gray-700/20 rounded-t-xl">
                        <div className="flex items-center gap-2"><BookOpenIcon className="w-5 h-5" /> Quản lý Thuật ngữ</div>
                        <ChevronRightIcon className={`w-5 h-5 transition-transform ${isTerminologyManagerOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isTerminologyManagerOpen && <div className="p-4 border-t border-gray-700/50"><TerminologyManager keywords={keywords} setKeywords={setKeywords} properNouns={properNouns} setProperNouns={setProperNouns} /></div>}
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl self-start">
                    <button onClick={() => setIsRulesManagerOpen(!isRulesManagerOpen)} className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-200 hover:bg-gray-700/20 rounded-t-xl">
                        <div className="flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5" /> Luật lệ Ngữ cảnh</div>
                        <ChevronRightIcon className={`w-5 h-5 transition-transform ${isRulesManagerOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isRulesManagerOpen && <div className="p-4 border-t border-gray-700/50"><RulesManager rules={rules} setRules={setRules} /></div>}
                </div>
            </div>

            <div ref={textAreaContainerRef} className={`min-h-0 relative ${!textAreaPanelHeight ? 'flex-grow' : ''}`} style={{ height: textAreaPanelHeight ? `${textAreaPanelHeight}px` : undefined }}>
                <div className="absolute inset-0 hidden lg:flex" ref={containerRef}>
                    <div style={{ width: `calc(${leftPanelWidth}% - 4px)` }}>
                        <TextAreaPanel ref={inputRef} onScroll={(e) => handleScroll(e.currentTarget, outputRef.current)} onPaste={handlePaste} id="input-text" label={SOURCE_LANGUAGES_WITH_AUTO.find(l => l.code === sourceLang)?.name || 'Văn bản gốc'} value={inputText} onChange={setInputText} placeholder="Nhập văn bản game cần dịch ở đây..." isReadOnly={false} charCount={inputText.length} />
                    </div>
                    <div onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }} className="w-2 cursor-col-resize bg-gray-700/50 hover:bg-[var(--primary-600)] rounded-md transition-colors mx-1"></div>
                    <div style={{ width: `calc(${100 - leftPanelWidth}% - 4px)` }} className="relative flex flex-col">
                        <TextAreaPanel ref={outputRef} onScroll={(e) => handleScroll(e.currentTarget, inputRef.current)} id="translated-text" label={SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Bản dịch'} value={translatedText} placeholder="Bản dịch sẽ xuất hiện ở đây..." isReadOnly={true} charCount={translatedText.length} />
                        {isLoading && (
                            <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center rounded-xl z-10">
                                <div className="flex flex-col items-center gap-4"><svg className="animate-spin h-8 w-8 text-[var(--primary-400)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span className="text-gray-300">Đang dịch...</span></div>
                            </div>
                        )}
                    </div>
                </div>
                 {/* Mobile View */}
                 <div className="absolute inset-0 grid grid-cols-1 lg:hidden gap-6">
                    <TextAreaPanel onPaste={handlePaste} id="input-text-mobile" label="Văn bản gốc" value={inputText} onChange={setInputText} placeholder="..." isReadOnly={false} charCount={inputText.length} />
                    <div className="relative">
                        <TextAreaPanel id="translated-text-mobile" label="Bản dịch" value={translatedText} placeholder="..." isReadOnly={true} charCount={translatedText.length} />
                        {isLoading && <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center rounded-xl z-10"><span className="text-gray-300">Đang dịch...</span></div>}
                    </div>
                 </div>
            </div>

            <div className="mt-2 flex justify-end px-1"><TokenUsageDisplay usage={tokenUsage} /></div>
            <div onMouseDown={(e) => { e.preventDefault(); setIsVResizing(true); }} className="h-2 cursor-row-resize bg-gray-700/50 hover:bg-[var(--primary-600)] rounded-md transition-colors my-1 flex-shrink-0"></div>

            <div className="mt-6 flex justify-center flex-shrink-0">
                <button onClick={handleTranslate} disabled={isLoading || !inputText.trim()} className="inline-flex items-center gap-2 justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all">
                {isLoading ? "Đang xử lý..." : <><TranslateIcon className="w-5 h-5" /> Dịch</>}
                </button>
            </div>
        </main>
    </div>
  );
};

export default TranslationPage;
