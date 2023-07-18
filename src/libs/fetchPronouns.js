import { debug, error, info, log, warn } from "./logging";
import { cachePronouns, getPronouns } from "./caching";
import { normaliseAccountName } from "./protootshelpers";
import { extractFromStatus } from "./pronouns";
import Browser from "webextension-polyfill";

const cacheMaxAge = 24 * 60 * 60 * 1000; // time after which cached pronouns should be checked again: 24h
let conversationsCache;
const currentVersion = Browser.runtime.getManifest().version;

/**
 * Fetches pronouns associated with account name.
 * If cache misses object is fetched from the instance.
 *
 * @param {string | undefined} dataID ID of the object being requested, in case cache misses.
 * @param {string} accountName The account name, used for caching. Should have the "@" prefix.
 * @param {string} type Type of data-id
 * @returns {string} The pronouns if we have any, otherwise "null".
 */
export async function fetchPronouns(dataID, accountName, type) {
	// log(`searching for ${account_name}`);
	const cacheResult = await getPronouns();
	debug(cacheResult);
	// Extract the current cache by using object destructuring.
	if (accountName in cacheResult.pronounsCache) {
		const { value, timestamp, version } = cacheResult.pronounsCache[accountName];

		// If we have a cached value and it's not outdated, use it.
		if (value && Date.now() - timestamp < cacheMaxAge && version == currentVersion) {
			info(`${accountName} in cache with value: ${value}`);
			return value;
		} else {
			info(`${accountName} cache entry is stale, refreshing`);
		}
	}

	info(`${accountName} cache entry is stale, refreshing`);

	if (!dataID) {
		warn(`Could not fetch pronouns for user ${accountName}, because no status ID was passed.`);
		return null;
	}

	info(`${accountName} not in cache, fetching status`);

	let status;
	if (type === "notification") {
		status = await fetchNotification(dataID);
	} else if (type === "account") {
		status = await fetchAccount(dataID);
	} else if (type === "conversation") {
		const conversations = await fetchConversations();
		for (const conversation of conversations) {
			for (const account of conversation.accounts) {
				//conversations can have multiple participants, check that we're passing along the right account
				if (normaliseAccountName(account.acct) == accountName) {
					//package the account object in an empty object for compatibility with getPronounField()
					status = { account: account };
				}
			}
		}
	} else {
		status = await fetchStatus(dataID);
	}

	if (!status) {
		log(`Fetching ${type} failed, trying notification instead.`);
		status = await fetchNotification(dataID);
	} //fallback for glitch-soc notifications

	let pronouns = await extractFromStatus(status);
	if (!pronouns) {
		pronouns = "null";
		info(`no pronouns found for ${accountName}, cached null`);
	}
	await cachePronouns(accountName, pronouns);
	return pronouns;
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

	if (!response.ok) return null;

	let status = await response.json();

	//if status contains a reblog get that for further processing - we want the embedded post's author
	if (status.reblog) status = status.reblog;
	return status;
}

/**
 * Fetches notification by notificationID from host_name with user's access token.
 *
 * @param {string} notificationID ID of notification being requested.
 * @returns {Promise<object>} Contents of notification in json form.
 */
async function fetchNotification(notificationID) {
	const accessToken = await getActiveAccessToken();

	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/notifications/${notificationID}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	const notification = await response.json();

	return notification;
}

/**
 * Fetches account by accountID from host_name with user's access token.
 *
 * @param {string} accountID ID of account being requested.
 * @returns {Promise<object>} Contents of account in json form.
 */
async function fetchAccount(accountID) {
	const accessToken = await getActiveAccessToken();

	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/accounts/${accountID}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	if (!response.ok) return null;

	const account = await response.json();

	return { account: account };
}

/**
 * Fetches the user's last <=40 direct message threads from host_name with user's access token.
 * @returns {Promise<Array>} Array containing direct message thread objects in json from.
 *
 * DOCS: https://docs.joinmastodon.org/methods/conversations/#response
 */
async function fetchConversations() {
	if (conversationsCache) return conversationsCache;
	//the api wants status IDs, not conversation IDs
	//as a result we can only get pronouns for the first 40 conversations max
	//most of these should be in cache anyways
	const accessToken = await getActiveAccessToken();

	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/conversations?limit=40`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	const conversations = await response.json();
	conversationsCache = conversations;

	return conversations;
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
