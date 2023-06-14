// @ts-check
//const proplate = document.createElement("bdi");
//proplate.textContent = "pro/nouns";
//document.body.display-name__html.append();

// obligatory crime. because be gay, do crime.
// 8======D

import { fetchPronouns } from "../libs/fetchPronouns";
import { getLogging, isLogging } from "../libs/logging";
import { error, warn, log, info, debug } from "../libs/logging";

// const max_age = 8.64e7
const max_age = 24 * 60 * 60 * 1000; //time after which cached pronouns should be checked again: 24h
const host_name = location.host;

//before anything else, check whether we're on a Mastodon page
checkSite();
// log("hey vippy, du bist cute <3")

/**
 * Checks whether site responds to Mastodon API Calls.
 * If so creates an 'readystatechange' EventListener, with callback to main()
 */
async function checkSite() {
	getLogging();
	let requestDest = location.protocol + "//" + host_name + "/api/v1/instance";
	let response = await fetch(requestDest);

	if (response) {
		// debug('checksite response got', {'response' : response.json()})

		document.addEventListener("readystatechange", main);
	} else {
		warn("Not a Mastodon instance");
	}
}

/**
 * Evaluates the result of document.querySelector("#mastodon") and only creates a MutationObserver if the site is Mastodon.
 * Warns that site is not Mastodon otherwise.
 * - This prevents any additional code from being run.
 *
 */
function main() {
	// debug('selection for id mastodon', {'result': document.querySelector("#mastodon")})
	if (!document.querySelector("#mastodon")) {
		warn("Not a Mastodon instance");
		return;
	}

	log("Mastodon instance, activating Protoots");

	// We are tracking navigation changes with the location and a MutationObserver on `document`,
	// because the popstate event from the History API is only triggered with the back/forward buttons.
	let lastUrl = location.href;
	new MutationObserver((mutations) => {
		const url = location.href;
		if (url !== lastUrl) {
			lastUrl = url;
		}

		/**
		 * Checks whether the given n is an article or detailed status.
		 * @param {Node} n
		 * @returns {Boolean}
		 */
		function isArticleOrDetailedStatus(n) {
			return (
				n instanceof HTMLElement && (n.hasAttribute("data-id") || hasClasses(n, "detailed-status"))
			);
		}

		mutations
			.flatMap((m) => Array.from(m.addedNodes).map((m) => findAllDescendants(m)))
			.flat()
			// .map((n) => console.log("found node: ", n));
			.filter(isArticleOrDetailedStatus)
			.forEach((a) => addtoTootObserver(a));
	}).observe(document, { subtree: true, childList: true });
}

/**
 * Recursively finds all descendants of a node.
 * @param {Node} node
 * @return {Node[]} Array containing the root node and all its descendants
 */
function findAllDescendants(node) {
	return [node, ...node.childNodes, ...[...node.childNodes].flatMap((n) => findAllDescendants(n))];
}

/**
 * Searches for any statuses inside the mutations and adds it to the tootObserver.
 *
 * @param {MutationRecord[]} mutations
 */
function findStatuses(mutations) {
	// Checks whether the given n is a status in the Mastodon interface.
	function isStatus(n) {
		return n instanceof HTMLElement && n.nodeName == "ARTICLE";
	}

	mutations.flatMap((m) => [...m.addedNodes].filter(isStatus)).forEach((s) => addtoTootObserver(s));
}

//create a global tootObserver to handle all article objects
let tootObserver = new IntersectionObserver((entries) => {
	onTootIntersection(entries);
});

/**
 * Waits until the given selector appears below the given node. Then removes itself.
 * TODO: turn into single MutationObserver?
 *
 * @param {Element} node
 * @param {string} selector
 * @param {(el: Element) => void} callback
 * @copyright CC-BY-SA 4.0 wOxxoM https://stackoverflow.com/a/71488320
 */
function waitForElement(node, selector, callback) {
	let el = node.querySelector(selector);
	if (el) {
		callback(el);
		return;
	}

	new MutationObserver((mutations, observer) => {
		el = node.querySelector(selector);
		if (el) {
			observer.disconnect();
			callback(el);
		}
	}).observe(node, { subtree: true, childList: true });
}

/**
 * Callback for TootObserver
 *
 * Loops through all IntersectionObserver entries and checks whether each toot is on screen. If so a proplate will be added once the toot is ready.
 *
 * Once a toot has left the viewport its "protoots-checked" attribute will be removed.
 * @param {IntersectionObserverEntry[]} observerentries
 */
