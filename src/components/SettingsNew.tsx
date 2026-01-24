import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { useState } from "react"
import { IISettings } from "./icons/hugeicons"
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"


export function SettingsNew({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    return <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger onClick={async (e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            setIsOpen(true)
        }} asChild >
            <Button size={"icon-sm"} variant={"ghost"} className={className} >
                <IISettings />
            </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-2 [&_.bg-muted.mx-auto.mt-4.hidden.h-1.w-\[100px\].shrink-0.rounded-full]:hidden">
            <DrawerHeader className="">
                <DrawerTitle className=" flex justify-start">Settings</DrawerTitle>
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


import { Checkbox } from "@/components/ui/checkbox"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

function FieldDemo() {
    return (
        <div className="w-full px-2.5 pb-2">
            <form>
                <FieldGroup>
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                                    API Provider
                                </FieldLabel>
                                <ToggleGroupSpacing />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                                    Card Number
                                </FieldLabel>
                                <Input
                                    id="checkout-7j9-card-number-uw1"
                                    placeholder="1234 5678 9012 3456"
                                    required
                                />
                                <FieldDescription>
                                    Enter your 16-digit card number
                                </FieldDescription>
                            </Field>
                            <div className="grid grid-cols-3 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="checkout-exp-month-ts6">
                                        Month
                                    </FieldLabel>
                                    <Select defaultValue="">
                                        <SelectTrigger id="checkout-exp-month-ts6">
                                            <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="01">01</SelectItem>
                                                <SelectItem value="02">02</SelectItem>
                                                <SelectItem value="03">03</SelectItem>
                                                <SelectItem value="04">04</SelectItem>
                                                <SelectItem value="05">05</SelectItem>
                                                <SelectItem value="06">06</SelectItem>
                                                <SelectItem value="07">07</SelectItem>
                                                <SelectItem value="08">08</SelectItem>
                                                <SelectItem value="09">09</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="11">11</SelectItem>
                                                <SelectItem value="12">12</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-exp-year-f59">
                                        Year
                                    </FieldLabel>
                                    <Select defaultValue="">
                                        <SelectTrigger id="checkout-7j9-exp-year-f59">
                                            <SelectValue placeholder="YYYY" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="2024">2024</SelectItem>
                                                <SelectItem value="2025">2025</SelectItem>
                                                <SelectItem value="2026">2026</SelectItem>
                                                <SelectItem value="2027">2027</SelectItem>
                                                <SelectItem value="2028">2028</SelectItem>
                                                <SelectItem value="2029">2029</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-cvv">CVV</FieldLabel>
                                    <Input id="checkout-7j9-cvv" placeholder="123" required />
                                </Field>
                            </div>
                        </FieldGroup>
                    </FieldSet>
                    <FieldSeparator />
                    <FieldSet>
                        <FieldLegend>Billing Address</FieldLegend>
                        <FieldDescription>
                            The billing address associated with your payment method
                        </FieldDescription>
                        <FieldGroup>
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="checkout-7j9-same-as-shipping-wgm"
                                    defaultChecked
                                />
                                <FieldLabel
                                    htmlFor="checkout-7j9-same-as-shipping-wgm"
                                    className="font-normal"
                                >
                                    Same as shipping address
                                </FieldLabel>
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-optional-comments">
                                    Comments
                                </FieldLabel>
                                <Textarea
                                    id="checkout-7j9-optional-comments"
                                    placeholder="Add any additional comments"
                                    className="resize-none"
                                />
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                    <Field orientation="horizontal">
                        <Button type="submit">Submit</Button>
                        <Button variant="outline" type="button">
                            Cancel
                        </Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}


import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { invoke } from "@tauri-apps/api/core";

export function ToggleGroupSpacing() {
    const { ...modelsList_X } = useInvoke<string[]>(EVENT_NAMES.list_available_models, []);
    const { ...currentModel_X } = useInvoke<string>(EVENT_NAMES.get_current_model, "");

    if (!currentModel_X.state) {
        return null;
    }
    return (
        <ToggleGroup
            type="single"
            size="sm"
            defaultValue={currentModel_X.state}
            variant="outline"
            spacing={2}
            className="flex-wrap w-full"
        >
            {modelsList_X.state?.map((model) => (
                <ToggleGroupItem value={model} aria-label="Toggle top" key={model} 
                onClick={async () => {
                    await invoke(EVENT_NAMES.switch_model, { model_name: model })
                    currentModel_X.invokeState()
                }}
                >
                    {model}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
