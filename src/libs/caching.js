import { debug, info, error } from "./logging.js";
import { runtime, storage } from "webextension-polyfill";

const currentVersion = runtime.getManifest().version;
const cacheMaxAge = 24 * 60 * 60 * 1000; // time after which cached pronouns should be checked again: 24h

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

/**
 *
 * @param {string} accountName
 * @returns {Promise<string>} Account's cached pronouns, or null if not saved or stale
 */
export async function getPronouns(accountName) {
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
	} else {
		info(`${accountName} not in cache, fetching status`);
	}

	return null;
}
