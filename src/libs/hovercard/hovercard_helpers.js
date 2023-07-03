export function createElementWithClass(tagname, ...classnames) {
	const el = document.createElement(tagname);
	for (const classname of classnames) {
		el.classList.add(classname);
	}

	return el;
}

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

function generateEmoji(shortcode, url) {
	const emoji = createElementWithClass("img", "emojione", "custom-emoji");
	emoji.src = url;

	return emoji.outerHTML;
}
