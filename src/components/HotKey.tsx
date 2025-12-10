import { invoke } from "@tauri-apps/api/core";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { EVENT_NAMES } from "@/lib/events";
import { cn } from "@/lib/utils";

export default function HotKey({ className }: { className?: string }) {
	const [hotkey, setHotkey] = useState<string>("Ctrl+K");
	const { t } = useTranslation();
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [keys, setKeys] = useState<string[]>([]);
	const inputRef = useRef<HTMLButtonElement>(null);

	const displayContent = (() => {
		if (isRecording) {
			if (keys.length > 0) {
				return keys;
			}
			return null;
		}
		const parsedValue = !hotkey ? [] : hotkey.split("+").map((k) => k.trim());
		return parsedValue.length > 0 ? parsedValue : null;
	})();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) return;

		e.preventDefault();
		e.stopPropagation();

		const pressedKeys: string[] = [];

		if (e.ctrlKey || e.metaKey) pressedKeys.push(e.ctrlKey ? "Ctrl" : "Cmd");
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

		if (
			!e.ctrlKey &&
			!e.altKey &&
			!e.shiftKey &&
			!e.metaKey &&
			keys.length > 0
		) {
			const newHotkey = keys.join("+");
			console.log("New hotkey set:", newHotkey);
			invoke(EVENT_NAMES.REGISTER_HOTKEY, { shortcut: newHotkey });
			setHotkey(newHotkey);
			setIsRecording(false);
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
