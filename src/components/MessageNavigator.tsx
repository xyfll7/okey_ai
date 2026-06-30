import { cn } from "@/lib/utils";

const MessageNavigator = () => {
	return (
		<div className={cn("absolute right-3 top-1/2 -translate-y-1/2 z-20",)}>
			<div className="group flex flex-col items-end gap-1 w-[40px]">
				<button
					className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:shrink-0 select-none text-fg-secondary hover:bg-button-ghost-hover hover:text-fg-primary disabled:hover:bg-transparent border border-transparent h-8 gap-1.5 rounded-full overflow-hidden w-8 px-1.5 py-1.5"
					type="button"
					aria-label="Navigate to previous message"
					data-state="closed"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="stroke-2"
					>
						<path d="M18 15L12 9L6 15" stroke="currentColor"  />
					</svg>
				</button>
				<div className="flex flex-col items-end gap-0 group/timeline">
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-1.5 bg-fg-tertiary" />
					</button>
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-3 bg-fg-tertiary" />
					</button>
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-1.5 bg-fg-tertiary" />
					</button>
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-3 bg-fg-tertiary" />
					</button>
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-1.5 bg-fg-tertiary" />
					</button>
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-3 bg-fg-tertiary" />
					</button>
					<button
						className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none text-fg-secondary hover:text-fg-primary disabled:hover:bg-transparent border border-transparent px-2.5 text-xs rounded-full group/timeline-tick relative flex items-center justify-end w-10 h-3 animate-none hover:bg-transparent"
						type="button"
						aria-label="Go to response"
						data-state="closed"
					>
						<div className="rounded-full transition-all group-hover/timeline-tick:bg-primary group-hover/timeline-tick:w-4 duration-150 h-px opacity-50 group-hover:opacity-100 w-1.5 bg-fg-tertiary" />
					</button>
				</div>
				<button
					className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:shrink-0 select-none text-fg-secondary hover:bg-button-ghost-hover hover:text-fg-primary disabled:hover:bg-transparent border border-transparent h-8 gap-1.5 rounded-full overflow-hidden w-8 px-1.5 py-1.5"
					type="button"
					aria-label="Navigate to next message"
					disabled
					data-state="closed"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="stroke-2"
					>
						<path d="M6 9L12 15L18 9" stroke="currentColor"  />
					</svg>
				</button>
			</div>
		</div>
	);
};

export default MessageNavigator;
