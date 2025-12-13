import { createFileRoute } from "@tanstack/react-router";
import AudioRecording from "@/components/AudioRecording";
export const Route = createFileRoute("/input_method_editor/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex items-center">
      <div
        className=" opacity-70  w-screen h-screen rounded-full overflow-hidden"
        data-tauri-drag-region
      >
        <AudioRecording isRecording={true}></AudioRecording>
      </div>
    </div>
  );
}
