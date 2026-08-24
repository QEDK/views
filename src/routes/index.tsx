import { createFileRoute } from "@tanstack/react-router";
import { Views } from "#/components/views/Views";
import fontUrl from "../components/views/space-grotesk.woff2?url";
import viewsCss from "../components/views/views.css?url";

const SITE = "https://views.qedk.sh";
const TITLE = "views.";
const DESCRIPTION =
	"endless abstract views, generated live in your browser. every visit is one of a kind.";
const IMAGE = `${SITE}/og.jpg`;
const IMAGE_ALT = "a glowing abstract colour field with the views. wordmark";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "theme-color", content: "#0e1220" },
			{ name: "description", content: DESCRIPTION },

			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: TITLE },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: SITE },
			{ property: "og:image", content: IMAGE },
			{ property: "og:image:type", content: "image/jpeg" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: IMAGE_ALT },

			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:site", content: "@qedk_" },
			{ name: "twitter:creator", content: "@qedk_" },
			{ name: "twitter:title", content: TITLE },
			{ name: "twitter:description", content: DESCRIPTION },
			{ name: "twitter:image", content: IMAGE },
			{ name: "twitter:image:alt", content: IMAGE_ALT },
		],
		links: [
			{ rel: "canonical", href: SITE },
			{
				rel: "preload",
				href: fontUrl,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{ rel: "stylesheet", href: viewsCss },
		],
	}),
	component: Views,
});
