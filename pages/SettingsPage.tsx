
import React from 'react';
import { PaletteIcon } from '../components/icons';
import { useSettings } from '../contexts/SettingsContext';

const ThemeButton = ({ themeName, color, currentTheme, setTheme }: any) => (
    <button
        onClick={() => setTheme(themeName)}
        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${currentTheme === themeName ? `border-[var(--primary-500)] bg-gray-800` : 'border-gray-700 hover:border-gray-600'}`}
    >
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full" style={{ background: color }}></div>
            <span className="capitalize font-semibold">{themeName}</span>
        </div>
    </button>
);

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useSettings();

  return (
    <div className="max-w-4xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Giao diện</h1>
            <p className="mt-2 text-gray-400">Tùy chỉnh màu sắc giao diện theo ý thích của bạn.</p>
        </header>
        <div className="space-y-8">
             <section className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><PaletteIcon className="w-6 h-6"/>Thay đổi màu giao diện</h2>
                <p className="text-gray-400 mb-4">Chọn một bảng màu phù hợp với sở thích của bạn.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ThemeButton themeName="purple" color="linear-gradient(to right, #c084fc, #ec4899)" currentTheme={theme} setTheme={setTheme} />
                    <ThemeButton themeName="blue" color="linear-gradient(to right, #60a5fa, #22d3ee)" currentTheme={theme} setTheme={setTheme} />
                    <ThemeButton themeName="green" color="linear-gradient(to right, #4ade80, #facc15)" currentTheme={theme} setTheme={setTheme} />
                </div>
            </section>
        </div>
    </div>
  )
};

export default SettingsPage;
