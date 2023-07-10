// @ts-check
// obligatory crime. because be gay, do crime.
// 8======D

import { fetchPronouns } from "../libs/fetchPronouns";
import {
	accountVisibility,
	conversationVisibility,
	getSettings,
	isLogging,
	notificationVisibility,
	statusVisibility,
} from "../libs/settings";
import { warn, log } from "../libs/logging";
import {
	findAllDescendants,
	hasClasses,
	insertAfter,
	waitForElement,
	waitForElementRemoved,
} from "../libs/domhelpers";
import { addTypeAttribute, normaliseAccountName, sanitizePronouns } from "../libs/protootshelpers";

const hostName = location.host;

//before anything else, check whether we're on a Mastodon page
checkSite();
// log("hey vippy, du bist cute <3")

/**
 * Checks whether site responds to Mastodon API Calls.
 * If so creates an 'readystatechange' EventListener, with callback to main()
 */
async function checkSite() {
	getSettings();
	const requestDest = location.protocol + "//" + hostName + "/api/v1/instance";
	const response = await fetch(requestDest);

	if (response) {
		// debug('checksite response got', {'response' : response.json()})

		document.addEventListener("readystatechange", main, { once: true });
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

	//All of this is Mastodon specific - factor out into mastodon.js?
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
						"account",
					))
			);
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
			waitForElementRemoved(ArticleElement, ".protoots-proplate", () => {
				ArticleElement.removeAttribute("protoots-checked");
			});
		} else {
			if (ArticleElement.getAttribute("protoots-type") == "conversation") {
				waitForElement(ArticleElement, ".conversation__content__names", () =>
					addProplate(ArticleElement),
				);
			} else {
				waitForElement(ArticleElement, ".display-name", () => addProplate(ArticleElement));
			}
		}
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
 *
 * 	- <article> with the "protoots-type" attribute
 *
 * 	- <div> with the "protoots-type" of either "status" or "detailed-status"
 *
 * Although it's possible to pass raw {@type Element}s, the method only does things on elements of type {@type HTMLElement}.
 *
 * @param {Node | Element | HTMLElement} element The status where the element should be added.
 */
