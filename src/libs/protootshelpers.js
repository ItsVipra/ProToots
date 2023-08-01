import { hasClasses } from "./domhelpers";

/**
 * Removes the leading @ from a username and adds the host name, if it isn't part of the username.
 * @param {string} name
 * @returns {string}
 */
export function normaliseAccountName(name) {
	if (!name) throw new Error("null/undefined passed to normaliseAccountName");
	if (name[0] == "@") name = name.substring(1);
	// if the username doesn't contain an @ (i.e. the post we're looking at is from this instance)
	// append the host name to it, to avoid cache overlap between instances
	if (!name.includes("@")) {
		name = name + "@" + location.host;
	}

	return name;
}

/**
 * Turns a link to an account on a remote instance into a username.
 *
 *  e.g. `https://example.com/@test` -> `@test@example.com`
 * @param {string|null} url URL to an account on their own instance
 * @returns {string} username (not normalised)
 */
export function accountNameFromURL(url) {
	if (!url) return null;
	const splitURL = url.split("/");

	const username = [splitURL.pop(), splitURL.pop()].join("@");

	return username;
}

/**
 * Checks which type an element is and adds the according protoots-type attribute
 * @param {HTMLElement} ActionElement
 */
export function addTypeAttribute(ActionElement) {
	if (hasClasses(ActionElement, "status") && !hasClasses(ActionElement, "notification__message")) {
		ActionElement.setAttribute("protoots-type", "status");
	} else if (hasClasses(ActionElement, "detailed-status")) {
		ActionElement.setAttribute("protoots-type", "detailed-status");
	} else if (hasClasses(ActionElement, "conversation")) {
		ActionElement.setAttribute("protoots-type", "conversation");
		ActionElement.closest("article").setAttribute("protoots-type", "conversation");
	} else if (hasClasses(ActionElement, "account-authorize")) {
		ActionElement.setAttribute("protoots-type", "account-authorize");
		ActionElement.closest("article").setAttribute("protoots-type", "account-authorize");
	} else if (hasClasses(ActionElement, "notification", "notification__message")) {
		ActionElement.setAttribute("protoots-type", "notification");
		ActionElement.closest("article").setAttribute("protoots-type", "notification");
	} else if (hasClasses(ActionElement, "account")) {
		ActionElement.setAttribute("protoots-type", "account");
		ActionElement.closest("article").setAttribute("protoots-type", "account");
	}
}
