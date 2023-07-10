import sanitizeHtml from "sanitize-html";

const fieldMatchers = [/pro.*nouns?/i, "pronomen"];
const knownPronounUrls = [
	/pronouns\.page\/([\w/]+)/,
	/pronouns\.within\.lgbt\/([\w/]+)/,
	/pronouns\.cc\/pronouns\/([\w/]+)/,
];

/**
 * Tries to extract the pronouns for the given status.
 * This is done by searching for pronoun fields that match the {@see fieldMatchers}.
 *
 * If found, it sanitizes and returns the value of said field.
 *
 * @param {any} status
 * @returns {string|null} Author pronouns if found. Otherwise returns null.
 */
export function extractFromStatus(status) {
	// get account from status and pull out fields
	const account = status.account;
	const fields = account.fields;

	let pronounsRaw;
	for (const field of fields) {
		// TODO: add ranking of fields
		if (pronounsRaw) break;

		for (const matcher of fieldMatchers) {
			if (typeof matcher === "string" && field.name.toLowerCase().includes(matcher)) {
				pronounsRaw = field.value;
			} else if (field.name.match(matcher)) {
				pronounsRaw = field.value;
			}
		}
	}
	if (!pronounsRaw) return null;
	let text = sanitizeHtml(pronounsRaw, { allowedTags: [], allowedAttributes: {} });
	// If one of pronoun URLs matches, overwrite the current known value.
	for (const knownUrlRe of knownPronounUrls) {
		if (!knownUrlRe.test(pronounsRaw)) continue;
		text = pronounsRaw.match(knownUrlRe)[1];
	}

	if (!text) return null;
	return text;
}
