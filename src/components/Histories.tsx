import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { useState } from "react"
import type { ChatMessageHistory } from "@/lib/types"
import { IIList } from "./icons/hugeicons"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"


export function Histories({ className }: { className?: string }) {
    const [histories, setHistories] = useState<[string, ChatMessageHistory][]>()
    return <Drawer >
        <DrawerTrigger onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            const res = await invoke<[string, ChatMessageHistory][]>(EVENT_NAMES.GET_HISTORIES)
            setHistories(res)
        }} asChild >
            <Button size={"icon-sm"} variant={"ghost"} className={className} >
                <IIList />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2">
            <DrawerHeader className="sr-only">
                <DrawerTitle />
                <DrawerDescription />
            </DrawerHeader>
            <ScrollArea className={cn("h-[50vh] pt-4")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    {histories && histories.map(([key, item]) => {
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
