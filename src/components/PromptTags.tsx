import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import type { PromptTag } from "@/@types";

export function PromptTags({ className, promptTags, onDelete, onAdd }: { className?: string; promptTags: PromptTag[]; onDelete?: (id: number) => void; onAdd?: (label: string, content: string) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newLabel, setNewLabel] = useState("")
    const [newContent, setNewContent] = useState("")

    useEffect(() => {
        if (!isOpen) return;
        const overlay = document.querySelector('[data-slot="drawer-overlay"]');
        if (overlay) {
            (overlay as HTMLElement).setAttribute('data-tauri-drag-region', 'true');
        }
    }, [isOpen]);

    const handleAdd = () => {
        const label = newLabel.trim();
        if (!label) return;
        onAdd?.(label, newContent.trim() || label);
        setNewLabel("");
        setNewContent("");
        setShowAddForm(false);
    };

    return <Drawer open={isOpen} onOpenChange={setIsOpen} >
        <DrawerTrigger onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            setIsOpen(true)
        }} asChild >
            <Button size={"xs"} variant={"outline"} className={className} >
                <Icons.add />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className={cn("flex justify-between select-none", "")} data-tauri-drag-region>
                    Prompt Tags
                    <Button
                        size={"icon-xs"}
                        variant={"ghost"}
                        onClick={() => setShowAddForm((v) => !v)}
                    >
                        <Icons.add />
                    </Button>
                </DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            {showAddForm && (
                <div className="flex flex-col gap-2 px-2 pb-2">
                    <Input
                        placeholder="Label"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                    />
                    <Input
                        placeholder="Content"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button size={"xs"} variant={"ghost"} onClick={() => setShowAddForm(false)}>
                            Cancel
                        </Button>
                        <Button size={"xs"} variant={"default"} onClick={handleAdd}>
                            Add
                        </Button>
                    </div>
                </div>
            )}
            <ScrollArea className={cn("h-[70vh]")}>
                <div className="max-w-screen flex flex-coh items-start px-2">
                    {promptTags.map((e) => (
                        <div
                            className="flex items-center mr-1 mb-1 rounded-md border border-border px-2 py-1"
                            key={e.id}
                        >
                            <span className="text-xs">{e.label}</span>
                            <Button
                                size={"icon-xs"}
                                variant={"ghost"}
                                className="ml-1 h-4 w-4"
                                onClick={() => onDelete?.(e.id)}
                            >
                                <Icons.x />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}