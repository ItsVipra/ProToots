import { debug, error, info, warn } from "./logging";
import { cachePronouns } from "./caching";
import { storage } from "webextension-polyfill";

const cacheMaxAge = 24 * 60 * 60 * 1000; // time after which cached pronouns should be checked again: 24h

/**
 * Fetches pronouns associated with account name.
 * If cache misses status is fetched from the instance.
 *
 * @param {string | undefined} statusID ID of the status being requested, in case cache misses.
 * @param {string} accountName The account name, used for caching. Should have the "@" prefix.
 */
export async function fetchPronouns(statusID, accountName) {
	// log(`searching for ${account_name}`);
	let cacheResult = {};
	try {
		cacheResult = await storage.local.get();
		if (!cacheResult.pronounsCache) {
			//if result doesn't have "pronounsCache" create it
			const pronounsCache = {};
			await storage.local.set({ pronounsCache });
			cacheResult = { pronounsCache: {} };
		}
	} catch {
		cacheResult = { pronounsCache: {} };
		// ignore errors, we have an empty object as fallback.
	}
	// Extract the current cache by using object destructuring.
	if (accountName in cacheResult.pronounsCache) {
		const { value, timestamp } = cacheResult.pronounsCache[accountName];

		// If we have a cached value and it's not outdated, use it.
		if (value && Date.now() - timestamp < cacheMaxAge) {
			info(`${accountName} in cache with value: ${value}`);
			return value;
		}
	}

	info(`${accountName} cache entry is stale, refreshing`);

	if (!statusID) {
		warn(
			`Could not fetch pronouns for user ${accountName}, because no status ID was passed. This is an issue we're working on.`,
		);
		return null;
	}

	info(`${accountName} not in cache, fetching status`);
	const status = await fetchStatus(statusID);

	const PronounField = getPronounField(status, accountName);
	if (PronounField == "null") {
		//TODO: if no field check bio
		info(`no pronouns found for ${accountName}, cached null`);
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
 * @param {string} accountName
 * @returns {string} Author pronouns if found. Otherwise returns "null"
 */
function getPronounField(status, accountName) {
	debug(status);
	// get account from status and pull out fields
	const account = status.account;
	const fields = account.fields;

	for (const field of fields) {
		//match fields against "pronouns"
		//TODO: multiple languages
		if (field.name.toLowerCase().includes("pronouns")) {
			debug(`${account.acct}: ${field.value}`);

			cachePronouns(accountName, field.value);
			return field.value;
		}
	}

	//if not returned by this point no field with pronouns was found

	cachePronouns(accountName, "null");
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
