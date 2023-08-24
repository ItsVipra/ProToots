/**
 * Creates a new HTML elmenent of the given tag name and the finite amount fo classes.
 *
 * @param {string} tagname
 * @param  {...string} classnames
 * @returns {HTMLElement}
 */
export function createElementWithClass(tagname, ...classnames) {
	const el = document.createElement(tagname);
	for (const classname of classnames) {
		el.classList.add(classname);
	}

	return el;
}

/**
Replaces all emojis within a given text with proper image tags.

	@param {string} string The input string
@param {{emojis: {shortcode: string, url: string}[]}} account The account object 
*/
export function replaceEmoji(string, account) {
	let html = string;
	const regexp = /:(\w*):/giu;
	const matches = [...html.matchAll(regexp)];

	for (const match of matches) {
		for (const emoji of account.emojis) {
			if (match[1] == emoji.shortcode) {
				html = html.replace(match[0], generateEmoji(emoji.shortcode, emoji.url));
			}
		}
	}

	return html;
}

/**
Creates an emoji element based on the shortcode and the URL.

@param {string} shortcode The emoji shortcode
@param {string} url The url to the emoji.
*/

function generateEmoji(shortcode, url) {
	const emoji = createElementWithClass("img", "emojione", "custom-emoji");
	emoji.src = url;

	return emoji.outerHTML;
}
