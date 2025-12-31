import { createFileRoute } from "@tanstack/react-router";
import AudioRecording from "@/components/AudioRecording";

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
        <AudioRecording />
      </div>
    </div>
  );
}
