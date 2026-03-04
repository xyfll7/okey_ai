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
import { useState } from "react"
import type { ChatMessageHistory } from "@/lib/types"
import { IIList } from "./icons/hugeicons"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"


export function HistoriesNew({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { ...histories_X } = useInvoke<[string, ChatMessageHistory][]>(EVENT_NAMES.get_histories, []);
    const [isOpen, setIsOpen] = useState(false);
    return <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger onClick={async (e) => {
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
                <IIList />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className=" flex justify-start select-none" data-tauri-drag-region>{t("common.history")}</DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            <ScrollArea className={cn("h-[70vh]")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    {histories_X.state.map(([key, item]) => {
                        return <Button className="w-full cursor-pointer" key={key} variant={"ghost"}>
                            <span className="truncate w-full text-start">
                                {item.messages.at(1)?.raw}
                            </span>
                        </Button>
                    })}
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}