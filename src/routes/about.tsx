import AudioRecording from "@/components/AudioRecording";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex items-center w-screen h-screen">
      <div
        className=" opacity-70  h-full w-full  rounded-full overflow-hidden"
        data-tauri-drag-region
      >
        <AudioRecording isRecording={true}></AudioRecording>
      </div>
    </div>
  );
}
