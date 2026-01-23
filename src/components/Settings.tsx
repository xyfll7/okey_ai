import { Button } from "./ui/button"
import { useState } from "react"
import { IISettings } from "./icons/hugeicons"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"
import { Drawer } from "vaul"

export function Settings({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
            <Drawer.Trigger onClick={async (e) => {
                (e.currentTarget as HTMLButtonElement).blur();
                setIsOpen(true)
            }} asChild>
                <Button size={"icon-sm"} variant={"ghost"} className={className}>
                    <IISettings />
                </Button>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className={cn(
                    "h-fit fixed bottom-0 left-0 right-0 outline-none",
                    "bg-background rounded-t-xl border",
                )}>
                    <div className="p-2">
                        <h3 className="px-2.5 font-semibold text-lg">Settings</h3>
                    </div>
                    <ScrollArea className={cn("h-[70vh]")}>
                        <div className="max-w-screen flex-coh items-start px-2">

                        </div>
                    </ScrollArea>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
