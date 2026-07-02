import { useStore } from "@tanstack/react-store";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { s_ChatList } from "@/store";
import {
	HoverCard,
	HoverCardTrigger,
	HoverCardContent,
} from "@/components/ui/hover-card";

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

const MessageNavigator = () => {
	const chatList = useStore(s_ChatList, (state) =>
		state.filter((e) => e.role !== "system").slice(0, MAX_MESSAGES),
	);
	const total = chatList.length;
	const [activeIndex, setActiveIndexState] = useState(0);
	const activeIndexRef = useRef(0);
	const updateActive = (index: number) => {
		activeIndexRef.current = index;
		setActiveIndexState(index);
	};

	const programmaticScrollRef = useRef(false);
	const scrollEndTimerRef = useRef<number>(0);
	const scrollEndHandlerRef = useRef<(() => void) | null>(null);
	const ratiosRef = useRef<Map<number, number>>(new Map());

	// Adjusting state during render (not in an effect) when a derived value
	// (`total`) crosses the threshold. This isn't synchronizing with an
	// external system — it's a pure derivation of state from state — so per
	// https://react.dev/learn/you-might-not-need-an-effect it belongs here,
	// not in an effect. Guarded by the current value so it only fires once
	// per transition instead of every render. Refs aren't touched here since
	// render must stay pure — activeIndexRef is kept in sync separately.
	if (total <= MIN_MESSAGES && activeIndex !== 0) {
		setActiveIndexState(0);
	}

	// Keep the ref mirror of activeIndex up to date after render commits, so
	// effects/handlers that read activeIndexRef.current (e.g. pickActive,
	// finishProgrammaticScroll) always see the latest value without needing
	// activeIndex itself as a dependency.
	useEffect(() => {
		activeIndexRef.current = activeIndex;
	}, [activeIndex]);

	useEffect(() => {
		if (total <= MIN_MESSAGES) {
			return;
		}
		const container = document.querySelector("[data-chat-container]");
		const viewport = (container as HTMLElement | null)?.closest<HTMLElement>(
			'[data-slot="scroll-area-viewport"]',
		);
		if (!container || !viewport) return;

		ratiosRef.current.clear();

		const pickActive = () => {
			let best = -1;
			let bestRatio = 0;
			for (let i = 0; i < total; i++) {
				const r = ratiosRef.current.get(i) ?? 0;
				if (r > bestRatio) {
					bestRatio = r;
					best = i;
				}
			}
			const current = activeIndexRef.current;
			const currentRatio = ratiosRef.current.get(current) ?? 0;
			if (best >= 0 && (best === current || bestRatio > currentRatio + 0.15)) {
				updateActive(best);
			}
		};

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const idx = Number((entry.target as HTMLElement).dataset.index);
					if (!Number.isNaN(idx)) {
						ratiosRef.current.set(idx, entry.intersectionRatio);
					}
				}
				if (programmaticScrollRef.current) return;
				pickActive();
			},
			{
				root: viewport,
				threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
			},
		);

		for (let i = 0; i < total; i++) {
			const el = container.querySelector(`[data-index="${i}"]`);
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	}, [total]);

	// On unmount: clear the fallback timer AND detach any pending scrollend
	// listener so it can't fire after the component is gone. The viewport
	// isn't owned by this component, so re-query it here for cleanup.
	useEffect(
		() => () => {
			window.clearTimeout(scrollEndTimerRef.current);
			const container = document.querySelector("[data-chat-container]");
			const viewport = (container as HTMLElement | null)?.closest<HTMLElement>(
				'[data-slot="scroll-area-viewport"]',
			);
			if (scrollEndHandlerRef.current && viewport) {
				viewport.removeEventListener("scrollend", scrollEndHandlerRef.current);
				scrollEndHandlerRef.current = null;
			}
		},
		[],
	);

	const scrollToIndex = (index: number) => {
		if (index < 0 || index >= total) return;
		const container = document.querySelector("[data-chat-container]");
		const target = container?.querySelector(`[data-index="${index}"]`);
		if (!target) return;

		const viewport = (container as HTMLElement | null)?.closest<HTMLElement>(
			'[data-slot="scroll-area-viewport"]',
		);

		// Runs once the scroll is confirmed finished (by scrollend OR the
		// fallback timer). Idempotent: guards against double-fire.
		const finishProgrammaticScroll = () => {
			if (!programmaticScrollRef.current) return;
			programmaticScrollRef.current = false;
			window.clearTimeout(scrollEndTimerRef.current);
			if (scrollEndHandlerRef.current && viewport) {
				viewport.removeEventListener("scrollend", scrollEndHandlerRef.current);
				scrollEndHandlerRef.current = null;
			}
			let best = -1;
			let bestRatio = 0;
			for (let i = 0; i < total; i++) {
				const r = ratiosRef.current.get(i) ?? 0;
				if (r > bestRatio) {
					bestRatio = r;
					best = i;
				}
			}
			if (best >= 0) updateActive(best);
		};

		programmaticScrollRef.current = true;
		updateActive(index);

		// Tear down any still-pending listener/timer from a previous
		// scrollToIndex call before starting a new one (no double-attach).
		if (scrollEndHandlerRef.current && viewport) {
			viewport.removeEventListener("scrollend", scrollEndHandlerRef.current);
			scrollEndHandlerRef.current = null;
		}
		window.clearTimeout(scrollEndTimerRef.current);

		// Native scrollend: fires exactly when the browser reports the smooth
		// scroll has ended. Attached to the scroll viewport (the actual
		// scrolling element), not window.
		if (viewport) {
			scrollEndHandlerRef.current = finishProgrammaticScroll;
			viewport.addEventListener("scrollend", finishProgrammaticScroll);
		}

		target.scrollIntoView({ behavior: "smooth", block: "start" });

		// Fallback: if scrollend isn't supported (older Safari) or never
		// fires, clear programmatic mode after 1.5s so the nav doesn't get
		// stuck ignoring real intersection updates forever.
		scrollEndTimerRef.current = window.setTimeout(
			finishProgrammaticScroll,
			1500,
		);
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
					{chatList.map((item, index) => (
						<NavTick
							key={index}
							isActive={index === clampedActive}
							role={item.role}
							content={item.raw ?? item.content}
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