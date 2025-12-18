use regex::Regex;
use std::collections::HashSet;

/// 文本清理配置
#[derive(Debug, Clone)]
pub struct TextCleanerConfig {
    /// 是否保留换行符
    pub preserve_newlines: bool,
    /// 是否合并多个空格为一个
    pub merge_spaces: bool,
    /// 是否保留数字
    pub preserve_numbers: bool,
    /// 是否保留URL
    pub preserve_urls: bool,
    /// 是否保留邮箱
    pub preserve_emails: bool,
    /// 最大连续换行数
    pub max_consecutive_newlines: usize,
}

impl Default for TextCleanerConfig {
    fn default() -> Self {
        Self {
            preserve_newlines: true,
            merge_spaces: true,
            preserve_numbers: true,
            preserve_urls: true,
            preserve_emails: true,
            max_consecutive_newlines: 2,
        }
    }
}

/// 文本清理器
pub struct TextCleaner {
    config: TextCleanerConfig,
    // 有语义的标点符号
    semantic_punctuation: HashSet<char>,
}

impl TextCleaner {
    pub fn new(config: TextCleanerConfig) -> Self {
        let mut semantic_punctuation = HashSet::new();

        // 中文标点
        semantic_punctuation.extend(vec![
            '。', '，', '、', '；', '：', '？', '！', '"', '"', '\'', '\'', '（', '）', '《', '》',
            '【', '】', '…', '—', '·',
        ]);

        // 英文标点
        semantic_punctuation.extend(vec![
            '.', ',', ';', ':', '?', '!', '"', '\'', '(', ')', '[', ']', '{', '}', '-', '_', '/',
            '\\', '|', '&', '@', '#', '*', '+', '=', '<', '>', '~', '`',
        ]);

        Self {
            config,
            semantic_punctuation,
        }
    }

    /// 主清理方法
    pub fn clean(&self, text: &str) -> String {
        let mut result = text.to_string();

        // 1. 移除零宽字符和控制字符
        result = self.remove_invisible_chars(&result);

        // 2. 处理URL占位
        let (result_with_placeholders, urls) = if self.config.preserve_urls {
            self.extract_and_replace_urls(&result)
        } else {
            (result.clone(), vec![])
        };
        result = result_with_placeholders;

        // 3. 处理邮箱占位
        let (result_with_placeholders, emails) = if self.config.preserve_emails {
            self.extract_and_replace_emails(&result)
        } else {
            (result.clone(), vec![])
        };
        result = result_with_placeholders;

        // 4. 清理无意义符号（保留语义标点和数字）
        result = self.filter_meaningful_chars(&result);

        // 5. 处理空白字符
        result = self.normalize_whitespace(&result);

        // 6. 恢复URL和邮箱
        result = self.restore_placeholders(&result, &urls, &emails);

        // 7. 最终修整
        result = self.final_trim(&result);

        result
    }

    /// 移除零宽字符和控制字符
    fn remove_invisible_chars(&self, text: &str) -> String {
        text.chars()
            .filter(|c| {
                let code = *c as u32;
                // 保留普通空白字符，移除其他控制字符和零宽字符
                match *c {
                    '\n' | '\r' | '\t' | ' ' => true,
                    _ if c.is_control() => false,
                    // 零宽字符
                    '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{FEFF}' => false,
                    _ => true,
                }
            })
            .collect()
    }

    /// 提取并替换URL
    fn extract_and_replace_urls(&self, text: &str) -> (String, Vec<String>) {
        let url_regex =
            Regex::new(r"https?://[^\s<>{}|\\\^`\[\]]+|www\.[^\s<>{}|\\\^`\[\]]+").unwrap();

        let mut urls = Vec::new();
        let mut result = text.to_string();

        for (i, cap) in url_regex.find_iter(text).enumerate() {
            urls.push(cap.as_str().to_string());
            let placeholder = format!("__URL_{}__", i);
            result = result.replace(cap.as_str(), &placeholder);
        }

        (result, urls)
    }

    /// 提取并替换邮箱
    fn extract_and_replace_emails(&self, text: &str) -> (String, Vec<String>) {
        let email_regex = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();

        let mut emails = Vec::new();
        let mut result = text.to_string();

        for (i, cap) in email_regex.find_iter(text).enumerate() {
            emails.push(cap.as_str().to_string());
            let placeholder = format!("__EMAIL_{}__", i);
            result = result.replace(cap.as_str(), &placeholder);
        }

        (result, emails)
    }

    /// 过滤有意义的字符
    fn filter_meaningful_chars(&self, text: &str) -> String {
        text.chars()
            .filter(|c| {
                // 保留字母、数字、汉字、语义标点、空白字符
                c.is_alphabetic()
                    || (self.config.preserve_numbers && c.is_numeric())
                    || c.is_whitespace()
                    || self.semantic_punctuation.contains(c)
                    || self.is_cjk_char(*c)
                    || *c == '_' // 保留下划线（占位符需要）
            })
            .collect()
    }

