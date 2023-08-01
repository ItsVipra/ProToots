/**
 * Recursively finds all descendants of a node.
 * @param {Node} node
 * @return {Node[]} Array containing the root node and all its descendants
 */
export function findAllDescendants(node) {
	return [node, ...node.childNodes, ...[...node.childNodes].flatMap((n) => findAllDescendants(n))];
}

/**
 * Checks whether the given element has one of the passed classes.
 *
 * @param {HTMLElement} element The element to check.
 * @param {string[]} cl The class(es) to check for.
 * @returns Whether the classList contains the class.
 */
export function hasClasses(element, ...cl) {
	const classList = element.classList;
	if (!classList || !cl) return false;

	for (const c of classList) {
		for (const c2 of cl) {
			if (c === c2) return true;
		}
	}
	return false;
}

/**
 * Waits until the given selector appears below the given node. Then removes itself.
 * TODO: turn into single MutationObserver?
 *
 * @param {Element} node
 * @param {string} selector
 * @param {(el: Element) => void} callback
 * @copyright CC-BY-SA 4.0 wOxxoM https://stackoverflow.com/a/71488320
 */
export function waitForElement(node, selector, callback) {
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
 * Waits until the given selector appears below the given node. Then removes itself.
 * TODO: turn into single MutationObserver?
 *
 * @param {Element} node
 * @param {string} selector
 * @param {(el: Element) => void} callback
 * @copyright CC-BY-SA 4.0 wOxxoM https://stackoverflow.com/a/71488320
 */
export function waitForElementRemoved(node, selector, callback) {
	let el = node.querySelector(selector);
	if (!el) {
		callback(el);
		return;
	}

	new MutationObserver((mutations, observer) => {
		el = node.querySelector(selector);
		if (!el) {
			observer.disconnect();
			callback(el);
		}
	}).observe(node, { subtree: true, childList: true });
}

/**
 * Inserts a given new element as a sibling of the target
 * @param {HTMLElement} insertion Element to insert
 * @param {HTMLElement} target Element, which insertion is placed after
 */
export function insertAfter(insertion, target) {
	//docs: https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore#example_2
	target.parentElement.insertBefore(insertion, target.nextSibling);
}

/**
 * Turns HTML text into human-readable text
 * @param {string} input HTML Text
 * @returns {string}
 */
export function htmlDecode(input) {
	if (typeof window === "undefined" || !window.DOMParser) {
		const replacements = {
			"&amp;": "&",
			"&quot;": '"',
			"&lt;": "<",
			"&gt;": ">",
			"&nbsp;": "",
		};
		for (const [html, text] of Object.entries(replacements)) input = input.replaceAll(html, text);

		return input;
	}

	const doc = new DOMParser().parseFromString(input, "text/html");
	return doc.documentElement.textContent;
}
