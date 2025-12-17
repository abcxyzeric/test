
import type { RenpyEntry } from '../../types';

/**
 * Phân tích file script .rpy thành mảng các dòng và trích xuất các dòng hội thoại.
 * @param content Nội dung file .rpy
 * @returns Object chứa mảng rawLines (để tái tạo) và danh sách entries (để dịch)
 */
export function parseRenpyScript(content: string): { rawLines: string[], entries: RenpyEntry[] } {
    const rawLines = content.split(/\r?\n/);
    const entries: RenpyEntry[] = [];

    // Regex Rules:
    // 1. Dialogue: character "text" or just "text"
    // Capture: Group 1 (Indent), Group 2 (Speaker - optional), Group 3 (Open Quote), Group 4 (Content), Group 5 (Close Quote), Group 6 (Suffix - optional)
    // Note: Content (Group 4) uses ((?:[^"\\]|\\.)*) to handle escaped quotes inside the string.
    const dialogueRegex = /^(\s*)(?:(\w+)\s+)?(")((?:[^"\\]|\\.)*)(")(.*)$/;

    rawLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Bỏ qua comments và dòng trống
        if (!trimmedLine || trimmedLine.startsWith('#')) return;

        const match = line.match(dialogueRegex);
        if (match) {
            const [, indent, speaker, openQuote, content, closeQuote, suffix] = match;

            // Xác định loại (Choice nếu có dấu hai chấm ở cuối)
            let type: RenpyEntry['type'] = 'dialogue';
            if (suffix.trim().startsWith(':')) {
                type = 'choice';
            } else if (!speaker) {
                type = 'narrator';
            }

            // Loại bỏ các trường hợp code Ren'Py không phải thoại (VD: screen, style...)
            // Logic đơn giản: Nếu là choice hoặc có speaker hoặc là narrator
            // Cẩn trọng: Một số lệnh như 'image e = "path"' cũng khớp regex này.
            // Cải thiện: Nếu có speaker, check xem speaker có phải là keyword hệ thống không?
            const systemKeywords = ['image', 'define', 'default', 'label', 'jump', 'call', 'scene', 'show', 'play', 'stop', 'return', '$', 'if', 'elif', 'else', 'while', 'menu', 'window', 'init', 'transform', 'style', 'screen'];
            if (speaker && systemKeywords.includes(speaker)) {
                return; // Bỏ qua dòng lệnh
            }

            entries.push({
                id: `line_${index}`,
                lineIndex: index,
                originalText: content, // Chỉ lấy nội dung bên trong ngoặc kép
                translatedText: '',
                speaker: speaker || '',
                type: type,
                status: 'pending'
            });
        }
    });

    return { rawLines, entries };
}
