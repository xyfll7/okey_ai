import { Button } from "./ui/button"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { useState } from "react"
import type { ChatMessageHistory } from "@/lib/types"
import { IIList } from "./icons/hugeicons"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"
import { Drawer } from "vaul"


export function Histories({ className }: { className?: string }) {
    const [histories, setHistories] = useState<[string, ChatMessageHistory][]>()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
            <Drawer.Trigger onClick={async (e) => {
                (e.currentTarget as HTMLButtonElement).blur();
                const res = await invoke<[string, ChatMessageHistory][]>(EVENT_NAMES.GET_HISTORIES)
                setHistories(res)
                setIsOpen(true)
            }} asChild>
                <Button size={"icon-sm"} variant={"ghost"} className={className}>
                    <IIList />
                </Button>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className={cn(
                    "h-fit fixed bottom-0 left-0 right-0 outline-none",
                    "bg-background rounded-t-xl border",
                    )}>
                    <div className="p-4">
                        <h2 className="font-semibold text-lg">History</h2>
                    </div>
                    <ScrollArea className={cn("h-[50vh]")}>
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
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
