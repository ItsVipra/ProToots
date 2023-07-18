import sanitizeHtml from "sanitize-html";

const fieldMatchers = [/\bpro.*nouns?\b/i, /\bpronomen\b/i, /(i )?go(es)? by/i];
const knownPronounUrls = [
	/pronouns\.page\/(@(?<username>\w+))?:?(?<pronouns>[\w/:]+)?/,
	/pronouns\.within\.lgbt\/(?<pronouns>[\w/]+)/,
	/pronouns\.cc\/pronouns\/(?<pronouns>[\w/]+)/,
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
	let pronouns;

	if (fields) {
		for (const f of fields) {
			pronouns = await extractFromField(f);
			if (pronouns) break;
		}
	}

	if (!pronouns && note) {
		pronouns = extractFromBio(note);
	}

	pronouns = sanitizePronouns(pronouns);
	return pronouns;
}

/**
 * @param {{name: string, value: string}} field The field value
 * @returns {Promise<string|null>} The pronouns or null.
 */
async function extractFromField(field) {
	let pronounsRaw;
	for (const matcher of fieldMatchers) {
		if (field.name.match(matcher)) {
			pronounsRaw = field.value;
			break;
		}
	}

	if (!pronounsRaw) return null;
	let text = sanitizeHtml(pronounsRaw, { allowedTags: [], allowedAttributes: {} });
	// If one of pronoun URLs matches, overwrite the current known value.
	for (const knownUrlRe of knownPronounUrls) {
		if (!knownUrlRe.test(pronounsRaw)) continue;
		const { pronouns, username } = pronounsRaw.match(knownUrlRe).groups;

		// For now, only the pronouns.page regexp has a username value, so we can be sure
		// that we don't query the wrong API.
		if (username) {
			return await queryUserFromPronounsPage(username);
		}

		// In case that we have single-word pronoun.page values, like "https://en.pronouns.page/it",
		// we want to normalize that to include the possessive pronoun as well.
		if (pronounsRaw.includes("pronouns.page") && !pronouns.includes("/")) {
			return await normalizePronounPagePronouns(pronouns);
		}

		text = pronouns;
	}

	if (!text) return null;
	return text;
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
 * @returns {Promise<string>}
 */
async function normalizePronounPagePronouns(val) {
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
			morphemes: { pronoun_subject, possessive_pronoun },
		} = await pronounNameResp.json();

		return [pronoun_subject, possessive_pronoun].join("/");
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

	// Finally, remove leading and trailing whitespace.
	str = str.trim();

	// If the result is empty, return null, otherwise the empty string.
	return str === "" ? null : str;
}

const knownPronouns = [
	"ae",
	"aer",
	"aers",
	"aerself",
	"co",
	"co's",
	"cos",
	"coself",
	"e",
	"eir",
	"eirs",
	"em",
	"ems",
	"emself",
	"es",
	"ey",
	"fae",
	"faer",
	"faers",
	"faerself",
	"he",
	"her",
	"hers",
	"herself",
	"him",
	"himself",
	"hir",
	"hirs",
	"hirself",
	"his",
	"hu",
	"hum",
	"hus",
	"huself",
	"it",
	"its",
	"itself",
	"ne",
	"nem",
	"nemself",
	"nir",
	"nirs",
	"nirself",
	"one",
	"one's",
	"oneself",
	"per",
	"pers",
	"perself",
	"s/he",
	"she",
	"their",
	"theirs",
	"them",
	"themself",
	"themselves",
	"they",
	"thon",
	"thon's",
	"thons",
	"thonself",
	"ve",
	"ver",
	"vers",
	"verself",
	"vi",
	"vim",
	"vims",
	"vimself",
	"vir",
	"virs",
	"virself",
	"vis",
	"xe",
	"xem",
	"xemself",
	"xyr",
	"xyrs",
	"ze",
	"zhe",
	"zher",
	"zhers",
	"zherself",
	"zir",
	"zirs",
	"zirself",
];

/**
 * Tries to extract pronouns from the bio/note. Only "known" pronouns are returned, which is
 * a compromise for the pattern matching. At no point we want to limit the pronouns used by persons.
 * @param {string} bio The bio
 * @returns {string|null} The result or null
 */
function extractFromBio(bio) {
	const exactMatches = bio.matchAll(/(\w+) ?\/ ?(\w+)/gi);
	for (const [match, subjective, objective] of exactMatches) {
		if (
			knownPronouns.includes(subjective.toLowerCase()) &&
			knownPronouns.includes(objective.toLowerCase())
		) {
			return match.replaceAll(" ", "");
		}
	}

	const followedByColon = bio.matchAll(/pronouns?:\W+([\w/+]+)/gi);
	for (const match of followedByColon) {
		return match.pop(); // first group is last entry in array
	}
	const anyAllPronouns = bio.match(/(any|all) +pronouns/gi);
	if (anyAllPronouns) {
		return anyAllPronouns[0];
	}

	return null;
}
