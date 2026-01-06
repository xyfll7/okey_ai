import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { useState } from "react"
import type { ChatHistories } from "@/lib/types"
import { IIList } from "./icons/hugeicons"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"


export function Histories({ className }: { className?: string }) {
    const [histoies, setHistories] = useState<ChatHistories>()
    return <Drawer>
        <DrawerTrigger onClick={async () => {
            const res = await invoke<ChatHistories>(EVENT_NAMES.GET_HISTORIES)
            console.log("histoies：：", res)
            setHistories(res)
        }} asChild>
            <Button size={"icon-sm"} variant={"ghost"} className={className}>
                <IIList />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="h-[50vh]">
            <ScrollArea className={cn("h-full pt-4")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    {histoies && Object.keys(histoies ?? {}).map(e => {
                        return <Button className="w-full cursor-pointer" variant={"ghost"}>
                            <span className="truncate w-full text-start">
                                {histoies[e].messages.at(1)?.raw}
                            </span>
                        </Button>
                    })}
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}
