import { createFileRoute } from "@tanstack/react-router";
import { type as ostype } from "@tauri-apps/plugin-os";
import { cn } from "@/lib/utils";
import { Header } from "./-components/Header";
import { Inputer } from "./-components/Inputer";
import LanguageSelector from "./-components/LanguageSelector";
import { ChatList } from "./-components/chatList";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});


function RouteComponent() {
	const _ostype = ostype();

	return (
		<div className={cn(
			{ "border rounded-xl": ["linux"].includes(_ostype) },
			"bg-background", "h-full", "flex-coh")}>
			<Header className="p-1" />
			<div className="relative h-full flex-coh">
				<ChatList />
			</div>
			<div className="px-2 pb-2">
				<Inputer />
			</div>
			<LanguageSelector />
		</div>

	);
}
