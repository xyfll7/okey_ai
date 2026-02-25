import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles_my.css";
import "./index.css";

import reportWebVitals from "./reportWebVitals.ts";
import i18n from "./i18n/index.ts";

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<I18nextProvider i18n={i18n}>
			<RouterProvider router={router} />
		</I18nextProvider>
	);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
