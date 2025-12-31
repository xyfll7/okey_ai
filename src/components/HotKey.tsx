import { invoke } from "@tauri-apps/api/core";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { EVENT_NAMES } from "@/lib/events";
import { cn } from "@/lib/utils";

export default function HotKey({
	className,
	hotkey = "NONE",
	onHotkeyChange,
}: {
	className?: string;
	hotkey?: string;
	onHotkeyChange?: (hotkey: string) => void;
}) {
	const MODIFIER_KEYS = new Set(["Ctrl", "Cmd", "Alt", "Shift"]);
	const { t } = useTranslation();
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [keys, setKeys] = useState<string[]>([]);
	const inputRef = useRef<HTMLDivElement>(null);

	const displayContent = (() => {
		if (isRecording) return keys.length > 0 ? keys : null;
		const parsed = hotkey?.split("+").map((k) => k.trim()) || [];
		return parsed.length > 0 ? parsed : null;
	})();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!isRecording) return;
		e.preventDefault();
		e.stopPropagation();
		const invalidKeys = [
			"CapsLock",
			"NumLock",
			"ScrollLock",
			"ContextMenu",
		].concat(["Escape", "Tab", "Pause", "Power", "WakeUp", "PrintScreen"]);
		if (invalidKeys.includes(e.code)) {
			return;
		}

		const pressedKeys: string[] = [];

		if (e.metaKey) pressedKeys.push("Cmd");
		else if (e.ctrlKey) pressedKeys.push("Ctrl");
		if (e.altKey) pressedKeys.push("Alt");
		if (e.shiftKey) pressedKeys.push("Shift");

		if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
			const keyMap: Record<string, string> = {
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

				Space: "Space",

				Delete: "Delete",
				PageDown: "PageDown",
				PageUp: "PageUp",

				ArrowUp: "Up",
				ArrowDown: "Down",
				ArrowLeft: "Left",
				ArrowRight: "Right",
			};

			let displayKey = "";

			if (e.code.startsWith("Key")) {
				displayKey = e.code.substring(3);
			} else if (e.code.startsWith("Digit")) {
				displayKey = e.code.substring(5);
			} else if (e.code.startsWith("Numpad")) {
				if (e.code === "NumpadEnter") {
					displayKey = "NumpadEnter";
				} else if (e.code === "NumpadAdd") {
					displayKey = "NumpadAdd";
				} else if (e.code === "NumpadSubtract") {
					displayKey = "NumpadSubtract";
				} else if (e.code === "NumpadMultiply") {
					displayKey = "NumpadMultiply";
				} else if (e.code === "NumpadDivide") {
					displayKey = "NumpadDivide";
				} else if (e.code === "NumpadDecimal") {
					displayKey = "NumpadDecimal";
				} else {
					displayKey = `Num${e.code.substring(6)}`;
				}
			} else if (e.code.startsWith("Intl")) {
				const intlKey = e.code.substring(4);
				displayKey = keyMap[intlKey] || intlKey;
			} else if (/^F\d+$/.test(e.code)) {
				displayKey = e.code;
			} else if (keyMap[e.code]) {
				displayKey = keyMap[e.code];
			} else {
				displayKey = e.code;
			}
			if (displayKey) {
				pressedKeys.push(displayKey);
			}
		}

		if (pressedKeys.length > 0) {
			setKeys(pressedKeys);
		}
	};

	const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!isRecording) return;
		e.preventDefault();
		e.stopPropagation();
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
				invoke(EVENT_NAMES.REGISTER_HOTKEY, { shortcut: newHotkey });
				onHotkeyChange?.(newHotkey);
			} else {
				console.warn(
					"Invalid hotkey: must include at least one modifier (Ctrl/Cmd/Alt/Shift) and one main key.",
					keys,
				);
			}
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
		<KbdGroup
			role="none"
			ref={inputRef}
			className={cn(className)}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onKeyUp={handleKeyUp}
			onBlur={handleBlur}
			tabIndex={0}
			aria-label={
				isRecording ? t("hotkey.recording_hotkey") : t("hotkey.set_hotkey")
			}
		>
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
						<span>{t("hotkey.press_to_set_hotkey")}</span>
					)}
				</span>
				{isRecording && (
					<span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
				)}
			</Kbd>
		</KbdGroup>
	);
}
