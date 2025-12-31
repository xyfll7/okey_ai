import { createFileRoute } from "@tanstack/react-router";
import AudioRecording from "@/components/AudioRecording";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/input_method_editor/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className={cn("h-full", "flex items-center ")}>
			<div
				className="h-full w-full  rounded-full overflow-hidden"
				data-tauri-drag-region
			>
				<AudioRecording />
			</div>
		</div>
	);
}
