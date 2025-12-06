import { invoke } from "@tauri-apps/api/core";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export async function speak(text: string) {
	if ("speechSynthesis" in window) {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = 1.0; // 语速
		utterance.pitch = 1.0; // 音调
		utterance.volume = 1.0; // 音量
		utterance.lang = await invoke<"en-US"|"zh-CN">("detect_language") ; // 语言
		speechSynthesis.speak(utterance);
	} else {
		console.error("浏览器不支持 TTS");
	}
}
