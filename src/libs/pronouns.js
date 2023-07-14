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
		if (typeof matcher === "string" && field.name.toLowerCase().includes(matcher)) {
			pronounsRaw = field.value;
			break;
		} else if (field.name.match(matcher)) {
			pronounsRaw = field.value;
			break;
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

	// Finally, remove leading and trailing whitespace.
	str= str.trim();

	// If the result is empty, return null, otherwise the empty string.
	return str==="" ? null : str;
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
		if (knownPronouns.includes(subjective) && knownPronouns.includes(objective)) {
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
