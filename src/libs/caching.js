import { debug, error } from "./logging";
import Browser, { storage } from "webextension-polyfill";

const currentVersion = Browser.runtime.getManifest().version;
/**
 * Appends an entry to the "pronounsCache" object in local storage.
 *
 * @param {string} account The account ID
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

	cache.pronounsCache[account] = {
		acct: account,
		timestamp: Date.now(),
		value: pronouns,
		version: currentVersion,
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
