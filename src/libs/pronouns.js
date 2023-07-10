const fieldMatchers = [/pro.*nouns?/i, "pronomen"];

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

	let pronouns;
	for (const field of fields) {
		// TODO: add ranking of fields
		if (pronouns) break;

		for (const matcher of fieldMatchers) {
			if (typeof matcher === "string" && field.name.toLowerCase().includes(matcher)) {
				pronouns = field.value;
			} else if (field.name.match(matcher)) {
				pronouns = field.value;
			}
		}
	}
	if (!pronouns) return null;
	return pronouns;
}
