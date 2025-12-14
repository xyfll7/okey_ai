import AudioRecording from "@/components/AudioRecording";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";

import { useEffect, useState } from "react";

import { EVENT_NAMES } from "@/lib/events";
import type { InputData } from "@/lib/types";
import { speak, cn } from "@/lib/utils";

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
  useEffect(() => {
    const unlistenSpeak = listen<InputData>(
      EVENT_NAMES.AUTO_SPEAK,
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
          }
        });
      },
    );
    const unlistenResponse = listen<InputData>(
      EVENT_NAMES.AI_RESPONSE,
      ({}) => {},
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
    <div className={cn("flex items-center w-screen h-screen", "bg-red-400")}>
      <div
        className={cn(
          "h-screen w-[100vh] rounded-full overflow-hidden",
          "bg-gray-100",
        )}
        data-tauri-drag-region
      >
        <AudioRecording color={cn(is ? "bg-green-700" : "bg-yellow-700")} />
      </div>
    </div>
  );
}
