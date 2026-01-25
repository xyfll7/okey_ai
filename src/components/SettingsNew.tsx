import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { useEffect, useState } from "react"
import { IISettings } from "./icons/hugeicons"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"


export function SettingsNew({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    return <Drawer open={isOpen} onOpenChange={setIsOpen} >
        <DrawerTrigger onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            setIsOpen(true)
        }} asChild >
            <Button size={"icon-sm"} variant={"ghost"} className={className} >
                <IISettings />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className="flex justify-start select-none" data-tauri-drag-region>Settings</DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            <ScrollArea className={cn("h-[70vh]")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    <FieldDemo />
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}


import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function FieldDemo() {
    const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
    const currentModel = useStore(s_CurrentModel, (state => state))
    const [apiKey, setApiKey] = useState("");
    useEffect(() => {
        setApiKey(modelsList_X.state?.[currentModel]?.api_key ?? "");
    }, [modelsList_X.state, currentModel]);

    return (
        <div className="w-full px-2.5 pb-2">
            <form>
                <FieldGroup>
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                                    API Provider ({currentModel})
                                </FieldLabel>
                                <ToggleGroupSpacing />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                                    {currentModel} API Key
                                </FieldLabel>
                                <Input
                                    value={apiKey}
                                    id="checkout-7j9-card-number-uw1"
                                    placeholder="Enter API Key"
                                    required
                                    onChange={(e) => setApiKey(e.target.value)}
                                    onBlur={async (e) => {
                                        const value = e.target.value;
                                        if (value !== modelsList_X.state?.[currentModel]?.api_key) {
                                            await invoke(EVENT_NAMES.update_model_api_key, { model_name: currentModel, api_key: value });
                                            modelsList_X.invokeState();
                                        }
                                    }}
                                />
                                <FieldDescription>
                                    This key is stored locally and only used to make API requests from this application
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </FieldGroup>
            </form>
        </div>
    )
}


import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { invoke } from "@tauri-apps/api/core";
import { s_CurrentModel } from "@/store";
import { useStore } from "@tanstack/react-store";
import type { ModelConfigMap } from "@/@types";
import { ModelProviderShowName } from "@/lib/types";

export function ToggleGroupSpacing() {
    const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
    const currentModel = useStore(s_CurrentModel, (state => state))
    if (!currentModel) {
        return null;
    }
    return (
        <ToggleGroup
            type="single"
            size="sm"
            defaultValue={ModelProviderShowName[currentModel as keyof typeof ModelProviderShowName]}
            variant="outline"
            spacing={2}
            className="flex-wrap w-full"
        >
            {modelsList_X.state && Object.keys(modelsList_X.state).map((key) => (
                <ToggleGroupItem value={key} aria-label="Toggle top" key={key}
                    onClick={async () => {
                        await invoke(EVENT_NAMES.switch_model, { model_name: key })
                        s_CurrentModel.setState(key)
                    }}
                >
                    {ModelProviderShowName[key as keyof typeof ModelProviderShowName]}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
