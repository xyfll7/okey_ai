# Translations

This directory contains the translation files for the Okey AI application.

## File Structure

- `en.yml` - English translations
- `zh-CN.yml` - Chinese (Simplified) translations

## Adding New Translations

To add a new translation:

1. Add the key-value pair to each language file
2. Use the key in your Rust code with the `t!()` macro or in frontend code via the exposed Tauri commands

Example:
```yaml
# In en.yml
hello_user: "Hello, User!"
```

```yaml
# In zh-CN.yml
hello_user: "你好，用户！"
```

## Using Translations in Frontend

From the frontend JavaScript/TypeScript code, you can use the following Tauri commands:

- `get_locale()` - Get the current locale
- `set_locale(locale)` - Set the locale (e.g., "en", "zh-CN")

Example:
```javascript
import { invoke } from '@tauri-apps/api/core';

// Get current locale
const currentLocale = await invoke('get_locale');

// Switch to Chinese
await invoke('set_locale', { locale: 'zh-CN' });
```

## Default Locale

The application initializes with English ("en") as the default locale. You can enhance this by storing the user's preferred language in the application settings and loading it at startup.