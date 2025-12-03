import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { Pin, PinOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [pin, setPin] = useState(false);
	const [aiResponse, setAiResponse] = useState<string | null>(null);
	const [originalText, setOriginalText] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		const unlistenResponse = listen<{ content: string; selected_text: string }>(
			"ai-response",
			(event) => {
				console.log("Received ai-response event:", event.payload);
				setAiResponse(event.payload.content);
				setOriginalText(event.payload.selected_text);
				setError(null);
			},
		);

		const unlistenError = listen<string>("ai-error", (event) => {
			console.log("Received ai-error event:", event.payload);
			setError(event.payload);
			setAiResponse(null);
			setOriginalText(null);
		});
		invoke<boolean>("get_auto_close_window_state").then((res) => {
			console.log("ssssssskkk", res);
			setPin(res);
		});
		emit("page_loaded", { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<>
			<div
				className="h-8 flex items-center justify-between "
				data-tauri-drag-region
			>
				<Button
					size="sm"
					variant="ghost"
					onClick={async () => {
						console.log("kkkkkk");
						setPin(await invoke<boolean>("toggle_auto_close_window"));
					}}
				>
					{pin ? (
						<Pin size={"1rem"} absoluteStrokeWidth />
					) : (
						<PinOff size={"1rem"} absoluteStrokeWidth />
					)}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onClick={ () => {
						invoke<boolean>("toggle_auto_close_window");
					}}
				>
					<X size={"1rem"} absoluteStrokeWidth />
				</Button>
			</div>
			<div className="p-4">
				<Button>Translate</Button>
				{originalText && (
					<div className="mt-4">
						<h2 className="font-semibold">Original Text:</h2>
						<p className="mt-2 p-2  rounded">{originalText}</p>
					</div>
				)}
				{error ? (
					<div className="mt-4 p-2   rounded">
						<h2 className="font-semibold">Error:</h2>
						<p className="mt-2">{error}</p>
					</div>
				) : aiResponse ? (
					<div className="mt-4">
						<h2 className="font-semibold">Translated Text:</h2>
						<p className="mt-2 p-2  rounded">{aiResponse}</p>
					</div>
				) : (
					<div className="mt-4 text-gray-500">
						Waiting for translation response...
					</div>
				)}
			</div>
		</>
	);
}
