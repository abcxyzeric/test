
import type { RpgMakerEntry } from '../../types';

export function parseRpgMakerData(jsonContent: string, fileName: string, mapInfos?: Record<number, any>): RpgMakerEntry[] {
    const data = JSON.parse(jsonContent);
    if (!data) return [];

    const entries: RpgMakerEntry[] = [];
    
    // Helper logic để lấy tên Map
    let mapContextName = '';
    
    // Nếu là file Map (có events), thử lấy tên hiển thị và tên editor
    if (data.events && Array.isArray(data.events)) {
        // 1. Lấy Display Name (Tên hiển thị trong game) từ file Map
        const displayName = data.displayName || '';

        // 2. Lấy Editor Name (Tên trong Map Tree) từ mapInfos nếu có
        let editorName = '';
        const mapIdMatch = fileName.match(/Map(\d+)\.json/i);
        if (mapIdMatch && mapInfos) {
            const mapId = parseInt(mapIdMatch[1], 10);
            if (mapInfos[mapId] && mapInfos[mapId].name) {
                editorName = mapInfos[mapId].name;
            }
        }

        // Xây dựng chuỗi tên Map tổng hợp
        if (editorName && displayName) {
            mapContextName = `${editorName} (${displayName})`;
        } else if (editorName) {
            mapContextName = editorName;
        } else if (displayName) {
            mapContextName = `Map (${displayName})`;
        }
    }

    // Helper to process a command list
    // Cập nhật nâng cấp: Gom nhóm text theo Event/Page.
    // Tách riêng 1 event ra 1 khung (1 Entry), nhưng các đoạn text trong đó cách nhau 1 dòng (\n\n).
    const processList = (list: any[], contextPrefix: string, eventLabel: string) => {
        if (!Array.isArray(list)) return;

        let pageTextParts: string[] = []; // Chứa các khối văn bản (bubbles) của cả page
        let currentBuffer: string[] = []; // Chứa các dòng của 1 bubble đang xử lý

        // Đẩy buffer hiện tại vào danh sách các phần của page
        const flushBuffer = () => {
            if (currentBuffer.length > 0) {
                // QUAN TRỌNG: Giữ nguyên \n<Name> trong text, không trích xuất ra speaker nữa.
                const text = currentBuffer.join('\n'); 
                pageTextParts.push(text);
                currentBuffer = [];
            }
        };

        for (let i = 0; i < list.length; i++) {
            const cmd = list[i];
            if (!cmd) continue;

            // Code 101: Show Text Setup
            if (cmd.code === 101) {
                flushBuffer(); // Kết thúc message trước đó (nếu có)
                // KHÔNG trích xuất tên nhân vật từ tham số nữa.
            }
            // Code 401: Show Text Data
            else if (cmd.code === 401) {
                currentBuffer.push(cmd.parameters[0]);
            }
            // Code 102: Show Choices
            else if (cmd.code === 102) {
                flushBuffer(); // Kết thúc message trước đó
                
                // Gom Choice vào cùng một khung text để đảm bảo "1 Event = 1 Khung"
                // Đánh dấu Choice bằng prefix [Choice] để dễ phân biệt
                const choices = cmd.parameters[0];
                if (Array.isArray(choices)) {
                    choices.forEach((choice: string) => {
                        pageTextParts.push(`[Choice] ${choice}`);
                    });
                }
            }
            // Các code khác làm ngắt quãng hội thoại
            else {
                flushBuffer();
            }
        }
        flushBuffer(); // Flush buffer còn lại cuối cùng

        // Nếu có nội dung text trong page này, tạo 1 Entry duy nhất
        if (pageTextParts.length > 0) {
             const fullContext = mapContextName ? `[${mapContextName}] ${eventLabel}` : eventLabel;
             
             // QUAN TRỌNG: Các khối text tách nhau ra 1 dòng (\n\n) để phân biệt
             const combinedText = pageTextParts.join('\n\n');

             entries.push({
                id: `${contextPrefix}_merged`,
                originalText: combinedText,
                translatedText: '',
                type: 'dialogue',
                speaker: '', // Không dùng speaker name nữa
                status: 'pending',
                context: fullContext
            });
        }
    };

    // Case 1: Map File (Has 'events' array)
    if (data.events && Array.isArray(data.events)) {
        data.events.forEach((event: any, eventIndex: number) => {
            if (event && event.pages && Array.isArray(event.pages)) {
                const eventId = event.id !== undefined ? event.id : eventIndex;
                const eventName = event.name || `EV${eventId}`;
                const eventLabel = `${eventId.toString().padStart(3, '0')} ${eventName}`;

                event.pages.forEach((page: any, pageIndex: number) => {
                    if (page.list) {
                        processList(page.list, `Ev_${eventId}_Pg_${pageIndex}`, eventLabel);
                    }
                });
            }
        });
    }
    // Case 2: CommonEvents or Troops (Root is array)
    else if (Array.isArray(data)) {
        data.forEach((item: any, index: number) => {
            if (!item) return;
            const itemId = item.id !== undefined ? item.id : index;

            if (item.list) {
                 const name = item.name || `CommonEvent${itemId}`;
                 const eventLabel = `Common ${itemId.toString().padStart(3, '0')}: ${name}`;
                 processList(item.list, `Common_${itemId}`, eventLabel);
            }
            else if (item.pages && Array.isArray(item.pages)) {
                 const name = item.name || `Troop${itemId}`;
                 const eventLabel = `Troop ${itemId.toString().padStart(3, '0')}: ${name}`;
                 item.pages.forEach((page: any, pageIndex: number) => {
                    if (page.list) {
                        processList(page.list, `Troop_${itemId}_Pg_${pageIndex}`, eventLabel);
                    }
                 });
            }
        });
    }

    return entries.filter(e => e.originalText.trim() !== '');
}
