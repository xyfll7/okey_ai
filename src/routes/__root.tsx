import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatProvider } from "../components/chat/chatProvider";
import { ChatInit } from "../components/chat/chatInit";

export const Route = createRootRoute({
	component: () => (
		<>
			<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
				<ChatProvider>
					<ChatInit>
						<Outlet />
					</ChatInit>
				</ChatProvider>
			</ThemeProvider>
			{/* <TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/> */}
		</>
	),
});
