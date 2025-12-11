import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/input_method_editor/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div
			className=" bg-red-500 opacity-70  w-screen h-screen rounded-full"
			data-tauri-drag-region
		></div>
	)
}
