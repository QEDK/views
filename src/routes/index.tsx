import { createFileRoute } from "@tanstack/react-router";
import { Views } from "#/components/views/Views";
import viewsCss from "../components/views/views.css?url";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "views." },
			{ name: "theme-color", content: "#0e1220" },
			{
				name: "description",
				content:
					"endless abstract views, generated live in your browser. every visit is one of a kind.",
			},
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&display=swap",
			},
			{ rel: "stylesheet", href: viewsCss },
		],
	}),
	component: Views,
});
