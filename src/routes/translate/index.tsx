import { createFileRoute } from "@tanstack/react-router";
import { type as ostype } from "@tauri-apps/plugin-os";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import MessageNavigator from "@/components/MessageNavigator";
import { Header } from "./-components/Header";
import { ChatList } from "./-components/ChatList";
import { Inputer } from "./-components/Inputer";
import LanguageSelector from "./-components/LanguageSelector";
import { SelectionFloatingButton } from "./-components/SelectionFloatingButton";

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
				<ScrollArea className="h-full flex-coh">
					<ChatList className="px-2 pt-2" />
				</ScrollArea>
				<MessageNavigator />
			</div>
			<div className="px-2 pb-2">
				<Inputer />
			</div>
			<LanguageSelector />
			<SelectionFloatingButton />
		</div>
	);
}
