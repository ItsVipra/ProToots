import { debug, error } from "./logging";
import { storage } from "webextension-polyfill";
/**
 * Appends an entry to the "pronounsCache" object in local storage.
 *
 * @param {string} account The account ID
 * @param {{ acct: any; timestamp: number; value: any; }} set The data to cache.
 */
export async function cachePronouns(account, set) {
	let cache = {};
	try {
		cache = await storage.local.get();
	} catch {
		// Ignore errors and use an empty object as fallback.
		cache = { pronounsCache: {} };
	}

	cache.pronounsCache[account] = { acct: account, timestamp: Date.now(), value: set };
	try {
		await storage.local.set(cache);
		debug(`${account} cached`);
	} catch (e) {
		error(`${account} could not been cached: `, e);
	}
}
