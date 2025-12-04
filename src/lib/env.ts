import { arch, platform, type, version } from "@tauri-apps/plugin-os";

export let osType = "";
export let osArch = "";
export let osVersion = "";
export let osPlatform = "";

export async function initEnv() {
	osType = type(); // "Linux" | "Windows_NT" | "Darwin"
	osArch = arch(); // "x86_64" | "aarch64" ...
	osVersion = version(); // 系统版本号
	osPlatform = platform(); // 例如 "win32", "darwin", "linux"
}
