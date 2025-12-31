import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { GlobalConfig } from "@/@types";
import { EVENT_NAMES } from "./events";
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export async function speak(text: string) {
	console.log("speak", text);
	if ("speechSynthesis" in window) {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = 1.0; // 语速
		utterance.pitch = 1.0; // 音调
		utterance.volume = 1.0; // 音量
		utterance.lang = await invoke<"en-US" | "zh-CN">(
			EVENT_NAMES.DETECT_LANGUAGE,
			{ text },
		); // 语言
		speechSynthesis.speak(utterance);
	} else {
		console.error("浏览器不支持 TTS");
	}
}

export async function get_global_config() {
	const store = await Store.load("store.json");
	const config = await store.get<GlobalConfig>("global_config");
	if (config) {
		console.log(config);
		return config;
	} else {
		console.log("val is null");
	}
}
