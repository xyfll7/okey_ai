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
import { IISettings } from "./icons/hugeicons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { open } from "@tauri-apps/plugin-shell";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { invoke } from "@tauri-apps/api/core";
import { s_CurrentLocale, s_CurrentModel } from "@/store";
import { useStore } from "@tanstack/react-store";
import type { ModelConfigMap } from "@/@types";
import { ModelProviderShowName } from "@/lib/types";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card } from "./ui/card";
import { IILanguages } from "./icons/index";
import { useTranslation } from "react-i18next";

import * as React from "react";

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function SettingsNew({ className }: { className?: string }) {
    const { t } = useTranslation();
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
            <Button size={"icon-sm"} variant={"ghost"} className={className} >
                <IISettings />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="" data-tauri-drag-region>
                <DrawerTitle className={cn("flex justify-between select-none", "")} data-tauri-drag-region>
                    {t("common.settings")}
                    <LanguageSelector>
                        <Button size={"icon-sm"} variant={"ghost"}>
                            <IILanguages />
                        </Button>
                    </LanguageSelector>
                </DrawerTitle>
                <DrawerDescription className="sr-only" />
            </DrawerHeader>
            <ScrollArea className={cn("h-[70vh]")}>
                <div className="max-w-screen flex-coh items-start px-2">
                    <ModelConfigurationForm />
                </div>
            </ScrollArea>
        </DrawerContent>
    </Drawer>
}

function ModelConfigurationForm() {
    const { t } = useTranslation();
    const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
    const currentModel = useStore(s_CurrentModel, (state => state))
    const resetKey = `${currentModel}-${modelsList_X.state?.[currentModel]?.api_key ?? ''}`;
    return (
        <Card className="px-2.5 w-full">
            <form>
                <FieldGroup>
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                                    {t("common.api_provider")} ({ModelProviderShowName[currentModel as keyof typeof ModelProviderShowName]})
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
                                                        s_CurrentModel.setState(key)
                                                    }}
                                                >
                                                    {ModelProviderShowName[key as keyof typeof ModelProviderShowName]}
                                                </ToggleGroupItem>
                                            ))}
                                    </ToggleGroup>
                                }
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                                    {ModelProviderShowName[currentModel as keyof typeof ModelProviderShowName]} {t("common.api_key")}
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
                                    {t("common.stored_locally")}
                                    <a onClick={(e) => {
                                        e.preventDefault();
                                        open({
                                            "Qwen": "https://bailian.console.aliyun.com/cn-beijing/#/home",
                                            "OpenAI": "https://platform.openai.com/api-keys",
                                            "DeepSeek": "https://www.deepseek.com/",
                                            "ZAI": "https://open.bigmodel.cn/login",
                                        }[currentModel]!);
                                    }}> {t("common.get_api_key", { provider: ModelProviderShowName[currentModel as keyof typeof ModelProviderShowName] })}</a>
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
    const { t } = useTranslation();
    const currentLocale = useStore(s_CurrentLocale, (state => state))
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {props.children}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
                <DropdownMenuGroup>
                    {[
                        ["en", t("languages.en"), "English"],
                        ["zh-CN", t("languages.zh_cn"), "中文"],
                    ].map(([key, label, displayLabel]) => (
                        <DropdownMenuCheckboxItem
                            className="flex flex-col items-start"
                            key={key}
                            checked={currentLocale === key}
                            onCheckedChange={() => { s_CurrentLocale.setState(key) }}
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