import { info } from "./logging";
import { cachePronouns } from "./caching";

/**
 * Fetches pronouns associated with account name.
 * If cache misses status is fetched from the instance.
 *
 * @param {string | undefined} statusID ID of the status being requested, in case cache misses.
 * @param {string} account_name The account name, used for caching. Should have the "@" prefix.
 */
export async function fetchPronouns(statusID, account_name) {
	// log(`searching for ${account_name}`);
	let cacheResult = { pronounsCache: {} };
	try {
		cacheResult = await storage.local.get();
		if (!cacheResult.pronounsCache) {
			//if result doesn't have "pronounsCache" create it
			let pronounsCache = {};
			await storage.local.set({ pronounsCache });
			cacheResult = { pronounsCache: {} };
		}
	} catch {
		cacheResult = { pronounsCache: {} };
		// ignore errors, we have an empty object as fallback.
	}
	// Extract the current cache by using object destructuring.
	if (account_name in cacheResult.pronounsCache) {
		let { value, timestamp } = cacheResult.pronounsCache[account_name];

		// If we have a cached value and it's not outdated, use it.
		if (value && Date.now() - timestamp < max_age) {
			info(`${account_name} in cache with value: ${value}`);
			return value;
		}
	}

	info(`${account_name} cache entry is stale, refreshing`);

	if (!statusID) {
		console.warn(
			`Could not fetch pronouns for user ${account_name}, because no status ID was passed. This is an issue we're working on.`,
		);
		return;
	}

	info(`${account_name} not in cache, fetching status`);
	let status = await fetchStatus(statusID);

	let PronounField = getPronounField(status, account_name);
	if (PronounField == "null") {
		//TODO: if no field check bio
		info(`no pronouns found for ${account_name}, cached null`);
	}
	return PronounField;
}

/**
 * Fetches status by statusID from host_name with user's access token.
 *
 * @param {string} statusID ID of status being requested.
 * @returns {Promise<object>} Contents of the status in json form.
 */
async function fetchStatus(statusID) {
	const accessToken = await getActiveAccessToken();
	//fetch status from home server with access token
	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/statuses/${statusID}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	let status = await response.json();

	//if status contains a reblog get that for further processing - we want the embedded post's author
	if (status.reblog) status = status.reblog;
	return status;
}

/**
 * Searches for fields labelled "pronouns" in the statuses' author.
 * If found returns the value of said field.
 *
 * @param {string} status
 * @param {string} account_name
 * @returns {string} Author pronouns if found. Otherwise returns "null"
 */
function getPronounField(status, account_name) {
	debug(status);
	// get account from status and pull out fields
	let account = status["account"];
	let fields = account["fields"];

	for (let field of fields) {
		//match fields against "pronouns"
		//TODO: multiple languages
		if (field["name"].toLowerCase().includes("pronouns")) {
			debug(`${account["acct"]}: ${field["value"]}`);

			cachePronouns(account_name, field["value"]);
			return field["value"];
		}
	}

	//if not returned by this point no field with pronouns was found

	cachePronouns(account_name, "null");
	return "null";
}

/**
 * Fetches the current access token for the user.
 * @returns {Promise<string>} The accessToken for the current user if we are logged in.
 */
async function getActiveAccessToken() {
	// Fortunately, Mastodon provides the initial state in a <script> element at the beginning of the page.
	// Besides a lot of other information, it contains the access token for the current user.
	const initialStateEl = document.getElementById("initial-state");
	if (!initialStateEl) {
		error("user not logged in yet");
		return "";
	}

	// Parse the JSON inside the script tag and extract the meta element from it.
	const { meta } = JSON.parse(initialStateEl.innerText);
	return meta.access_token;
}
