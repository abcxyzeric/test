
export interface Language {
  code: string;
  name: string;
}

export interface TranslationHistoryItem {
  id: string;
  name?: string;
  inputText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  folderId?: string | null;
}

export interface AnalysisHistoryItem {
  id: string;
  fileName: string;
  originalContent: string;
  analysisResult: string;
  timestamp: number;
  folderId?: string | null;
}

// Interface mới cho dữ liệu RPG Maker đã tách
export interface RpgMakerEntry {
  id: string; // ID duy nhất để định danh vị trí (VD: EventID_PageID_CmdIdx)
  originalText: string;
  translatedText: string;
  type: 'dialogue' | 'choice' | 'other';
  speaker?: string; // Tên nhân vật (nếu có)
  status: 'pending' | 'translating' | 'done' | 'error';
  context?: string; // Thông tin ngữ cảnh (Event Name, Map ID...)
}

export interface RpgMakerFile {
  id: string;
  fileName: string;
  entries: RpgMakerEntry[];
  status: 'loaded' | 'processing' | 'done';
}

// --- REN'PY INTERFACES ---
export interface RenpyEntry {
    id: string;
    lineIndex: number; // Vị trí dòng trong mảng rawLines
    originalText: string; // Nội dung CẦN DỊCH (bên trong dấu ngoặc kép)
    translatedText: string;
    speaker?: string; // Tên biến nhân vật (VD: 'e')
    type: 'dialogue' | 'narrator' | 'choice';
    status: 'pending' | 'translating' | 'done' | 'error';
}

export interface RenpyFile {
    id: string;
    fileName: string;
    rawLines: string[]; // Lưu toàn bộ nội dung file gốc từng dòng để tái tạo
    entries: RenpyEntry[];
    status: 'loaded' | 'processing' | 'done';
}
// -------------------------

export interface HistoryFolder {
  id: string;
  name: string;
  type: 'translation' | 'analysis' | 'rpg_data'; 
  parentId?: string | null;
}

export interface Keyword {
  id: string;
  value: string;
  enabled: boolean;
}

export interface ProperNoun {
  id: string;
  source: string;
  translation: string;
  enabled: boolean;
}

export interface Rule {
  id: string;
  text: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export interface ProcessingFile {
  id: string;
  name: string;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

// Interface cho thông tin sử dụng Token
export interface TranslationUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

// Kết quả trả về từ service dịch
export interface TranslationResult {
  text: string;
  usage?: TranslationUsage;
}

// --- ADVANCED SETTINGS & PRESETS (SillyTavern Style) ---

export interface ModelParameters {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    thinkingBudget: number; // 0 to disable
}

export interface TranslationPreset {
    id: string;
    name: string;
    description?: string;
    // SillyTavern Style Layers
    systemPersona: string; // Who is the AI?
    styleGuide: string;    // How should it write? (Tone, formatting)
    worldInfo: string;     // Context, lore, glossary summary
    jailbreak: string;     // Overrides/Driver to force behavior
}
