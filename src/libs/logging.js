/* eslint-disable no-console -- Logging should only be done with this module. */

import { isLogging } from "./settings.js";

/** @param {any[]} args */
export function error(...args) {
	if (isLogging()) console.error(...args);
}

/** @param {any[]} args */
export function warn(...args) {
	if (isLogging()) console.warn(...args);
}

/** @param {any[]} args */
export function log(...args) {
	if (isLogging()) console.log(...args);
}

/** @param {any[]} args */
export function info(...args) {
	if (isLogging()) console.info(...args);
}

/** @param {any[]} args */
export function debug(...args) {
	if (isLogging()) console.debug(...args);
}
