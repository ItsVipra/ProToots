import sanitizeHtml from "sanitize-html";
import { htmlDecode } from "./domhelpers.js";
import { allKnownPronouns } from "./generated/pronouns/index.js";

const fieldMatchers = [/\bpro.*nouns?\b/i, /\bpronomen\b/i, /(i )?go(es)? by/i];
const knownPronounUrls = [
	/pronouns\.page\/([a-zA-Z]+\/[a-zA-Z]+)/,
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
	const { fields, note } = account;
	const searchFields = [...(fields ?? []), { name: "__protoots-bio__", value: note }];

	const pronounSearchMatch = await findPronouns(searchFields);
	if (!pronounSearchMatch) return null;
	const { value, exactMatch } = pronounSearchMatch;

	// If the result is already exact, we can skip all further processings in the pipeline.
	if (exactMatch) return value;

	// If we can extract the pronouns of one of the known URLs, return the result.
	for (const url of knownPronounUrls) {
		const m = value.match(url);
		if (m) return m.pop();
	}

	// First, check whether we can find a pronouns.page link inside of the value.
	const fromPronounsPage = await extractPronounsPagePronouns(value);
	if (fromPronounsPage) return fromPronounsPage;

	// Otherwise, continue with the sanitation and return whatever we found.
	let text = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
	text = sanitizePronouns(text);
	return text;
}

/**
 * Searches through the field values and names for pronouns.
 * If the match does not need further processing, exactMatch is set to true.
 *
 * @param {{name: string, value: string}[]} fields
 * @returns {Promise<{value: string, exactMatch: boolean}|null>}
 */
async function findPronouns(fields) {
	for (const { name, value } of fields) {
		// Either search for a known field name.
		const hasMatch = fieldMatchers.find((m) => name.match(m)) !== undefined;
		if (hasMatch) return { value: value, exactMatch: false };

		// Or check whether the either the name or the value contains a set of known pronouns.
		const textualValues = [value, name];
		const fromKnownPronouns = textualValues.map(searchForKnownPronouns).find((x) => x);
		if (fromKnownPronouns) return { value: fromKnownPronouns, exactMatch: true };
	}

	const textValues = [...fields.map((f) => f.value), ...fields.map((f) => f.name)].filter((v) => v);

	// If fields and bio neither contain known pronouns or match against the field matcher,
	// search for static URL matches inside all values next.
	const containsKnownURL = textValues
		.flatMap((v) => knownPronounUrls.map((re) => v.match(re)))
		.find((x) => x);
	if (containsKnownURL) {
		return {
			value: containsKnownURL[0],
			exactMatch: false,
		};
	}

	// Finally, as last try, search for all occurrences of pronouns.page links.
	// Due to the API calls they are the most "expensive" and therefore are used as a last resort.
	for (const v of textValues) {
		const res = await extractPronounsPagePronouns(v);
		if (res) return { value: res, exactMatch: true };
	}

	// If all the checks above fail, the search failed.
	return null;
}

/**
 * Extracts and sanitizes pronouns.page URLs from the given text.
 * @param {string} text
 * @returns {Promise<string|null>}
 */
async function extractPronounsPagePronouns(text) {
	const pattern = /pronouns\.page\/(@(?<username>\w+))?:?(?<pronouns>[\w/]+)?/i;
	const match = text.match(pattern);
	if (!match) return null;

	const { username, pronouns } = match.groups;
	const res = pronouns ?? (await queryUserFromPronounsPage(username));

	return normalizePronounPagePronouns(res);
}

/**
 * Queries the pronouns for a given user from the pronouns.page API.
 * @param {string} username The username of the person, without the leading "@".
 * @returns {Promise<string|null>} The pronouns that have set the "yes" or "meh" opinion.
 */
async function queryUserFromPronounsPage(username) {
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

	let val = pronouns.find((x) => x.opinion === "yes" || x.opinion === "meh").value;
	val = await normalizePronounPagePronouns(val);
	return val;
}

/**
 * @param {string} val
 * @returns {Promise<string|null>}
 */