function onTootIntersection(observerentries) {
	for (let observation of observerentries) {
		let ArticleElement = observation.target;
		if (!observation.isIntersecting) {
			ArticleElement.removeAttribute("protoots-checked");
			continue;
		}
		waitForElement(ArticleElement, ".display-name", () => addProplate(ArticleElement));
	}
}

/**
 * Adds ActionElement to the tootObserver, if it has not been added before.
 * @param {Element} ActionElement
 */
function addtoTootObserver(ActionElement) {
	if (ActionElement.hasAttribute("protoots-tracked")) return;
	ActionElement.setAttribute("protoots-tracked", "true");
	tootObserver.observe(ActionElement);
}

/**
 * Adds the pro-plate to the element. The caller needs to ensure that the passed element
 * is defined and that it's either a:
 * 	- <article> with the "status" class or
 * 	- <article> with the "detailed-status" class.
 *
 * Although it's possible to pass raw {@type Element}s, the method only does things on elements of type {@type HTMLElement}.
 *
 * @param {Node | Element | HTMLElement} element The status where the element should be added.
 */
async function addProplate(element) {
	if (!(element instanceof HTMLElement)) return;

	//check whether element OR article parent has already had a proplate added
	if (hasClasses(element, "status")) {
		let parent = element.parentElement;
		while (parent && parent.nodeName != "ARTICLE") {
			parent = parent.parentElement;
		}
		if (parent.hasAttribute("protoots-checked")) return;
	}

	if (element.hasAttribute("protoots-checked")) return;

	let statusId = element.dataset.id;
	if (!statusId) {
		// We don't have a status ID, pronouns might not be in cache
		warn(
			"The element passed to addProplate does not have a data-id attribute, although it should have one.",
			element,
		);
	}

	let accountNameEl = element.querySelector(".display-name__account");
	if (!accountNameEl) {
		warn(
			"The element passed to addProplate does not have a .display-name__account, although it should have one.",
			element,
		);
		return;
	}
	let accountName = accountNameEl.textContent;
	if (!accountName) {
		warn("Could not extract the account name from the element.");
		return;
	}

	if (accountName[0] == "@") accountName = accountName.substring(1);
	// if the username doesn't contain an @ (i.e. the post we're looking at is from this instance)
	// append the host name to it, to avoid cache overlap between instances
	if (!accountName.includes("@")) {
		accountName = accountName + "@" + host_name;
	}

	//get the name element and apply CSS
	let nametagEl = /** @type {HTMLElement|null} */ (element.querySelector(".display-name__html"));
	if (!nametagEl) {
		warn(
			"The element passed to addProplate does not have a .display-name__html, although it should have one.",
			element,
		);
		return;
	}

	// Add the checked attribute only _after_ we've passed the basic checks.
	// This allows us to pass incomplete nodes into this method, because
	// we only process them after we have all required information.
	element.setAttribute("protoots-checked", "true");

	nametagEl.style.display = "flex";
	nametagEl.style.alignItems = "baseline";

	//create plate
	const proplate = document.createElement("span");
	let pronouns = await fetchPronouns(statusId, accountName);
	if (pronouns == "null" && !isLogging()) {
		return;
	}
	proplate.innerHTML = sanitizePronouns(pronouns);
	proplate.classList.add("protoots-proplate");
	if (accountName == "jasmin@queer.group" || accountName == "vivien@queer.group") {
		//i think you can figure out what this does on your own
		proplate.classList.add("proplate-pog");
	}

	//add plate to nametag
	nametagEl.appendChild(proplate);
}

/**
 * Checks whether the given element has one of the passed classes.
 *
 * @param {HTMLElement} element The element to check.
 * @param {string[]} cl The class(es) to check for.
 * @returns Whether the classList contains the class.
 */
function hasClasses(element, ...cl) {
	let classList = element.classList;
	if (!classList || !cl) return false;

	for (const c of classList) {
		for (const c2 of cl) {
			if (c === c2) return true;
		}
	}
	return false;
}

/**
 * Sanitizes the pronoun field by removing various long information parts.
 * As of today, this just removes custom emojis from the field.
 * If the passed string is not defined, an empty string is returned.
 *
 * @param {string} str The input string.
 * @returns The sanitized string.
 */
function sanitizePronouns(str) {
	if (!str) return "";

	// Remove all custom emojis with the :shortcode: format.
	str = str.replace(/:[\w_]+:/gi, "");

	// Finally, remove leading and trailing whitespace.
	return str.trim();
}
