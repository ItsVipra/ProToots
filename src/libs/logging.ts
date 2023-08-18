/* eslint-disable no-console -- Logging should only be done with this module. */

import { isLogging } from "./settings";

/** @param {any[]} args */
export function error(...args: any[]) {
	if (isLogging()) console.error(...args);
}

/** @param {any[]} args */
export function warn(...args: any[]) {
	if (isLogging()) console.warn(...args);
}

/** @param {any[]} args */
export function log(...args: any[]) {
	if (isLogging()) console.log(...args);
}

/** @param {any[]} args */
export function info(...args: any[]) {
	if (isLogging()) console.info(...args);
}

/** @param {any[]} args */
export function debug(...args: any[]) {
	if (isLogging()) console.debug(...args);
}
