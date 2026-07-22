import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { type as ostype } from "@tauri-apps/plugin-os";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import MessageNavigator from "@/components/MessageNavigator";
import { Header } from "./-components/Header";
import { Inputer } from "./-components/Inputer";
import LanguageSelector from "./-components/LanguageSelector";
import { SelectionFloatingButton } from "./-components/SelectionFloatingButton";
import { TanStackAiHelperDemoNew } from "./-components/testnew";
import { ChatProvider } from "./-components/chatProvider";
// import { TanStackAiHelperDemo } from "./-components/test";
// import { TanStackAiHelperDemoNew } from "./-components/testnew";
// import { TanStackAiHelperDemoRaw } from "./-components/test_raw";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});


function RouteComponent() {
	const _ostype = ostype();
	const chatListRef = useRef<HTMLDivElement>(null);
	return (

		<ChatProvider>
			<div className={cn(
				{ "border rounded-xl": ["linux"].includes(_ostype) },
				"bg-background", "h-full", "flex-coh")}>
				<Header className="p-1" />

				<div className="relative h-full flex-coh">
				{/* <div ref={chatListRef} className="h-full flex-coh">
					<ScrollArea className="h-full flex-coh">
						<ChatList className="px-2 pt-2" />
					</ScrollArea>
				</div> */}
				{/* <TanStackAiHelperDemoRaw /> */}
				<TanStackAiHelperDemoNew />
				{/* <TanStackAiHelperDemo /> */}
				<MessageNavigator />
				<SelectionFloatingButton containerRef={chatListRef} />
			</div>
			<div className="px-2 pb-2">
				<Inputer />
			</div>
			<LanguageSelector />
		</div>
		</ChatProvider>
	);
}
