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
		if (isRecording && keys.length > 0) return keys;
		if (hotkey) return hotkey.split("+").map((k) => k.trim());
		return null;
	})();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) return;

		e.preventDefault();
		e.stopPropagation();

		const pressedKeys: string[] = [];

		if (e.ctrlKey) pressedKeys.push("Ctrl");
		if (e.metaKey) pressedKeys.push("Cmd");
		if (e.altKey) pressedKeys.push("Alt");
		if (e.shiftKey) pressedKeys.push("Shift");

		if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
			const formatKey = (key: string): string => {
				const keyMap: Record<string, string> = {
					Control: "Ctrl",
					Meta: "Cmd",
					Alt: "Alt",
					Shift: "Shift",
					" ": "Space",
				};
				return keyMap[key] || key.toUpperCase();
			};
			pressedKeys.push(formatKey(e.key));
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
				role="button"
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
									<React.Fragment key={`${key}-`}>
										{key}
										{index < displayContent.length - 1 && <span>+</span>}
									</React.Fragment>
								))
							) : (
								<span className=" opacity-70">
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
