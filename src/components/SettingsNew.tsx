import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { open } from "@tauri-apps/plugin-shell";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ModelConfigMap } from "@/@types";
import { getModelProviderShowName } from "@/lib/types";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card } from "./ui/card";
import { m } from "@/paraglide/messages.js";
import { setLocale } from "@/paraglide/runtime.js";

import * as React from "react";

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function SettingsNew({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const unlisten = listen(EVENT_NAMES.TRANSLATE_HIDE, () => {
            setIsOpen(false);
        });
        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);
    useEffect(() => {
        if (!isOpen) return;
        const overlay = document.querySelector('[data-slot="drawer-overlay"]');
        if (overlay) {
            (overlay as HTMLElement).setAttribute('data-tauri-drag-region', 'true');
        }
    }, [isOpen]);
    const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);

    return <Drawer open={isOpen} onOpenChange={setIsOpen} >
        <DrawerTrigger disabled={loadingChat_X.state} onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            setIsOpen(true)
        }} asChild >
            <Button size={"icon-sm"} variant={"ghost"} className={className} >
                <Icons.settings />
            </Button>
        </DrawerTrigger>
        <DrawerContent className={cn("h-[80vh]  overflow-hidden","pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-[100px].shrink-0.rounded-full]:hidden")}>
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className={cn("flex justify-between select-none", "")} data-tauri-drag-region>
                    {m.common_settings()}
                    <LanguageSelector>
                        <Button size={"icon-sm"} variant={"ghost"}>
                            <Icons.languages />
                        </Button>
                    </LanguageSelector>
                </DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            <ScrollArea className={cn("h-full","overflow-hidden")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    <ModelConfigurationForm />
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}

function ModelConfigurationForm() {
    const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
    const { ...currentModel_X } = useInvoke<string>(EVENT_NAMES.get_current_model, "");
    const currentModel = currentModel_X.state;
    const resetKey = `${currentModel}-${modelsList_X.state?.[currentModel]?.api_key ?? ''}`;
    const providerNames = getModelProviderShowName();
    return (
        <Card className="px-2.5 w-full">
            <form>
                <FieldGroup>
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                                    {m.common_api_provider()} ({providerNames[currentModel as keyof typeof providerNames]})
                                </FieldLabel>
                                {currentModel &&
                                    <ToggleGroup
                                        type="single"
                                        size="sm"
                                        defaultValue={currentModel}
                                        variant="outline"
                                        spacing={2}
                                        className="flex-wrap w-full"
                                    >
                                        {modelsList_X.state && Object.keys(modelsList_X.state)
                                            .sort((a, b) => {
                                                const indexA = modelsList_X.state![a].index;
                                                const indexB = modelsList_X.state![b].index;
                                                return indexA - indexB;
                                            })
                                            .map((key) => (
                                                <ToggleGroupItem value={key} aria-label="Toggle top" key={key}
                                                    onClick={async () => {
                                                        await invoke(EVENT_NAMES.switch_model, { model_name: key })
                                                        await currentModel_X.setState(() => key)
                                                    }}
                                                >
                                                    {providerNames[key as keyof typeof providerNames]}
                                                </ToggleGroupItem>
                                            ))}
                                    </ToggleGroup>
                                }
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                                    {providerNames[currentModel as keyof typeof providerNames]} {m.common_api_key()}
                                </FieldLabel>
                                <Input
                                    key={resetKey}
                                    defaultValue={modelsList_X.state?.[currentModel]?.api_key ?? ""}
                                    id="checkout-7j9-card-number-uw1"
                                    placeholder="Enter API Key"
                                    required
                                    onBlur={async (e) => {
                                        const value = e.target.value;
                                        if (value !== modelsList_X.state?.[currentModel]?.api_key) {
                                            await invoke(EVENT_NAMES.update_model_api_key, { model_name: currentModel, api_key: value });
                                            modelsList_X.invokeState();
                                        }
                                    }}
                                />
                                <FieldDescription>
                                    {m.common_stored_locally()}
                                    <a onClick={(e) => {
                                        e.preventDefault();
                                        open({
                                            "Qwen": "https://bailian.console.aliyun.com/cn-beijing/#/home",
                                            "OpenAI": "https://platform.openai.com/api-keys",
                                            "DeepSeek": "https://www.deepseek.com/",
                                            "ZAI": "https://open.bigmodel.cn/login",
                                        }[currentModel]!);
                                    }}> {m.common_get_api_key({ provider: providerNames[currentModel as keyof typeof providerNames] })}</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </FieldGroup>
            </form>
        </Card>
    )
}


export function LanguageSelector({
    ...props
}: React.ComponentProps<"div">) {
    const { ...currentLocale_X } = useInvoke<"en" | "zh-CN">(
        EVENT_NAMES.get_locale,
        "en",
        false,
        (locale) => {
            if (!locale) return;
            invoke(EVENT_NAMES.set_locale, { locale });
            setLocale(locale);
        },
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {props.children}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
                <DropdownMenuGroup>
                    {([
                        ["en", m.languages_en(), "English"],
                        ["zh-CN", m.languages_zh_cn(), "中文"],
                    ] as const).map(([key, label, displayLabel]) => (
                        <DropdownMenuCheckboxItem
                            className="flex flex-col items-start"
                            key={key}
                            checked={currentLocale_X.state === key}
                            onCheckedChange={async () => {
                                await currentLocale_X.setState(() => key);
                            }}
                        >
                            <span className="text-nowrap">{displayLabel}</span>
                            <span className="text-xs text-muted-foreground">
                              {label}
                            </span>
                        </DropdownMenuCheckboxItem>

                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}