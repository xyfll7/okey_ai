import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "./ui/button";
import { useState } from "react";
import { Icons } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

export function PromptTags({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false)

    return <Drawer open={isOpen} onOpenChange={setIsOpen} >
        <DrawerTrigger onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            setIsOpen(true)
            setTimeout(() => {
                const overlay = document.querySelector('[data-slot="drawer-overlay"]');
                if (overlay) {
                    (overlay as HTMLElement).setAttribute('data-tauri-drag-region', 'true');
                }
            }, 0);
        }} asChild >
            <Button size={"xs"} variant={"outline"} className={className} >
                <Icons.add />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className={cn("flex justify-between select-none", "")} data-tauri-drag-region>
                    Prompt Tags
                </DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            <ScrollArea className={cn("h-[70vh]")}>
                <div className="max-w-screen flex-coh items-start px-2">
                   
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}