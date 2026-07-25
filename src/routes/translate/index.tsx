import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { type as ostype } from "@tauri-apps/plugin-os";
import { cn } from "@/lib/utils";
import MessageNavigator from "@/components/MessageNavigator";
import { Header } from "./-components/Header";
import { Inputer } from "./-components/Inputer";
import LanguageSelector from "./-components/LanguageSelector";
import { SelectionFloatingButton } from "./-components/SelectionFloatingButton";
import { TanStackAiHelperDemoNew } from "./-components/chatList";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});


function RouteComponent() {
	const _ostype = ostype();
	const chatListRef = useRef<HTMLDivElement>(null);
	return (
		<div className={cn(
			{ "border rounded-xl": ["linux"].includes(_ostype) },
			"bg-background", "h-full", "flex-coh")}>
			<Header className="p-1" />
			<div className="relative h-full flex-coh">
				<TanStackAiHelperDemoNew />
				<MessageNavigator />
				<SelectionFloatingButton containerRef={chatListRef} />
			</div>
			<div className="px-2 pb-2">
				<Inputer />
			</div>
			<LanguageSelector />
		</div>
		
	);
}
