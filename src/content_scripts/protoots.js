// @ts-check
//const proplate = document.createElement("bdi");
//proplate.textContent = "pro/nouns";
//document.body.display-name__html.append();

// obligatory crime. because be gay, do crime.
// 8======D

import { fetchPronouns } from "../libs/fetchPronouns";
import { getLogging, isLogging } from "../libs/logging";
import { warn, log } from "../libs/logging";
import { addTypeAttribute, normaliseAccountName, sanitizePronouns } from "../libs/protootshelpers";

// const max_age = 8.64e7
const hostName = location.host;

//before anything else, check whether we're on a Mastodon page
checkSite();
// log("hey vippy, du bist cute <3")

/**
 * Checks whether site responds to Mastodon API Calls.
 * If so creates an 'readystatechange' EventListener, with callback to main()
 */
async function checkSite() {
	getLogging();
	const requestDest = location.protocol + "//" + hostName + "/api/v1/instance";
	const response = await fetch(requestDest);

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

		function isName(n) {
			return (
				n instanceof HTMLElement &&
				(hasClasses(n, "display-name") || hasClasses(n, "notification__display-name"))
			);
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
					hasClasses(n, "detailed-status") ||
					hasClasses(n, "status") ||
					hasClasses(n, "conversation") ||
					hasClasses(n, "account-authorize") ||
					hasClasses(n, "notification"))
			);
		}

		function isProPlate(n) {
			return n.nodeName == "SPAN" && n.classList.contains("proplate");
		}

		function isSpan(n) {
			return n.nodeName == "SPAN";
		}

		mutations
			.flatMap((m) => Array.from(m.addedNodes).map((m) => findAllDescendants(m)))
			.flat()
			// .map((n) => console.log("found node: ", n));
			.filter(isPronounableElement)
			.forEach((a) => addtoTootObserver(a));
	}).observe(document, { subtree: true, childList: true });
}

//create a global tootObserver to handle all article objects
const tootObserver = new IntersectionObserver((entries) => {
	onTootIntersection(entries);
});

/**
 * Callback for TootObserver
 *
 * Loops through all IntersectionObserver entries and checks whether each toot is on screen. If so a proplate will be added once the toot is ready.
 *
 * Once a toot has left the viewport its "protoots-checked" attribute will be removed.
 * @param {IntersectionObserverEntry[]} observerentries
 */
function onTootIntersection(observerentries) {
	for (const observation of observerentries) {
		const ArticleElement = observation.target;
		if (!observation.isIntersecting) {
			if (ArticleElement.getAttribute("protoots-type") == "status")
				ArticleElement.removeAttribute("protoots-checked");
			continue;
		}
		waitForElement(ArticleElement, ".display-name", () => addProplate(ArticleElement));
	}
}

/**
 * Adds ActionElement to the tootObserver, if it has not been added before.
 * @param {HTMLElement} ActionElement
 */
function addtoTootObserver(ActionElement) {
	// console.log(ActionElement);
	if (ActionElement.hasAttribute("protoots-tracked")) return;

	addTypeAttribute(ActionElement);
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
	// if (hasClasses(element, "notification", "status")) {
	// 	let parent = element.parentElement;
	// 	while (parent && parent.nodeName != "ARTICLE") {
	// 		parent = parent.parentElement;
	// 	}
	// 	if (parent.hasAttribute("protoots-checked")) return;
	// }

	if (element.hasAttribute("protoots-checked")) return;

	console.log(element.querySelectorAll(".protoots-proplate"));

	if (element.querySelector(".protoots-proplate")) return; //TODO: does this work without the attribute check?

	switch (element.getAttribute("protoots-type")) {
		case "status":
			addtostatus(element);
			break;
		case "detailed-status":
			addtoDetailedStatus(element);
			break;
		case "notification":
			addtonotification(element);
			break;
		case "account-authorize":
			break;
		case "conversation":
			break;
	}

	async function addtostatus(element) {
		const statusId = element.dataset.id;
		if (!statusId) {
			// We don't have a status ID, pronouns might not be in cache
			warn(
				"The element passed to addProplate does not have a data-id attribute, although it should have one.",
				element,
			);
		}

		const accountNameEl = element.querySelector(".display-name__account");
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
			accountName = accountName + "@" + hostName;
		}

		//get the name element and apply CSS
		const nametagEl = /** @type {HTMLElement|null} */ (element.querySelector(".display-name__html"));
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

		//create plate
		const proplate = document.createElement("span");
		const pronouns = await fetchPronouns(statusId, accountName, "status");

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
		insertAfter(proplate, nametagEl);
	}

	async function addtoDetailedStatus(element) {
		const statusId = element.dataset.id;
		if (!statusId) {
			// We don't have a status ID, pronouns might not be in cache
			warn(
				"The element passed to addProplate does not have a data-id attribute, although it should have one.",
				element,
			);
		}

		const accountNameEl = element.querySelector(".display-name__account");
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

		accountName = normaliseAccountName(accountName);
		}

		//get the name element and apply CSS
		const nametagEl = /** @type {HTMLElement|null} */ (element.querySelector(".display-name__html"));
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

		nametagEl.parentElement.style.display = "flex";
		//create plate
		const proplate = document.createElement("span");
		const pronouns = await fetchPronouns(statusId, accountName, "status");

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
		insertAfter(proplate, nametagEl);
	}
	async function addtonotification(element) {
		console.debug(element);

		const statusId = element.dataset.id;
		const accountNameEl = element.querySelector(".notification__display-name");
		let accountName = accountNameEl.getAttribute("title");

		if (!accountName) {
			warn("Could not extract the account name from the element.");
			return;
		}

		if (accountName[0] == "@") accountName = accountName.substring(1);
		// if the username doesn't contain an @ (i.e. the post we're looking at is from this instance)
		// append the host name to it, to avoid cache overlap between instances
		if (!accountName.includes("@")) {
			accountName = accountName + "@" + hostName;
		}

		log(accountName);

		const nametagEl = element.querySelector(".notification__display-name");

		element.setAttribute("protoots-checked", "true");

		//create plate
		const proplate = document.createElement("span");
		const pronouns = await fetchPronouns(statusId, accountName, "notification");
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
		insertAfter(proplate, nametagEl);

		//TODO: add to contained status
	}
}
}
