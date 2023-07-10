import { hasClasses } from "./domhelpers";

/**
 * Removes the leading @ from a username and adds the host name, if it isn't part of the username.
 * @param {string} name
 * @returns {string}
 */
export function normaliseAccountName(name) {
	if (!name) return "null";
	if (name[0] == "@") name = name.substring(1);
	// if the username doesn't contain an @ (i.e. the post we're looking at is from this instance)
	// append the host name to it, to avoid cache overlap between instances
	if (!name.includes("@")) {
		name = name + "@" + location.host;
	}

	return name;
}

/**
 * Sanitizes the pronoun field by removing various long information parts.
 * As of today, this just removes custom emojis from the field.
 * If the passed string is not defined, an empty string is returned.
 *
 * @param {string} str The input string.
 * @returns The sanitized string.
 */
export function sanitizePronouns(str) {
	if (!str) return "";

	// Remove all custom emojis with the :shortcode: format.
	str = str.replace(/:[\w_]+:/gi, "");

	// Finally, remove leading and trailing whitespace.
	return str.trim();
}

/**
 * Checks which type an element is and adds the according protoots-type attribute
 * @param {HTMLElement} ActionElement
 */
export function addTypeAttribute(ActionElement) {
	if (hasClasses(ActionElement, "status")) {
		ActionElement.setAttribute("protoots-type", "status");
	} else if (hasClasses(ActionElement, "detailed-status")) {
		ActionElement.setAttribute("protoots-type", "detailed-status");
	} else if (hasClasses(ActionElement, "conversation")) {
		ActionElement.setAttribute("protoots-type", "conversation");
		ActionElement.closest("article").setAttribute("protoots-type", "conversation");
	} else if (hasClasses(ActionElement, "account-authorize")) {
		ActionElement.setAttribute("protoots-type", "account-authorize");
		ActionElement.closest("article").setAttribute("protoots-type", "account-authorize");
	} else if (hasClasses(ActionElement, "notification")) {
		ActionElement.setAttribute("protoots-type", "notification");
		ActionElement.closest("article").setAttribute("protoots-type", "notification");
	} else if (hasClasses(ActionElement, "account")) {
		ActionElement.setAttribute("protoots-type", "account");
		ActionElement.closest("article").setAttribute("protoots-type", "account");
	}
}
