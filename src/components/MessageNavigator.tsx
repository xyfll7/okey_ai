import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
	HoverCard,
	HoverCardTrigger,
	HoverCardContent,
} from "@/components/ui/hover-card";
import { useChatContext } from "./chat/chatContext";
import { getMessageText } from "./chat/chatUtils";

const MIN_MESSAGES = 4;
const MAX_MESSAGES = 10;
const NavTick = ({
	isActive,
	role,
	content,
	onClick,
}: {
	isActive: boolean;
	role: string;
	content: string;
	onClick: () => void;
}) => {
	return (
		<HoverCard openDelay={300} closeDelay={100}>
			<HoverCardTrigger asChild>
				<button
					className="group/tick gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
					type="button"
					aria-label={role === "user" ? "Go to your message" : "Go to response"}
					aria-current={isActive ? "true" : undefined}
					onClick={onClick}
				>
					<div
						className={cn(
							"overflow-hidden",
							"rounded-full h-px transition-[width,opacity,background-color] duration-150 will-change-[width] bg-fg-tertiary opacity-50 group-hover:opacity-70 group-hover/tick:w-4 group-hover/tick:bg-fg-primary group-hover/tick:opacity-100",
							isActive
								? "w-4 bg-fg-primary! opacity-100!"
								: role === "assistant"
									? "w-3"
									: "w-1.5",
						)}
					/>
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				side="left"
				align="center"
				sideOffset={8}
				className="max-w-64 max-h-40 overflow-hidden"
			>
				<p className="text-xs text-fg-secondary leading-relaxed line-clamp-5">
					{content}
				</p>
			</HoverCardContent>
		</HoverCard>
	);
};

/**
 * Finds the DOM elements for the currently rendered chat container/viewport.
 * Re-queried on demand rather than cached, since the container isn't owned
 * by this component and can be remounted elsewhere.
 */
const getScrollElements = () => {
	const container = document.querySelector<HTMLElement>(
		"[data-chat-container]",
	);
	const viewport = container?.closest<HTMLElement>(
		'[data-slot="message-scroller-viewport"]',
	);
	return { container, viewport };
};

/**
 * Scrollspy: walks messages top-to-bottom and returns the index of the
 * last one whose top edge is at or above the viewport's top edge (plus a
 * small offset). This mirrors where `scrollIntoView({ block: "start" })`
 * lands, so programmatic and organic scrolling agree on the same answer.
 *
 * Reads layout synchronously via getBoundingClientRect — no async
 * batching, no staleness, no "has it settled yet" question to answer.
 */
const computeActiveIndex = (
	container: HTMLElement,
	viewportTop: number,
	total: number,
	offset = 8,
): number => {
	let active = 0;
	for (let i = 0; i < total; i++) {
		const el = container.querySelector<HTMLElement>(`[data-index="${i}"]`);
		if (!el) break;
		const top = el.getBoundingClientRect().top;
		if (top - viewportTop <= offset) {
			active = i;
		} else {
			break;
		}
	}
	return active;
};

