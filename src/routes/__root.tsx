import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";

export const Route = createRootRoute({
	component: () => (
		<>
			<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
				<Outlet />
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
