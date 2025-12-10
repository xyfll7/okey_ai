import { invoke } from "@tauri-apps/api/core";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { EVENT_NAMES } from "@/lib/events";
import { cn } from "@/lib/utils";

export default function HotKey({ className }: { className?: string }) {
	const MODIFIER_KEYS = new Set(["Ctrl", "Cmd", "Alt", "Shift"]);
	const [hotkey, setHotkey] = useState<string>("Ctrl+K");
	const { t } = useTranslation();
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [keys, setKeys] = useState<string[]>([]);
	const inputRef = useRef<HTMLButtonElement>(null);

	const displayContent = (() => {
		if (isRecording) return keys.length > 0 ? keys : null;
		const parsed = hotkey?.split("+").map((k) => k.trim()) || [];
		return parsed.length > 0 ? parsed : null;
	})();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) return;

		e.preventDefault();
		e.stopPropagation();

		// 过滤无效按键
		const invalidKeys = ["CapsLock", "NumLock", "ScrollLock", "ContextMenu"];
		if (invalidKeys.includes(e.code)) {
			return;
		}

		const pressedKeys: string[] = [];

		// 修饰键
		if (e.metaKey) pressedKeys.push("Cmd");
		else if (e.ctrlKey) pressedKeys.push("Ctrl");
		if (e.altKey) pressedKeys.push("Alt");
		if (e.shiftKey) pressedKeys.push("Shift");

		// 主键
		if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
			// 只映射真正需要转换的键
			const keyMap: Record<string, string> = {
				// 符号键（code -> 显示）
				Backquote: "`",
				Backslash: "\\",
				BracketLeft: "[",
				BracketRight: "]",
				Comma: ",",
				Equal: "=",
				Minus: "-",
				Period: ".",
				Quote: "'",
				Semicolon: ";",
				Slash: "/",

				// 空格键
				Space: "Space",

				// 缩写优化
				Escape: "Esc",
				Delete: "Del",
				PageDown: "PgDn",
				PageUp: "PgUp",
				PrintScreen: "PrtSc",
			};

			// 方向键映射（可选：使用箭头符号或文字）
			const arrowMap: Record<string, string> = {
				ArrowUp: "↑", // 或 "Up"
				ArrowDown: "↓", // 或 "Down"
				ArrowLeft: "←", // 或 "Left"
				ArrowRight: "→", // 或 "Right"
			};

			let displayKey = "";

			if (e.code.startsWith("Key")) {
				// KeyA -> A
				displayKey = e.code.substring(3);
			} else if (e.code.startsWith("Digit")) {
				// Digit1 -> 1
				displayKey = e.code.substring(5);
			} else if (e.code.startsWith("Numpad")) {
				// NumpadEnter -> NumEnter, Numpad1 -> Num1
				if (e.code === "NumpadEnter") {
					displayKey = "NumEnter";
				} else if (e.code === "NumpadAdd") {
					displayKey = "Num+";
				} else if (e.code === "NumpadSubtract") {
					displayKey = "Num-";
				} else if (e.code === "NumpadMultiply") {
					displayKey = "Num*";
				} else if (e.code === "NumpadDivide") {
					displayKey = "Num/";
				} else if (e.code === "NumpadDecimal") {
					displayKey = "Num.";
				} else {
					displayKey = `Num${e.code.substring(6)}`;
				}
			} else if (arrowMap[e.code]) {
				// 方向键
				displayKey = arrowMap[e.code];
			} else if (e.code.startsWith("Intl")) {
				// IntlBackslash -> Backslash
				const intlKey = e.code.substring(4);
				displayKey = keyMap[intlKey] || intlKey;
			} else if (/^F\d+$/.test(e.code)) {
				// F1-F12 保持不变
				displayKey = e.code;
			} else if (keyMap[e.code]) {
				// 在映射表中
				displayKey = keyMap[e.code];
			} else {
				// 其他键（如 Tab, Enter, Backspace, Home, End, Insert 等）直接使用
				displayKey = e.code;
			}

			// 只在有值时才添加
			if (displayKey) {
				pressedKeys.push(displayKey);
			}
		}

		if (pressedKeys.length > 0) {
			setKeys(pressedKeys);
		}
	};

	const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) return;
		e.preventDefault();
		e.stopPropagation();

		// 只有当所有修饰键都释放，且 keys 非空时才尝试提交
		if (
			!e.ctrlKey &&
			!e.altKey &&
			!e.shiftKey &&
			!e.metaKey &&
			keys.length > 0
		) {
			const hasModifier = keys.some((key) => MODIFIER_KEYS.has(key));
			const hasNonModifier = keys.some((key) => !MODIFIER_KEYS.has(key));
			const isValidHotkey = hasModifier && hasNonModifier;

			if (isValidHotkey) {
				const newHotkey = keys.join("+");
				console.log("New hotkey set:", newHotkey);
				invoke(EVENT_NAMES.REGISTER_HOTKEY, { shortcut: newHotkey });
				setHotkey(newHotkey);
			} else {
				console.warn(
					"Invalid hotkey: must include at least one modifier (Ctrl/Cmd/Alt/Shift) and one main key.",
					keys,
				);
				// 可选：显示用户提示，如 toast("快捷键必须包含修饰键和主键")
			}

			// 结束录制
			setIsRecording(false);
			setKeys([]);
			inputRef.current?.blur();
		}
	};

	const handleClick = () => {
		setIsRecording(true);
		setKeys([]);
		inputRef.current?.focus();
	};

	const handleBlur = () => {
		setIsRecording(false);
		setKeys([]);
	};

	return (
		<div className={cn("relative inline-flex items-center gap-2", className)}>
			<Button
				ref={inputRef}
				tabIndex={0}
				className="px-1 hover:bg-transparent dark:hover:bg-transparent"
				size="sm"
				variant="ghost"
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				onBlur={handleBlur}
			>
				<KbdGroup>
					<Kbd>
						<span className="mr-1">
							{displayContent ? (
								displayContent.map((key, index) => (
									<React.Fragment key={`${key}-${index.toString()}`}>
										{key}
										{index < displayContent.length - 1 && <span>+</span>}
									</React.Fragment>
								))
							) : (
								<span className="opacity-70">
									{t(($) => $.translate.press_to_set_hotkey)}
								</span>
							)}
						</span>
						{isRecording && (
							<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						)}
					</Kbd>
				</KbdGroup>
			</Button>
		</div>
	);
}