const MessageNavigator = () => {
	const { messages } = useChatContext()
	const msg = messages.filter(e => e.role != "system").slice(0, MAX_MESSAGES)

	const total = msg.length;
	const [activeIndex, setActiveIndex] = useState(0);

	// Single mode flag: 'auto' means the scrollspy is free to update
	// activeIndex from scroll position. 'manual' means a click just set
	// the index and it should stick until the user genuinely scrolls by
	// hand (wheel/touch/pointer) — a real input event, not a timer or
	// frame count standing in for one.
	const modeRef = useRef<"auto" | "manual">("auto");
	const rafPendingRef = useRef(false);

	// Pure derivation: collapse activeIndex back to 0 once the nav drops
	// below the visibility threshold. Per https://react.dev/learn/you-might-not-need-an-effect
	// this belongs in render, not an effect, since it's just state
	// derived from state and must only fire once per crossing.
	if (total <= MIN_MESSAGES && activeIndex !== 0) {
		setActiveIndex(0);
	}

	useEffect(() => {
		if (total <= MIN_MESSAGES) return;

		const { container, viewport } = getScrollElements();
		if (!container || !viewport) return;

		const recompute = () => {
			rafPendingRef.current = false;
			if (modeRef.current === "manual") return;
			const viewportTop = viewport.getBoundingClientRect().top;
			const next = computeActiveIndex(container, viewportTop, total);
			setActiveIndex((prev) => (prev === next ? prev : next));
		};

		const onScroll = () => {
			if (rafPendingRef.current) return;
			rafPendingRef.current = true;
			requestAnimationFrame(recompute);
		};

		// Any of these is unambiguous evidence the user is scrolling by
		// hand right now, so hand control back to the scrollspy
		// immediately — no cooldown or guesswork needed.
		const onUserInput = () => {
			modeRef.current = "auto";
		};

		viewport.addEventListener("scroll", onScroll, { passive: true });
		viewport.addEventListener("wheel", onUserInput, { passive: true });
		viewport.addEventListener("touchstart", onUserInput, { passive: true });
		viewport.addEventListener("pointerdown", onUserInput, { passive: true });
		window.addEventListener("resize", onScroll);

		// Establish the initial position.
		recompute();

		return () => {
			viewport.removeEventListener("scroll", onScroll);
			viewport.removeEventListener("wheel", onUserInput);
			viewport.removeEventListener("touchstart", onUserInput);
			viewport.removeEventListener("pointerdown", onUserInput);
			window.removeEventListener("resize", onScroll);
		};
	}, [total]);

	const scrollToIndex = (index: number) => {
		if (index < 0 || index >= total) return;
		const { container } = getScrollElements();
		const target = container?.querySelector(`[data-index="${index}"]`);
		if (!target) return;

		// Lock immediately: the click is the source of truth for the new
		// index. Nothing recomputes or overrides it until the user
		// actually scrolls by hand (see onUserInput above).
		modeRef.current = "manual";
		setActiveIndex(index);
		target.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	if (total <= MIN_MESSAGES) return null;

	const clampedActive = Math.min(Math.max(activeIndex, 0), total - 1);
	const canGoPrev = clampedActive > 0;
	const canGoNext = clampedActive < total - 1;

	return (
		<div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
			<div className="group flex flex-col items-center gap-1">
				<button
					className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:shrink-0 select-none text-fg-secondary hover:bg-button-ghost-hover hover:text-fg-primary disabled:hover:bg-transparent border border-transparent h-8 gap-1.5 rounded-full overflow-hidden w-8 px-1.5 py-1.5 opacity-0! transition-all duration-200 group-hover:opacity-100! disabled:group-hover:opacity-60! -me-2 translate-y-1 group-hover:translate-y-0"
					type="button"
					aria-label="Navigate to previous message"
					disabled={!canGoPrev}
					onClick={() => scrollToIndex(clampedActive - 1)}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-2">
						<path d="M18 15L12 9L6 15" stroke="currentColor" strokeLinecap="square" />
					</svg>
				</button>

				<div className="flex flex-col items-end gap-0">
					{msg.map((item, index) => (
						<NavTick
							key={index}
							isActive={index === clampedActive}
							role={item.role!}
							content={getMessageText(item)}
							onClick={() => scrollToIndex(index)}
						/>
					))}
				</div>

				<button
					className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:shrink-0 select-none text-fg-secondary hover:bg-button-ghost-hover hover:text-fg-primary disabled:hover:bg-transparent border border-transparent h-8 gap-1.5 rounded-full overflow-hidden w-8 px-1.5 py-1.5 opacity-0! transition-all duration-200 group-hover:opacity-100! disabled:group-hover:opacity-60! -me-2 -translate-y-1 group-hover:translate-y-0"
					type="button"
					aria-label="Navigate to next message"
					disabled={!canGoNext}
					onClick={() => scrollToIndex(clampedActive + 1)}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-2">
						<path d="M6 9L12 15L18 9" stroke="currentColor" strokeLinecap="square" />
					</svg>
				</button>
			</div>
		</div>
	);
};

export default MessageNavigator;