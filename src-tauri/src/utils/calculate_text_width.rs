use tauri::LogicalSize;
pub fn calculate_text_width(content: &str) -> LogicalSize<f64> {
    // 计算文本宽度
    let mut total_width: f64 = 0.0;
    
    for c in content.chars() {
        total_width += match c {
            // 中文字符（CJK统一表意文字）
            '\u{4E00}'..='\u{9FFF}' |  // 基本汉字
            '\u{3400}'..='\u{4DBF}' |  // 扩展A
            '\u{20000}'..='\u{2A6DF}' | // 扩展B
            '\u{2A700}'..='\u{2B73F}' | // 扩展C
            '\u{2B740}'..='\u{2B81F}' | // 扩展D
            '\u{2B820}'..='\u{2CEAF}' | // 扩展E
            '\u{F900}'..='\u{FAFF}' |   // 兼容汉字
            '\u{2F800}'..='\u{2FA1F}'   // 兼容补充
            => 16.0, // 中文字符占用约16像素
            
            // 全角字符（包括全角标点、日文假名等）
            '\u{FF01}'..='\u{FF5E}' |  // 全角ASCII
            '\u{3000}'..='\u{303F}' |  // CJK标点
            '\u{3040}'..='\u{309F}' |  // 平假名
            '\u{30A0}'..='\u{30FF}'    // 片假名
            => 16.0,
            
            // 韩文字符
            '\u{AC00}'..='\u{D7AF}' |  // 韩文音节
            '\u{1100}'..='\u{11FF}'    // 韩文字母
            => 16.0,
            
            // 表情符号和特殊符号
            '\u{1F300}'..='\u{1F9FF}' | // 表情符号
            '\u{2600}'..='\u{26FF}' |   // 杂项符号
            '\u{2700}'..='\u{27BF}'     // 装饰符号
            => 16.0,
            
            // 制表符
            '\t' => 32.0,
            
            // 换行符（视为普通空格）
            '\n' | '\r' => 8.0,
            
            // ASCII字符
            _ if c.is_ascii() => {
                match c {
                    'W' | 'M' | 'w' | 'm' => 10.0, // 宽字母
                    'i' | 'l' | 'I' | '.' | ',' | ':' | ';' | '\'' | '!' | '|' => 4.0, // 窄字符
                    _ => 8.0, // 普通字符
                }
            },
            
            // 其他Unicode字符，默认半角宽度
            _ => 8.0,
        };
    }
    
    // 添加左右边距
    let padding: f64 = 100.0;
    let calculated_width = total_width + padding;
    
    // 限制宽度范围：最小150，最大800
    let width = calculated_width.clamp(150.0, 800.0);
    let height: f64 = 33.0; // 保持高度不变
    
    LogicalSize::new(width, height)
}
