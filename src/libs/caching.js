import { debug, error } from "./logging";
import { storage } from "webextension-polyfill";
/**
 * Appends an entry to the "pronounsCache" object in local storage.
 *
 * @param {string} account The account name
 * @param {string} pronouns The pronouns to cache.
 */
export async function cachePronouns(account, pronouns) {
	let cache = {};
	try {
		cache = await storage.local.get();
	} catch {
		// Ignore errors and use an empty object as fallback.
		cache = { pronounsCache: {} };
	}

	cache.pronounsCache[account] = { acct: account, timestamp: Date.now(), value: pronouns };
	try {
		await storage.local.set(cache);
		debug(`${account} cached`);
	} catch (e) {
		error(`${account} could not been cached: `, e);
	}
}

/**
 * Appends an entry to the "hovercardCache" object in local storage
 * @param {string} account Account name
 * @param {Object} profile Profile object, containing account and relationship
 */
export async function cacheProfile(account, profile) {
	let cache = {};
	try {
		cache = await storage.local.get();
	} catch {
		// Ignore errors and use an empty object as fallback.
		cache = { hovercardCache: {} };
	}

	cache.hovercardCache[account] = {
		acct: account,
		timestamp: Date.now(),
		profile: profile,
	};
	try {
		await storage.local.set(cache);
		debug(`${account} cached`);
	} catch (e) {
		error(`${account} could not been cached: `, e);
	}
}

export async function getPronouns() {
	const fallback = { pronounsCache: {} };
	let cacheResult;
	try {
		cacheResult = await storage.local.get();
		if (!cacheResult.pronounsCache) {
			//if result doesn't have "pronounsCache" create it
			await storage.local.set(fallback);
			cacheResult = fallback;
		}
	} catch {
		cacheResult = fallback;
		// ignore errors, we have an empty object as fallback.
	}
	return cacheResult;
}

/**
 *
 * @returns {Promise<object>} Profile object, containing account and relationship
 */
export async function getProfile() {
	const fallback = { hovercardCache: {} };
	let cacheResult;
	try {
		cacheResult = await storage.local.get();
		if (!cacheResult.hovercardCache) {
			//if result doesn't have "pronounsCache" create it
			await storage.local.set(fallback);
			cacheResult = fallback;
		}
	} catch {
		cacheResult = fallback;
		// ignore errors, we have an empty object as fallback.
	}
	return cacheResult;
}
