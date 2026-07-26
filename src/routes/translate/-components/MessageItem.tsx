import { useRef } from "react"
import Markdown from "markdown-to-jsx/react"
import { cn } from "@/lib/utils"
import { s_Selected } from "@/store"
import { useContainerSelection } from "../-hooks/useContainerSelection"
import { Button } from "@/components/ui/button"
import Copyed from "@/components/Copyed"

export function MessageItem({ children }: { children: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { handleMouseEnter, handleMouseLeave, handleMouseUp } = useContainerSelection(
		containerRef,
		(text) => s_Selected.setState(() => ({ text })),
	);

	return (
		<div
			ref={containerRef}
			role="none"
			className={cn(" w-full")}
			style={{ scrollMarginTop: "10rem" }}
			onMouseUp={handleMouseUp}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="wrap-break-word ">
				<Markdown className="mb-2">{children}</Markdown>
				<div className={cn(children ? "" : "sr-only ", "flex items-center")} >
					<Button size={"icon-sm"} variant={"ghost"}>
						<Copyed text={children} />
					</Button>
				</div>
			</div>
		</div>
	);
}
