import { EVENT_NAMES } from "@/lib/events";
import type { ChatMessage } from "@/lib/types";
import { Store } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";

export const s_Selected = new Store({ text: "", raw: "" });
export const s_ChatList = new Store<ChatMessage[]>([]);
export const s_CurrentModel = new Store("");
export const s_CurrentLocale = new Store("en");

s_CurrentLocale.subscribe((locale) => {
    invoke(EVENT_NAMES.set_locale, { locale: locale.currentVal });
    import("@/i18n/index").then((i18n) => {
        i18n.default.changeLanguage(locale.currentVal);
    });
});

async function init() {
    const result = await invoke<string>(EVENT_NAMES.get_current_model);
    s_CurrentModel.setState(result);
    
    // Initialize locale
    const localeResult = await invoke<string>(EVENT_NAMES.get_locale);
    s_CurrentLocale.setState(localeResult);
    
    const i18n = await import("@/i18n/index");
    i18n.default.changeLanguage(localeResult);
}
init();

