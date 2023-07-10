import sanitizeHtml from "sanitize-html";

const fieldMatchers = [/pro.*nouns?/i, "pronomen"];
const knownPronounUrls = [
	/pronouns\.page\/:?([\w/@]+)/,
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
 * @returns {Promise<string|null>} Author pronouns if found. Otherwise returns null.
 */
export async function extractFromStatus(status) {
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

	// Right now, only the pronoun.page regex matches the @usernames.
	if (text.charAt(0) === "@") {
		text = await queryPronounsFromPronounsPage(text.substring(1));
	}

	if (!text) return null;
	return text;
}

/**
 * Queries the pronouns from the pronouns.page API.
 * @param {string} username The username of the person.
 * @returns {Promise<string|null>} The pronouns that have set the "yes" opinion.
 */
async function queryPronounsFromPronounsPage(username) {
	// Example page: https://en.pronouns.page/api/profile/get/andrea?version=2
	const resp = await fetch(`https://en.pronouns.page/api/profile/get/${username}?version=2`);
	if (resp.status >= 400) {
		return null;
	}

	const { profiles } = await resp.json();
	if (!profiles) return null;

	// Unfortunately, pronouns.page does not return a 404 if a profile does not exist, but an empty profiles object. :clown_face:
	if (!Object.keys(profiles).length) return null;

	let pronouns;
	// Query the pronouns in the following language order:
	// 1. The mastodon interface language
	// 2. The spoken languages according to the user
	// 3. The english language.
	const languages = [document.documentElement.lang, ...window.navigator.languages, "en"];
	for (const lang of languages) {
		if (lang in profiles) {
			pronouns = profiles[lang].pronouns;
			break;
		}
	}

	// If we don't have a value yet, just take the first profile.
	if (!pronouns) pronouns = profiles[0].pronouns;

	let val = pronouns.find((x) => x.opinion === "yes").value;
	val = sanitizePronounPageValue(val);
	return val;
}

/**
 * @param {string} val
 */
function sanitizePronounPageValue(val) {
	if (!val.startsWith("https://")) return val;

	val = val.replace(/https?:\/\/.+\.pronouns\.page\/:?/, "");

	if (val === "no-pronouns") val = "no pronouns";
	return val;
}
