import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import AudioRecording from "@/components/AudioRecording";
import { Button } from "@/components/ui/button";
import { EVENT_NAMES } from "@/lib/events";
import type { InputData } from "@/lib/types";
import { cn, speak } from "@/lib/utils";

enum AutoSpeakState {
  Off = "off",
  Single = "single",
  All = "all",
}
export const Route = createFileRoute("/translate_bubble/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [is, setIs] = useState(false);
  const [chat, setChat] = useState<InputData>();
  useEffect(() => {
    const unlistenSpeak = listen<InputData>(
      EVENT_NAMES.AUTO_SPEAK_BUBBLE,
      ({ payload }) => {
        setIs(true);
        invoke<AutoSpeakState>(EVENT_NAMES.GET_AUTO_SPEAK_STATE).then((res) => {
          setIs(true);
          const isSingleWord =
            payload.input_text.trim().split(/\s+/).length === 1;
          if (
            (res === AutoSpeakState.Single && isSingleWord) ||
            (res === AutoSpeakState.All && payload.input_text.trim().length > 0)
          ) {
            speak(payload.input_text);
            setChat(payload);
          }
        });
      },
    );
    const unlistenResponse = listen<InputData>(
      EVENT_NAMES.AI_RESPONSE,
      ({ payload }) => setChat(payload),
    );
    const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, () => {});
    emit(EVENT_NAMES.PAGE_LOADED, { ok: true });
    return () => {
      unlistenSpeak.then((fn) => fn());
      unlistenResponse.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex items-center w-screen h-screen",
        "overflow-hidden",
        "p-px",
      )}
    >
      <div
        data-tauri-drag-region
        className="flex items-center justify-between h-full border rounded-md w-full bg-background overflow-hidden"
      >
        <div className="flex items-center w-full min-h-full overflow-hidden">
          <div
            data-tauri-drag-region
            style={{ "--avatar-size": "1rem" } as React.CSSProperties}
            className={cn(
              "h-(--avatar-size) w-(--avatar-size) min-w-(--avatar-size)",
              "rounded-full overflow-hidden mx-1 ",
            )}
          >
            <AudioRecording color={cn(is ? "bg-green-700" : "bg-yellow-700")} />
          </div>
          <div className="flex items-center min-h-full truncate overflow-hidden flex-1 w-full min-w-0">
            {chat?.response_text ?? "..."}
            <div className="h-8 min-w-2xs" data-tauri-drag-region></div>
          </div>
        </div>
        <Button
          className="mr-1"
          size={"xx"}
          variant={"ghost"}
          onClick={() => {
            console.log("12321311111111111111111111111111.............");
          }}
          data-tauri-drag-region
        >
          <Maximize2 />
        </Button>
      </div>
    </div>
  );
}
