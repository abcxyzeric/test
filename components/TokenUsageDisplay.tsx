import React from 'react';
import type { TranslationUsage } from '../types';

interface TokenUsageDisplayProps {
  usage: TranslationUsage | null | undefined;
}

const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({ usage }) => {
  if (!usage) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-gray-900/50 border border-gray-700/50 rounded-lg px-4 py-2 mt-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Input Tokens:</span>
        <span className="text-blue-400 font-semibold">{usage.promptTokenCount?.toLocaleString() || 0}</span>
      </div>
      <div className="w-px h-3 bg-gray-700 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Output Tokens:</span>
        <span className="text-green-400 font-semibold">{usage.candidatesTokenCount?.toLocaleString() || 0}</span>
      </div>
      <div className="w-px h-3 bg-gray-700 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Total:</span>
        <span className="text-purple-400 font-semibold">{usage.totalTokenCount?.toLocaleString() || 0}</span>
      </div>
    </div>
  );
};

export default TokenUsageDisplay;
