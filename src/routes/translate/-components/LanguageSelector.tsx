import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icon";
import { m } from "@/paraglide/messages.js";

export default function LanguageSelector() {
	const [localLanguage, setLocalLanguage] = useState<string>("zh-CN");
	const [targetLanguage, setTargetLanguage] = useState<string>("en");
	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
	const { ...selfExplaining_X } = useInvoke<boolean>(EVENT_NAMES.get_self_explaining_model, false);

	const localLanguageLabel = options.find((item) => item.value === localLanguage)?.label || localLanguage;
	const targetLanguageLabel = options.find((item) => item.value === targetLanguage)?.label || targetLanguage;

	useEffect(() => {
		(async () => {
			try {
				const local = await invoke<string>(EVENT_NAMES.get_local_language);
				const target = await invoke<string>(EVENT_NAMES.get_target_language);
				const remoteOptions = await invoke<[string, string][]>(EVENT_NAMES.get_language_options);
				if (Array.isArray(remoteOptions)) {
					setOptions(remoteOptions.map((r) => ({ label: r[1], value: r[0] })));
				}
				if (local) setLocalLanguage(local);
				if (target) setTargetLanguage(target);
			} catch {
				// ignore
			}
		})();
	}, []);

	return (
		<div className="px-2 pb-2 flex  flex-wrap">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon-xs" variant="ghost" >
						<Icons.question />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<div>
						{m.translate_language_selector_tooltip_line1({ localLanguage: localLanguageLabel })}
					</div>
					<div>
						{m.translate_language_selector_tooltip_line2({ localLanguage: localLanguageLabel, targetLanguage: targetLanguageLabel })}
					</div>
				</TooltipContent>
			</Tooltip>

			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={!!selfExplaining_X.state}>
					<Button size="xs" variant="ghost">
						{options.find((item) => item.value === localLanguage)?.label}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start">
					{options.map((item) => (
						<DropdownMenuItem
							key={item.value}
							onSelect={async () => {
								await invoke(EVENT_NAMES.set_local_language, { language: item.value });
								setLocalLanguage(item.value);
							}}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button size="icon-xs" variant="ghost" disabled>
				<Icons.exchange />
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={!!selfExplaining_X.state}>
					<Button size="xs" variant="ghost">
						{options.find((item) => item.value === targetLanguage)?.label}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start">
					{options.map((item) => (
						<DropdownMenuItem
							key={item.value}
							onSelect={async () => {
								await invoke(EVENT_NAMES.set_target_language, { language: item.value });
								setTargetLanguage(item.value);
							}}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				size="xs"
				variant="ghost"
				className={cn(
					selfExplaining_X.state ? "" : "opacity-50",
					"hover:text-inherit",
				)}
				onClick={async () => {
					const enabled = !selfExplaining_X.state;
					await invoke(EVENT_NAMES.set_self_explaining_model, { enabled });
					selfExplaining_X.setState(enabled);
				}}
			>
				{selfExplaining_X.state ? m.translate_language_selector_self_explaining_on() : m.translate_language_selector_self_explaining_off()}
			</Button>
		</div>
	);
}
