import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground ",
				destructive:
					"bg-destructive text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"border bg-background shadow-xs dark:bg-input/30 dark:border-input ",
				secondary: "bg-secondary text-secondary-foreground ",
				ghost: "",
				link: "text-primary underline-offset-4 ",
			},
			size: {
				default: "h-auto min-h-9 py-1 px-4 py-2 has-[>svg]:px-3",
				sm: "h-auto min-h-8 py-1 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-auto min-h-10 py-1 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function DIVButton({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="div"
			className={cn(
				buttonVariants({ variant, size, className }),
        "whitespace-normal wrap-break-word",
      
			)}
			{...props}
		/>
	);
}

export { DIVButton, buttonVariants };
