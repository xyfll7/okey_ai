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


export function Histories() {
    const [histoies, setHistories] = useState<ChatHistories>()
    return <Drawer>
        <DrawerTrigger onClick={async () => {
            const res = await invoke<ChatHistories>(EVENT_NAMES.GET_HISTORIES)
            console.log("histoies：：", res)
            setHistories(res)
        }}>
            <Button size={"icon-sm"} variant={"ghost"}>
                <IIList />
            </Button>
        </DrawerTrigger>
        <DrawerContent>
            <DrawerHeader>
                <DrawerDescription>
                    {histoies && Object.keys(histoies ?? {}).map(e => {
                        return <Button className="max-w-full" variant={"ghost"}>
                            <span className="truncate">
                                {histoies[e].messages.at(1)?.raw}
                            </span>
                        </Button>
                    })}
                </DrawerDescription>
            </DrawerHeader>
        </DrawerContent>
    </Drawer>
}