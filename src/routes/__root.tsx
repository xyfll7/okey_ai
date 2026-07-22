import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatProvider } from "./translate/-components/chatProvider";

export const Route = createRootRoute({
	component: () => (
		<>
			<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
				<ChatProvider>
					<Outlet />
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
