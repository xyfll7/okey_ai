import { createFileRoute } from "@tanstack/react-router";
import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
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
		)

		const unlistenError = listen<string>("ai-error", (event) => {
			console.log("Received ai-error event:", event.payload);
			setError(event.payload);
			setAiResponse(null);
			setOriginalText(null);
		})
		emit("page_loaded", { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		}
	}, []);
	return (
		<>
			<div className="h-8" data-tauri-drag-region></div>
			<div className="p-4">
				<h1 className="text-xl font-bold">Translation Result</h1>
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
	)
}
