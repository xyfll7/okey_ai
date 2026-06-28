import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { EVENT_NAMES, useInvoke } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react"
import type { ChatMessage, ChatMessageHistory } from "@/lib/types"
import { Icons } from "@/components/icon"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages.js"
import { s_ChatList, s_LoadingChat } from "@/store"
import { useStore } from "@tanstack/react-store";



export function HistoriesNew({ className }: { className?: string }) {
    const { ...histories_X } = useInvoke<[string, ChatMessageHistory][]>(EVENT_NAMES.get_histories, []);
    const [isOpen, setIsOpen] = useState(false);
    const loadingChat = useStore(s_LoadingChat, (state) => state);
    return <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger disabled={loadingChat} onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            histories_X.invokeState();
            setIsOpen(true)
            setTimeout(() => {
                const overlay = document.querySelector('[data-slot="drawer-overlay"]');
                if (overlay) {
                    (overlay as HTMLElement).setAttribute('data-tauri-drag-region', 'true');
                }
            }, 0);
        }} asChild >
            <Button size={"icon-sm"} variant={"ghost"} className={className} >
                <Icons.list />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className=" flex justify-start select-none" data-tauri-drag-region>{m.common_history()}</DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            <ScrollArea className={cn("h-[70vh]")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    {histories_X.state.filter(([_, item]) => Boolean(item.messages.at(1))).map(([key, item]) => {
                        return <Button 
                            className="w-full cursor-pointer" 
                            key={key} 
                            variant={"ghost"}
                            onClick={async () => {
                                await invoke(EVENT_NAMES.set_current_session, { session_id: key });
                                const history = await invoke<ChatMessage[]>(EVENT_NAMES.get_current_history);
                                s_ChatList.setState(() => history);
                                setIsOpen(false);
                            }}
                        >
                            <span className="truncate w-full text-start">
                                {item.messages.at(1)?.raw ?? item.messages.at(1)?.content}
                            </span>
                        </Button>
                    })}
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}