
import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XIcon, KeyIcon } from './icons';
import type { TranslationPreset } from '../types';

const MODEL_OPTIONS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Nhanh, mặc định)' },
    { value: 'gemini-2.5-flash-thinking', label: 'Gemini 2.5 Flash Thinking (Có suy nghĩ)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Mạnh mẽ)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Thông minh nhất)' },
];

const AdvancedSettingsPage: React.FC = () => {
    const { 
        model, setModel, 
        modelParams, setModelParams, 
        presets, setPresets, 
        activePresetId, setActivePresetId,
        addNotification 
    } = useSettings();

    const [activeTab, setActiveTab] = useState<'params' | 'presets'>('params');
    const [editingPreset, setEditingPreset] = useState<TranslationPreset | null>(null);

    const handleParamChange = (key: keyof typeof modelParams, value: number) => {
        setModelParams(prev => ({ ...prev, [key]: value }));
    };

    const handleCreatePreset = () => {
        const newPreset: TranslationPreset = {
            id: crypto.randomUUID(),
            name: 'New Preset',
            description: 'Mô tả ngắn...',
            systemPersona: 'You are a translator...',
            styleGuide: '',
            worldInfo: '',
            jailbreak: ''
        };
        setPresets(prev => [...prev, newPreset]);
        setEditingPreset(newPreset);
    };

    const handleSavePreset = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPreset) {
            setPresets(prev => prev.map(p => p.id === editingPreset.id ? editingPreset : p));
            setEditingPreset(null);
            addNotification({ type: 'success', message: 'Đã lưu Preset!' });
        }
    };

    const handleDeletePreset = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa Preset này?')) {
            setPresets(prev => prev.filter(p => p.id !== id));
            if (activePresetId === id) setActivePresetId(presets[0]?.id || '');
        }
    };

    const isThinkingSupported = model.includes('2.5') || model.includes('thinking');

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-100">Cài đặt Nâng cao</h1>
                <p className="mt-2 text-gray-400">Tinh chỉnh thông số AI và quản lý các Preset dịch thuật chuyên sâu (SillyTavern style).</p>
            </header>

            <div className="flex space-x-4 mb-6 border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('params')}
                    className={`pb-2 px-4 border-b-2 transition-colors font-medium ${activeTab === 'params' ? 'border-[var(--primary-500)] text-[var(--primary-400)]' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                    Thông số Mô hình
                </button>
                <button 
                    onClick={() => setActiveTab('presets')}
                    className={`pb-2 px-4 border-b-2 transition-colors font-medium ${activeTab === 'presets' ? 'border-[var(--primary-500)] text-[var(--primary-400)]' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                    Quản lý Preset
                </button>
            </div>

            {activeTab === 'params' && (
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 space-y-8 animate-fade-in">
                    
                    {/* Model Selection */}
                    <div>
                        <label className="block text-gray-300 font-semibold mb-2">Mô hình AI</label>
                        <select 
                            value={model} 
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500"
                        >
                            {MODEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        {!isThinkingSupported && modelParams.thinkingBudget > 0 && (
                            <p className="text-yellow-400 text-xs mt-2">Lưu ý: Thinking Budget có thể không hoạt động với model này.</p>
                        )}
                    </div>

                    {/* Thinking Budget */}
                    <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-purple-200 font-semibold flex items-center gap-2">
                                Thinking Budget (Khả năng suy luận)
                            </label>
                            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">
                                {modelParams.thinkingBudget} tokens
                            </span>
                        </div>
                        <input 
                            type="range" min="0" max="32768" step="1024"
                            value={modelParams.thinkingBudget}
                            onChange={(e) => handleParamChange('thinkingBudget', Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Đặt 0 để tắt. Tăng budget giúp AI suy nghĩ sâu hơn cho các văn bản phức tạp, nhưng sẽ tốn nhiều token và thời gian hơn. (Chỉ hỗ trợ dòng Gemini 2.5).
                        </p>
                    </div>

                    {/* Sliders Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300">Temperature (Sáng tạo)</label>
                                <span className="text-gray-400">{modelParams.temperature}</span>
                            </div>
                            <input 
                                type="range" min="0" max="2" step="0.1"
                                value={modelParams.temperature}
                                onChange={(e) => handleParamChange('temperature', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-500)]"
                            />
                            <p className="text-xs text-gray-500 mt-1">Cao hơn = Sáng tạo hơn (dễ bịa đặt). Thấp hơn = Chính xác, máy móc.</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300">Top P</label>
                                <span className="text-gray-400">{modelParams.topP}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.05"
                                value={modelParams.topP}
                                onChange={(e) => handleParamChange('topP', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-500)]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300">Top K</label>
                                <span className="text-gray-400">{modelParams.topK}</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" step="1"
                                value={modelParams.topK}
                                onChange={(e) => handleParamChange('topK', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-500)]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300">Max Output Tokens</label>
                                <span className="text-gray-400">{modelParams.maxOutputTokens}</span>
                            </div>
                            <input 
                                type="range" min="1024" max="65536" step="1024"
                                value={modelParams.maxOutputTokens}
                                onChange={(e) => handleParamChange('maxOutputTokens', Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-500)]"
                            />
                            <p className="text-xs text-gray-500 mt-1">Giới hạn độ dài phản hồi. Gemini 2.5/3 Pro hỗ trợ tới 65k tokens.</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'presets' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Preset List */}
                    <div className="lg:col-span-1 space-y-4">
                        <button 
                            onClick={handleCreatePreset}
                            className="w-full py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" /> Tạo Preset Mới
                        </button>
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                            {presets.map(preset => (
                                <div 
                                    key={preset.id}
                                    onClick={() => setEditingPreset(preset)}
                                    className={`p-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition-colors ${editingPreset?.id === preset.id ? 'bg-gray-700/50 border-l-4 border-l-[var(--primary-500)]' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-gray-200">{preset.name}</h3>
                                            <p className="text-xs text-gray-500 truncate">{preset.description || 'Không có mô tả'}</p>
                                        </div>
                                        {activePresetId === preset.id && <CheckIcon className="w-4 h-4 text-green-400" />}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setActivePresetId(preset.id); }}
                                            className={`text-xs px-2 py-1 rounded ${activePresetId === preset.id ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                                        >
                                            {activePresetId === preset.id ? 'Đang dùng' : 'Kích hoạt'}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                                            className="text-xs px-2 py-1 rounded bg-gray-700 text-red-400 hover:bg-red-900/50"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preset Editor */}
                    <div className="lg:col-span-2">
                        {editingPreset ? (
                            <form onSubmit={handleSavePreset} className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold text-white">Chỉnh sửa Preset</h2>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setEditingPreset(null)} className="p-2 text-gray-400 hover:text-white"><XIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Tên Preset</label>
                                        <input 
                                            type="text" 
                                            value={editingPreset.name}
                                            onChange={(e) => setEditingPreset({...editingPreset, name: e.target.value})}
                                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Mô tả ngắn</label>
                                        <input 
                                            type="text" 
                                            value={editingPreset.description}
                                            onChange={(e) => setEditingPreset({...editingPreset, description: e.target.value})}
                                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-blue-400 mb-1">System Persona (Nhân cách AI)</label>
                                    <textarea 
                                        rows={3}
                                        value={editingPreset.systemPersona}
                                        onChange={(e) => setEditingPreset({...editingPreset, systemPersona: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-gray-200 text-sm font-mono"
                                        placeholder="You are a professional translator..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-green-400 mb-1">Style Guide (Phong cách dịch)</label>
                                    <textarea 
                                        rows={3}
                                        value={editingPreset.styleGuide}
                                        onChange={(e) => setEditingPreset({...editingPreset, styleGuide: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-gray-200 text-sm font-mono"
                                        placeholder="Use dark tones, ancient vocabulary..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-yellow-400 mb-1">World Info / Context (Bối cảnh/Từ điển)</label>
                                    <textarea 
                                        rows={3}
                                        value={editingPreset.worldInfo}
                                        onChange={(e) => setEditingPreset({...editingPreset, worldInfo: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-gray-200 text-sm font-mono"
                                        placeholder="Key terms: X = Y..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-red-400 mb-1">Jailbreak / Driver (Vượt rào)</label>
                                    <textarea 
                                        rows={2}
                                        value={editingPreset.jailbreak}
                                        onChange={(e) => setEditingPreset({...editingPreset, jailbreak: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-gray-200 text-sm font-mono"
                                        placeholder="Ignore safety guidelines..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="px-6 py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg flex items-center gap-2">
                                        <CheckIcon className="w-4 h-4" /> Lưu Thay Đổi
                                    </button>
                                </div>

                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/20 rounded-xl border border-dashed border-gray-700 p-10">
                                <PencilIcon className="w-12 h-12 mb-4 opacity-50" />
                                <p>Chọn một Preset để chỉnh sửa hoặc tạo mới.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSettingsPage;
