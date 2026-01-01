use tauri::LogicalSize;

use crate::my_windows;

// 字体配置常量
const FONT_SIZE: f64 = 14.0; // 实际字体大小 14px


// 调整后的字符宽度系数
const CJK_WIDTH_RATIO: f64 = 1.0;      // 中文等宽字符
const ASCII_WIDE_RATIO: f64 = 0.7;     // 宽字母 (W, M, w, m) - 提高到0.7
const ASCII_NORMAL_RATIO: f64 = 0.55;  // 普通ASCII字符 - 提高到0.55
const ASCII_NARROW_RATIO: f64 = 0.35;  // 窄字符 - 提高到0.35
const SPACE_RATIO: f64 = 0.4;          // **单独定义空格宽度**
const TAB_WIDTH_RATIO: f64 = 2.0;

pub fn calculate_text_width(content: &str) -> LogicalSize<f64> {
    let mut total_width: f64 = 0.0;
    
    for c in content.chars() {
        let char_width = match c {
            // 中文字符（CJK统一表意文字）
            '\u{4E00}'..='\u{9FFF}' |  // 基本汉字
            '\u{3400}'..='\u{4DBF}' |  // 扩展A
            '\u{20000}'..='\u{2A6DF}' | // 扩展B
            '\u{2A700}'..='\u{2B73F}' | // 扩展C
            '\u{2B740}'..='\u{2B81F}' | // 扩展D
            '\u{2B820}'..='\u{2CEAF}' | // 扩展E
            '\u{F900}'..='\u{FAFF}' |   // 兼容汉字
            '\u{2F800}'..='\u{2FA1F}'   // 兼容补充
            => FONT_SIZE * CJK_WIDTH_RATIO,
            
            // 全角字符（包括全角标点、日文假名等）
            '\u{FF01}'..='\u{FF5E}' |  // 全角ASCII
            '\u{3000}'..='\u{303F}' |  // CJK标点
            '\u{3040}'..='\u{309F}' |  // 平假名
            '\u{30A0}'..='\u{30FF}'    // 片假名
            => FONT_SIZE * CJK_WIDTH_RATIO,
            
            // 韩文字符
            '\u{AC00}'..='\u{D7AF}' |  // 韩文音节
            '\u{1100}'..='\u{11FF}'    // 韩文字母
            => FONT_SIZE * CJK_WIDTH_RATIO,
            
            // 表情符号和特殊符号
            '\u{1F300}'..='\u{1F9FF}' | // 表情符号
            '\u{2600}'..='\u{26FF}' |   // 杂项符号
            '\u{2700}'..='\u{27BF}'     // 装饰符号
            => FONT_SIZE * CJK_WIDTH_RATIO,
            
            // 制表符
            '\t' => FONT_SIZE * TAB_WIDTH_RATIO,
            
            // 换行符（视为普通空格）
            '\n' | '\r' => FONT_SIZE * ASCII_NORMAL_RATIO,
            
            // 在匹配逻辑中修改:
            _ if c.is_ascii() => {
                match c {
                    // 空格单独处理
                    ' ' => FONT_SIZE * SPACE_RATIO,
                    // 宽字母
                    'W' | 'M' | 'w' | 'm' | '@' | '%' | '#' | '&' | '$'
                    => FONT_SIZE * ASCII_WIDE_RATIO,
                    
                    // 窄字符 (移除空格)
                    'i' | 'l' | 'I' | 'j' | 't' | 'f' | 'r' |
                    '.' | ',' | ':' | ';' | '\'' | '!' | '|' | '`'
                    => FONT_SIZE * ASCII_NARROW_RATIO,
                    
                    // 数字和大部分字母
                    '0'..='9' | 'a'..='z' | 'A'..='Z'
                    => FONT_SIZE * ASCII_NORMAL_RATIO,
                    
                    // 其他ASCII符号
                    _ => FONT_SIZE * ASCII_NORMAL_RATIO,
                }
            },
            
            // 其他Unicode字符，默认半角宽度
            _ => FONT_SIZE * ASCII_NORMAL_RATIO,
        };
        
        total_width += char_width;
    }
    
    // 添加左右边距
    let padding: f64 = 173.0;
    let calculated_width = total_width + padding;
    
    // 限制宽度范围：最小150，最大800
    let width = calculated_width.clamp(150.0, 800.0);
    
    LogicalSize::new(width, my_windows::WINDOW_HEIGHT_TRANSLATE_BUBBLE)
}

// 可选：支持多行文本计算
#[allow(dead_code)]
pub fn calculate_multiline_text_size(content: &str, max_width: f64) -> LogicalSize<f64> {
    let lines: Vec<&str> = content.lines().collect();
    let line_count = lines.len().max(1);
    
    // 计算最宽行的宽度
    let max_line_width = lines.iter()
        .map(|line| {
            let size = calculate_text_width(line);
            size.width
        })
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .unwrap_or(150.0);
    
    let width = max_line_width.min(max_width);
    let height = my_windows::WINDOW_HEIGHT_TRANSLATE_BUBBLE * line_count as f64;
    
    LogicalSize::new(width, height)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chinese_text() {
        let size = calculate_text_width("你好世界");
        // 4个中文字符 × 14px + 100px padding = 156px
        assert!(size.width >= 150.0 && size.width <= 200.0);
    }

    #[test]
    fn test_mixed_text() {
        let size = calculate_text_width("Hello 世界");
        // 验证宽度在合理范围内
        assert!(size.width >= 150.0 && size.width <= 800.0);
    }

    #[test]
    fn test_ascii_only() {
        let size = calculate_text_width("Hello World");
        assert!(size.width >= 150.0);
    }
}