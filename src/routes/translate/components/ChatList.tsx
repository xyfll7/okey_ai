import { Volume2 } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { useEffect, useRef } from "react";
import { DIVButton } from "@/components/DIVButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InputData } from "@/lib/types";
import { cn, speak } from "@/lib/utils";

export function ChatList({
	chatList,
	onSelect,
}: {
	chatList: InputData[];
	onSelect: (message: string) => void;
}) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	function extractSelectedText() {
		const selectedText = window.getSelection()?.toString().trim();
		if (selectedText) {
			onSelect(selectedText);
		}
	}

	useEffect(() => {
		void chatList;
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatList]);

	return (
		<ScrollArea className="h-full px-2">
			<div
				role="none"
				className="space-y-2 pt-2"
				onMouseUp={extractSelectedText}
				onMouseMove={extractSelectedText}
			>
				{chatList.map((chat, index) => {
					return (
						<div
							key={`chat-${chat.input_time_stamp}-${index}`}
							className={`flex w-full justify-start`}
						>
							<div className={cn("flex flex-col ", "items-start")}>
								<div
									className={`rounded-lg px-2 py-2 text-muted-foreground rounded-bl-md`}
								>
									<DIVButton
										asChild
										variant="ghost"
										size={"sm"}
										pointerEvents
										className="max-w-full [--radius:1rem] px-0! py-0 "
									>
										<div>
											<div>
												<span className="mr-1 ">{chat.input_text}</span>
												<Volume2
													className="inline translate-y-[-0.8px] text-gray-500 hover:text-gray-700"
													onClick={() => speak(chat.input_text)}
												/>
											</div>
										</div>
									</DIVButton>
									<div className="text-sm">
										{chat.response_text ? (
											<Markdown>{chat.response_text}</Markdown>
										) : (
											"..."
										)}
									</div>
								</div>
							</div>
						</div>
					);
				})}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
	);
}