    /// 判断是否为CJK字符
    fn is_cjk_char(&self, c: char) -> bool {
        let code = c as u32;
        (0x4E00..=0x9FFF).contains(&code)  // 中日韩统一表意文字
            || (0x3400..=0x4DBF).contains(&code)  // 扩展A
            || (0x20000..=0x2A6DF).contains(&code) // 扩展B
            || (0x2A700..=0x2B73F).contains(&code) // 扩展C
            || (0x2B740..=0x2B81F).contains(&code) // 扩展D
            || (0x2B820..=0x2CEAF).contains(&code) // 扩展E
            || (0xF900..=0xFAFF).contains(&code)   // 兼容汉字
            || (0x3040..=0x309F).contains(&code)   // 平假名
            || (0x30A0..=0x30FF).contains(&code)   // 片假名
            || (0xAC00..=0xD7AF).contains(&code) // 韩文
    }

    /// 规范化空白字符
    fn normalize_whitespace(&self, text: &str) -> String {
        let mut result = text.to_string();

        // 统一换行符
        result = result.replace("\r\n", "\n").replace('\r', "\n");

        if self.config.preserve_newlines {
            // 限制连续换行数
            let max_newlines = "\n".repeat(self.config.max_consecutive_newlines);
            let excessive_newlines = Regex::new(&format!(
                r"\n{{{},}}",
                self.config.max_consecutive_newlines + 1
            ))
            .unwrap();
            result = excessive_newlines
                .replace_all(&result, max_newlines.as_str())
                .to_string();
        } else {
            // 将所有换行替换为空格
            result = result.replace('\n', " ");
        }

        if self.config.merge_spaces {
            // 合并多个空格为一个
            let multi_space = Regex::new(r" {2,}").unwrap();
            result = multi_space.replace_all(&result, " ").to_string();
        }

        result
    }

    /// 恢复占位符
    fn restore_placeholders(&self, text: &str, urls: &[String], emails: &[String]) -> String {
        let mut result = text.to_string();

        for (i, url) in urls.iter().enumerate() {
            let placeholder = format!("__URL_{}__", i);
            result = result.replace(&placeholder, url);
        }

        for (i, email) in emails.iter().enumerate() {
            let placeholder = format!("__EMAIL_{}__", i);
            result = result.replace(&placeholder, email);
        }

        result
    }

    /// 最终修整
    fn final_trim(&self, text: &str) -> String {
        // 移除首尾空白
        let result = text.trim();

        // 移除句首句尾的多余标点
        let mut chars: Vec<char> = result.chars().collect();

        // 清理开头的标点（除了引号等）
        while !chars.is_empty() {
            let first = chars[0];
            if self.is_leading_removable_punct(first) {
                chars.remove(0);
            } else {
                break;
            }
        }

        chars.into_iter().collect()
    }

    /// 判断是否为可移除的开头标点
    fn is_leading_removable_punct(&self, c: char) -> bool {
        matches!(c, ',' | '.' | '；' | '。' | '、' | ':' | '：')
    }

    /// 为AI准备的格式化输出
    pub fn prepare_for_ai(&self, text: &str, target_lang: &str) -> String {
        let cleaned = self.clean(text);
        format!("请将以下文本翻译成{}：\n\n{}", target_lang, cleaned)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_cleaning() {
        let cleaner = TextCleaner::new(TextCleanerConfig::default());

        let input = "Hello   World\u{200B}！！！\n\n\n这是测试。";
        let result = cleaner.clean(input);

        println!("Input: {:?}", input);
        println!("Output: {:?}", result);
        assert!(result.contains("Hello World"));
        assert!(result.contains("这是测试"));
    }

    #[test]
    fn test_url_preservation() {
        let cleaner = TextCleaner::new(TextCleanerConfig::default());

        let input = "访问 https://example.com 了解更多###信息";
        let result = cleaner.clean(input);

        println!("Result: {}", result);
        assert!(result.contains("https://example.com"));
        assert!(result.contains("访问"));
        assert!(result.contains("了解更多"));
    }

    #[test]
    fn test_email_preservation() {
        let cleaner = TextCleaner::new(TextCleanerConfig::default());

        let input = "联系我：test@example.com %%%% 邮箱";
        let result = cleaner.clean(input);

        println!("Result: {}", result);
        assert!(result.contains("test@example.com"));
    }

    #[test]
    fn test_prepare_for_ai() {
        let cleaner = TextCleaner::new(TextCleanerConfig::default());

        let input = "Hello###World   \n\n\n这是\u{200B}测试。";
        let result = cleaner.prepare_for_ai(input, "中文");

        println!("AI Input:\n{}", result);
        assert!(result.contains("请将以下文本翻译成中文"));
    }
}

// 使用示例
fn main() {
    // 创建默认配置的清理器
    let cleaner = TextCleaner::new(TextCleanerConfig::default());

    // 模拟从网页或PDF拷贝的文字
    let copied_text = r#"
    Hello###World！！！   
    
    这是一段从网页拷贝的文字\u{200B}，包含各种符号：
    - 零宽字符
    - 多余的换行
    
    
    
    - 特殊符号：@@##$$%%
    访问我们的网站：https://example.com
    联系邮箱：contact@example.com
    
    价格：$99.99
    "#;

    println!("=== 原始文本 ===");
    println!("{}", copied_text);
    println!("\n=== 清理后的文本 ===");
    let cleaned = cleaner.clean(copied_text);
    println!("{}", cleaned);

    println!("\n=== 准备发送给AI ===");
    let ai_input = cleaner.prepare_for_ai(copied_text, "英语");
    println!("{}", ai_input);
}