async function normalizePronounPagePronouns(val) {
	if (!val) return null;

	const match = val.match(/pronouns\.page\/(.+)/);
	if (match) val = match[1];

	if (val.includes("/")) return val;

	if (val === "no-pronouns") return "no pronouns";

	const pronounNameResp = await fetch("https://en.pronouns.page/api/pronouns/" + val);
	if (!pronounNameResp.ok) {
		// In case the request fails, better show the likely pronouns than nothing at all.
		return val;
	}

	// If we query the pronouns.page API with invalid values, an empty body is returned, still with status code 200.
	// Therefore, we just try to parse the JSON and if it does not work, we return the "val" from earlier and don't
	// do further processing.
	try {
		const {
			morphemes: { pronoun_subject: sub, possessive_determiner: det },
		} = await pronounNameResp.json();

		return [sub, det].join("/");
	} catch {
		return val;
	}
}

/**
 * Sanitizes the pronoun field by removing various long information parts.
 * As of today, this just removes custom emojis from the field.
 * If the passed string is not defined, null is returned.
 *
 * @param {string} str The input string.
 * @returns {string|null} The sanitized string.
 */
function sanitizePronouns(str) {
	if (!str) return null;

	// Remove all custom emojis with the :shortcode: format.
	str = str.replace(/:[\w_]+:/gi, "");

	// We still might have URLs in our text, for example, if people redirect some domain to pronouns.page.
	// We filter them out, because they would not be clickable anyways and provide no benefit.
	str = str
		.split(" ")
		.filter((x) => {
			// Let's try to build an URL and if it looks like one, filter it out.
			try {
				const u = new URL(x);
				return !u.protocol.startsWith("http");
			} catch {
				return true;
			}
		})
		.join(" ");

	// Remove trailing characters that are used as separators.
	str = str.replace(/[-| :/]+$/, "");

	// Remove leading and trailing whitespace.
	str = str.trim();

	//Finally, turn escaped characters (e.g. &,>) back into their original form
	str = htmlDecode(str);

	// If the result is empty, return null, otherwise the empty string.
	return str === "" ? null : str;
}

/**
 * Tries to extract pronouns from the given text. Only "known" pronouns are returned, which is
 * a compromise for the pattern matching. At no point we want to limit the pronouns used by persons.
 * @param {string} text The text to search for pronouns.
 * @returns {string|null} The result or null.
 */
function searchForKnownPronouns(text) {
	if (!text) return null;

	// This is a rather complex regular expression to search for pronouns. Therefore, here's the explanation
	// in plain English: We search for all words that are followed by a slash (/) or comma (,),
	// which are followed by at least one another word that matches this pattern.
	//
	// Why not just two of them? Well, for combinations of multiple subjective pronouns, like "sie/she/elle",
	// we wanna display the whole set of pronouns if possible.
	const exactMatches = text.matchAll(/(\w+)( ?[/,] ?(\w+)){1,}/gi);
	for (const [match] of exactMatches) {
		// Once we have our match, split it by the known separators and check sequentially
		// whether we know one of the pronouns. If that's the case, return everything in the match
		// that's followed by this pronoun.
		//
		// Unfortunately, in the above case ("sie/she/elle"), it would return just "she/elle", because
		// we don't know about common localized pronouns yet. And we can't return the whole set,
		// because pronoun URLs like pronoun.page/they/them would return something like "page/they/them",
		// which obviously is wrong.
		const parts = match.split(/[/,]/).map((x) => x.trim());
		const known = [];
		for (const p of parts) {
			if (allKnownPronouns.includes(p.toLowerCase())) {
				known.push(p);
			}
		}

		if (known.length) {
			return known.join("/");
		}
	}

	const followedByColon = text.matchAll(/pronouns?:\W+([\w/+]+)/gi);
	for (const match of followedByColon) {
		return match.pop() ?? null; // first group is last entry in array
	}
	const anyAllPronouns = text.match(/(any|all) +pronouns/gi);
	if (anyAllPronouns) {
		return anyAllPronouns[0];
	}
	const noPronouns = text.match(/(no|none) +pronouns/);
	if (noPronouns) {
		return noPronouns[0];
	}

	return null;
}
