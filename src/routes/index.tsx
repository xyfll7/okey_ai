import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<div className="text-center">
			<header>
				<Button size={"icon-sm"}>
					<X
						size={"1rem"}
						onClick={() => {}}
						className="opacity-70 hover:opacity-100"
					/>
				</Button>
				<Button size={"icon-sm"} variant={"ghost"} className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent">
					<X
						size={"1rem"}
						onClick={() => {}}
						
					/>
				</Button>
				<Dialog>
					<DialogTrigger>Open</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Are you absolutely sure?</DialogTitle>
							<DialogDescription>
								This action cannot be undone. This will permanently delete your
								account and remove your data from our servers.
							</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			</header>
		</div>
	);
}
