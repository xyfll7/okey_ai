import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { useState } from "react"
import type { ChatHistories } from "@/lib/types"


export function Histories() {
    const [histoies, setHistories] = useState<ChatHistories>()

    return <Drawer>
        <DrawerTrigger onClick={async () => {
            const res = await invoke<ChatHistories>(EVENT_NAMES.GET_HISTORIES)
            console.log("histoies：：", res)
            setHistories(res)
        }}>
            <Button size={"sm"} variant={"outline"} >histoies</Button>
        </DrawerTrigger>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                <DrawerDescription>

                    {histoies && Object.keys(histoies ?? {}).map(e => {
                        return <Button>{histoies[e].messages.at(0)?.content}</Button> 
                    })}

                </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
}