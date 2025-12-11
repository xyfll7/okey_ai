import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<div className=" bg-red-300 opacity-30  w-screen h-screen rounded-full" data-tauri-drag-region>
			
		</div>
	);
}
