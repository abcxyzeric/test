
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import type { SafetySetting } from "@google/genai";
import type { Keyword, ProperNoun, Rule, TranslationResult, ModelParameters, TranslationPreset } from '../types';
import { obfuscateText } from './inputFilter';
import { buildSystemInstruction } from './promptBuilder';

export interface CustomSafetySettings {
  enabled: boolean;
  thresholds: {
    [key in HarmCategory]: HarmBlockThreshold;
  };
}

const SUPPORTED_HARM_CATEGORIES: HarmCategory[] = [
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
];

const buildSafetySettings = (settings: CustomSafetySettings): SafetySetting[] => {
    if (!settings.enabled) {
        return SUPPORTED_HARM_CATEGORIES.map(category => ({
            category,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }));
    }
    return SUPPORTED_HARM_CATEGORIES.map(category => ({
        category,
        threshold: settings.thresholds[category] || HarmBlockThreshold.BLOCK_NONE,
    }));
};

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
  model: string,
  safetySettingsConfig: CustomSafetySettings,
  terminology: { keywords: Keyword[], properNouns: ProperNoun[] },
  rules: Rule[],
  mode: 'general' | 'rpg_maker' | 'renpy' = 'general',
  modelParams?: ModelParameters,
  preset?: TranslationPreset
): Promise<TranslationResult> {
  if (!apiKey) {
    throw new Error("API key is not configured.");
  }

  // Defaults if params/preset not provided
  const params: ModelParameters = modelParams || {
      temperature: 1.1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 65536,
      thinkingBudget: 0
  };

  const currentPreset: TranslationPreset = preset || {
      id: 'default',
      name: 'Default',
      systemPersona: 'You are a professional translator.',
      styleGuide: 'Translate accurately.',
      worldInfo: '',
      jailbreak: ''
  };

  const ai = new GoogleGenAI({ apiKey });

  // Handle Obfuscation Logic
  let processedText = text;
  let isObfuscated = false;
  
  if (!safetySettingsConfig.enabled) {
      processedText = obfuscateText(text);
      isObfuscated = true;
  }

  // Build System Instruction using the Helper Service
  const systemInstruction = buildSystemInstruction({
      sourceLang,
      targetLang,
      preset: currentPreset,
      terminology,
      rules,
      mode,
      isObfuscated
  });

  try {
    const safetySettings = buildSafetySettings(safetySettingsConfig);
    
    // Construct Config
    const config: any = {
        systemInstruction: systemInstruction,
        temperature: params.temperature,
        topP: params.topP,
        topK: params.topK,
        maxOutputTokens: params.maxOutputTokens,
        safetySettings,
    };

    // Add Thinking Config if budget > 0 and model supports it (Gemini 2.5 series)
    // Note: User responsibility to select correct model, but we apply config if set.
    if (params.thinkingBudget > 0) {
        config.thinkingConfig = { thinkingBudget: params.thinkingBudget };
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: processedText,
        config: config,
    });

    const responseText = response.text;
    const usage = response.usageMetadata;

    if (responseText) {
        return {
            text: responseText,
            usage: usage
        };
    }

    if (response.candidates && response.candidates.length > 0) {
        const finishReason = response.candidates[0].finishReason;
        if (finishReason === 'MAX_TOKENS') {
            throw new Error("Văn bản quá dài và đã vượt quá giới hạn output của model.");
        }
        if (finishReason === 'SAFETY') {
             const reason = response.candidates[0].safetyRatings?.[0]?.category || 'không xác định';
            throw new Error(`Nội dung đã bị chặn bởi bộ lọc an toàn (Danh mục: ${reason}).`);
        }
    }
    
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Yêu cầu bị chặn. Lý do: ${response.promptFeedback.blockReason}.`);
    }

    throw new Error("AI không trả về kết quả.");

  } catch (error) {
    console.error("Gemini API error:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error("API key không hợp lệ.");
        }
        if (error.message.includes('429')) {
            throw new Error("Đã vượt quá hạn ngạch API (429).");
        }
        // Return original error if it's one of our custom throws
        return Promise.reject(error);
    }
    throw new Error("Lỗi không xác định khi gọi Gemini API.");
  }
}

export async function generateTitleForTranslation(
    inputText: string,
    translatedText: string,
    apiKey: string
): Promise<string> {
    if (!apiKey) return "Không thể tạo tên";
    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = "Create a very short title (max 10 words) in Vietnamese for this content.";
        const prompt = `Original: ${inputText.substring(0, 500)}\nTranslated: ${translatedText.substring(0, 500)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction },
        });

        return response.text?.trim() || "Bản dịch mới";
    } catch (error) {
        return "Bản dịch mới";
    }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey.trim()) return false;
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'test',
        });
        return true;
    } catch (error) {
        return false;
    }
}