async function addProplate(element) {
	if (!(element instanceof HTMLElement)) return;

	if (element.hasAttribute("protoots-checked")) return;

	const type = element.getAttribute("protoots-type");

	//objects that are not statuses would be added twice,
	//notifications and such do not have their own data-id, just their articles
	if (element.nodeName == "DIV" && !(type === "status" || type === "detailed-status")) {
		element.setAttribute("protoots-checked", "true");
		return;
	}

	if (element.querySelector(".protoots-proplate")) return;

	switch (type) {
		case "status":
		case "detailed-status":
			if (statusVisibility()) addToStatus(element);
			break;
		case "notification":
			if (notificationVisibility()) addToNotification(element);
			break;
		case "account":
		case "account-authorize":
			if (accountVisibility()) addToAccount(element);
			break;
		case "conversation":
			if (conversationVisibility()) addToConversation(element);
			break;
	}

	/**
	 * Generates a proplate and adds it as a sibling of the given nameTagEl
	 * @param {string} statusId Id of the target object
	 * @param {string} accountName Name of the account the plate is for
	 * @param {HTMLElement} nametagEl Element to add the proplate next to
	 * @param {string} type type of the target object
	 * @returns
	 */
	async function generateProPlate(statusId, accountName, nametagEl, type) {
		//create plate
		const proplate = document.createElement("span");
		const pronouns = await fetchPronouns(statusId, accountName, type);

		if (pronouns == "null" && !isLogging()) {
			return;
		}
		proplate.innerHTML = sanitizePronouns(pronouns);
		//TODO?: alt text
		proplate.classList.add("protoots-proplate");
		if (accountName == "jasmin@queer.group" || accountName == "vivien@queer.group") {
			//i think you can figure out what this does on your own
			proplate.classList.add("proplate-pog");
		}
		proplate.style.fontWeight = "500";
		//add plate to nametag
		insertAfter(proplate, nametagEl);
	}

	/**
	 * Gets the data-id from the given element
	 * @param {HTMLElement} element Element with data-id attribute
	 * @returns {string}
	 */
	function getID(element) {
		let id = element.dataset.id;
		if (!id) {
			// We don't have a status ID, pronouns might not be in cache
			warn(
				"The element passed to addProplate does not have a data-id attribute, although it should have one.",
				element,
			);
		}
		return id;
	}

	/**
	 * Basically just element.querySelector, but outputs a warning if the element isn't found
	 * @param {HTMLElement} element
	 * @param {string} accountNameClass
	 * @returns {HTMLElement|null}
	 */
	function getAccountNameEl(element, accountNameClass) {
		const accountNameEl = /** @type {HTMLElement|null} */ (element.querySelector(accountNameClass));
		if (!accountNameEl) {
			warn(
				"The element passed to addProplate does not have a .display-name__account, although it should have one.",
				element,
			);
		}
		return accountNameEl;
	}

	/**
	 * Gets the given element's textcontent or given attribute
	 * @param {HTMLElement} element Element which textcontent is the account name
	 * @param {string} attribute Attribute from which to pull the account name
	 * @returns {string} Normalised account name
	 */
	function getAccountName(element, attribute = "textContent") {
		let accountName = element.textContent;
		if (attribute != "textContent") {
			accountName = element.getAttribute(attribute);
		}
		if (!accountName) {
			warn("Could not extract the account name from the element.");
		}

		accountName = normaliseAccountName(accountName);

		return accountName;
	}

	/**
	 *
	 * @param {HTMLElement} element
	 * @param {string} nametagClass
	 * @returns {HTMLElement|null}
	 */
	function getNametagEl(element, nametagClass) {
		const nametagEl = /** @type {HTMLElement|null} */ (element.querySelector(nametagClass));
		if (!nametagEl) {
			warn(
				"The element passed to addProplate does not have a .display-name__html, although it should have one.",
				element,
			);
		}
		return nametagEl;
	}

	async function addToStatus(element) {
		let statusId = getID(element);
		if (!statusId) {
			//if we couldn't get an id from the div try the closest article
			const ArticleElement = element.closest("article");
			if (ArticleElement) {
				statusId = getID(ArticleElement);
			} else if (type === "detailed-status") {
				//if we still don't have an ID try the domain as a last resort
				warn("Attempting to retrieve id from url - this may have unforseen consequences.");
				statusId = location.pathname.split("/").pop();
			}
		}

		const accountNameEl = getAccountNameEl(element, ".display-name__account");
		const accountName = getAccountName(accountNameEl);

		const nametagEl = getNametagEl(element, ".display-name__html");

		nametagEl.parentElement.style.display = "flex";

		element.setAttribute("protoots-checked", "true");
		// Add the checked attribute only _after_ we've passed the basic checks.
		// This allows us to pass incomplete nodes into this method, because
		// we only process them after we have all required information.

		generateProPlate(statusId, accountName, nametagEl, "status");
	}

	async function addToNotification(element) {
		const statusId = getID(element);

		const accountNameEl = getAccountNameEl(element, ".notification__display-name");
		const accountName = getAccountName(accountNameEl, "title");

		const nametagEl = getNametagEl(element, ".notification__display-name");

		element.setAttribute("protoots-checked", "true");
		generateProPlate(statusId, accountName, nametagEl, "notification");
	}

	async function addToAccount(element) {
		const statusId = getID(element);
		const nametagEl = element.querySelector(".display-name__html");
		const accountName = getAccountName(element.querySelector(".display-name__account"));

		nametagEl.parentElement.style.display = "flex";

		element.setAttribute("protoots-checked", "true");
		generateProPlate(statusId, accountName, nametagEl, "account");
	}

	async function addToConversation(element) {
		const nametagEls = element.querySelectorAll(".display-name__html");

		for (const nametagEl of nametagEls) {
			const accountName = getAccountName(nametagEl.parentElement.parentElement, "title");
			generateProPlate("null", accountName, nametagEl, "conversation");
		}
		element.setAttribute("protoots-checked", "true");
	}
}
