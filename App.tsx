
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RpgMakerFile, RenpyFile, Notification } from './types';
import SideNav from './components/SideNav';
import SettingsModal from './components/SettingsModal';
import { NotificationContainer } from './components/Notification';
import { ChevronRightIcon } from './components/icons';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { HistoryProvider } from './contexts/HistoryContext';

// Pages
import TranslationPage from './pages/TranslationPage';
import SettingsPage from './pages/SettingsPage';
import RpgMakerParserPage from './components/ScriptAnalyzerPage';
import RenpyParserPage from './components/RenpyParserPage';
import HistoryPage from './components/HistoryPage';
import SafetySettingsPage from './components/SafetySettingsPage';
import AdvancedSettingsPage from './components/AdvancedSettingsPage';

// Theme configuration
const themes: { [key: string]: { [key: string]: string } } = {
  purple: { '--primary-400': '#c084fc', '--primary-500': '#a855f7', '--primary-600': '#9333ea', '--primary-700': '#7e22ce', '--secondary-600': '#ec4899' },
  blue: { '--primary-400': '#60a5fa', '--primary-500': '#3b82f6', '--primary-600': '#2563eb', '--primary-700': '#1d4ed8', '--secondary-600': '#22d3ee' },
  green: { '--primary-400': '#4ade80', '--primary-500': '#22c55e', '--primary-600': '#16a34a', '--primary-700': '#15803d', '--secondary-600': '#facc15' },
};

// Main Layout Component
const AppLayout: React.FC = () => {
    type Page = 'start' | 'settings' | 'rpg_parser' | 'renpy_parser' | 'history' | 'safetySettings' | 'advancedSettings';
    const [currentPage, setCurrentPage] = useState<Page>('start');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Sidebar state
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [buttonY, setButtonY] = useState('50%');
    const resizerRef = useRef<HTMLDivElement>(null);

    // Context Hooks
    const { theme, updateActiveKey, notifications, removeNotification, addNotification, safetySettings, setSafetySettings } = useSettings();

    // File State (Still kept at App level or could move to specific context/page if persisted)
    const [rpgFiles, setRpgFiles] = useState<RpgMakerFile[]>([]);
    const [rpgMapInfos, setRpgMapInfos] = useState<Record<number, any>>({});
    const [renpyFiles, setRenpyFiles] = useState<RenpyFile[]>([]);

    useEffect(() => {
        const activeTheme = themes[theme as keyof typeof themes];
        if (activeTheme) {
            for (const [key, value] of Object.entries(activeTheme)) {
                document.documentElement.style.setProperty(key, value);
            }
        }
    }, [theme]);

    useEffect(() => {
        const savedSidebarWidth = localStorage.getItem('sidebar_width');
        if (savedSidebarWidth) setSidebarWidth(Number(savedSidebarWidth));
        const savedCollapsed = localStorage.getItem('sidebar_collapsed');
        if (savedCollapsed) setIsSidebarCollapsed(JSON.parse(savedCollapsed));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (resizerRef.current) {
            const rect = resizerRef.current.parentElement!.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const clampedY = Math.max(40, Math.min(y, rect.height - 40));
            setButtonY(`${clampedY}px`);
        }
    }, []);
    const handleResizerMouseEnter = useCallback(() => window.addEventListener('mousemove', handleGlobalMouseMove), [handleGlobalMouseMove]);
    const handleResizerMouseLeave = useCallback(() => {
        if (!isResizing) { window.removeEventListener('mousemove', handleGlobalMouseMove); setButtonY('50%'); }
    }, [isResizing, handleGlobalMouseMove]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 200) newWidth = 200; 
            if (newWidth > 500) newWidth = 500;
            setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => {
            if (isResizing) { setIsResizing(false); window.removeEventListener('mousemove', handleGlobalMouseMove); localStorage.setItem('sidebar_width', String(sidebarWidth)); }
        };
        if (isResizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('mousemove', handleGlobalMouseMove); };
    }, [isResizing, sidebarWidth, handleGlobalMouseMove]);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
            if (!newState && sidebarWidth < 200) { const newWidth = 256; setSidebarWidth(newWidth); localStorage.setItem('sidebar_width', String(newWidth)); }
            return newState;
        });
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'start': return <TranslationPage onOpenApiSettings={() => setIsSettingsOpen(true)} />;
            case 'rpg_parser': return <RpgMakerParserPage onOpenApiSettings={() => setIsSettingsOpen(true)} onShowNotification={addNotification} files={rpgFiles} setFiles={setRpgFiles} mapInfos={rpgMapInfos} setMapInfos={setRpgMapInfos} />;
            case 'renpy_parser': return <RenpyParserPage onOpenApiSettings={() => setIsSettingsOpen(true)} onShowNotification={addNotification} files={renpyFiles} setFiles={setRenpyFiles} />;
            case 'history': return <HistoryPage />;
            case 'settings': return <SettingsPage />;
            case 'safetySettings': return <SafetySettingsPage settings={safetySettings} onSettingsChange={setSafetySettings} />;
            case 'advancedSettings': return <AdvancedSettingsPage />;
            default: return null;
        }
    }

    return (
        <div className="flex min-h-screen">
            <SideNav 
                style={{ width: `${isSidebarCollapsed ? 0 : sidebarWidth}px`, transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                currentPage={currentPage} 
                onNavigate={setCurrentPage} 
                onOpenApiSettings={() => setIsSettingsOpen(true)}
                isCollapsed={isSidebarCollapsed}
            />
            <div ref={resizerRef} className="relative flex-shrink-0 cursor-col-resize group px-2" onMouseDown={handleMouseDown} onMouseEnter={handleResizerMouseEnter} onMouseLeave={handleResizerMouseLeave}>
                <div className={`w-1.5 h-full transition-colors ${isResizing ? 'bg-[var(--primary-600)]' : 'bg-gray-700/20 group-hover:bg-[var(--primary-600)]'}`} />
                <button onClick={toggleSidebar} title={isSidebarCollapsed ? 'Hiện menu' : 'Ẩn menu'} className="absolute -translate-y-1/2 left-1/2 -translate-x-1/2 z-20 w-6 h-10 bg-gray-800 hover:bg-[var(--primary-600)] text-white flex items-center justify-center rounded-md cursor-pointer border-2 border-gray-700 hover:border-[var(--primary-500)] transition-all" style={{ top: buttonY, transition: 'top 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <ChevronRightIcon className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                </button>
            </div>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{renderPage()}</main>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onKeysUpdated={updateActiveKey} />
            <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
        </div>
    );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <HistoryProvider>
        <AppLayout />
      </HistoryProvider>
    </SettingsProvider>
  );
};

export default App;
