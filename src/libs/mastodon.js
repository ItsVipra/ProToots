import { log } from "./logging.js";
import { findAllDescendants, hasClasses } from "./domhelpers.js";
import { addtoTootObserver, onTootIntersection } from "../content_scripts/protoots.js";

export function mastodon() {
	log("Mastodon instance, activating Protoots");

	//create a global tootObserver to handle all article objects
	const tootObserver = new IntersectionObserver((entries) => {
		onTootIntersection(entries);
	});

	// We are tracking navigation changes with the location and a MutationObserver on `document`,
	// because the popstate event from the History API is only triggered with the back/forward buttons.
	let lastUrl = location.href;
	new MutationObserver((mutations) => {
		const url = location.href;
		if (url !== lastUrl) {
			lastUrl = url;
		}

		/**
		 * Checks whether the given n is eligible to have a proplate added
		 * @param {Node} n
		 * @returns {Boolean}
		 */
		function isPronounableElement(n) {
			return (
				n instanceof HTMLElement &&
				((n.nodeName == "ARTICLE" && n.hasAttribute("data-id")) ||
					hasClasses(
						n,
						"detailed-status",
						"status",
						"conversation",
						"account-authorize",
						"notification",
						"notification__message",
						"account",
					))
			);
		}

		mutations
			.flatMap((m) => Array.from(m.addedNodes).map((m) => findAllDescendants(m)))
			.flat()
			// .map((n) => console.log("found node: ", n));
			.filter(isPronounableElement)
			.forEach((a) => addtoTootObserver(a, tootObserver));
	}).observe(document, { subtree: true, childList: true });
}
