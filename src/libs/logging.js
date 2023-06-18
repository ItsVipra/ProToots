/* eslint-disable no-console -- Logging should only be done with this module. */

import { storage } from "webextension-polyfill";

export async function getLogging() {
	try {
		const { logging: optionValue } = await storage.sync.get("logging");
		logging = optionValue;
	} catch {
		//  Enable the logging automatically if we cannot determine the user preference.
		logging = true;
	}
}

export function isLogging() {
	return logging;
}

let logging;

/** @param {any[]} args */
export function error(...args) {
	if (logging) console.error(...args);
}

/** @param {any[]} args */
export function warn(...args) {
	if (logging) console.warn(...args);
}

/** @param {any[]} args */
export function log(...args) {
	if (logging) console.log(...args);
}

/** @param {any[]} args */
export function info(...args) {
	if (logging) console.info(...args);
}

/** @param {any[]} args */
export function debug(...args) {
	if (logging) console.debug(...args);
}
