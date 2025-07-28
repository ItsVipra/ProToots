import { storage } from "webextension-polyfill";
import { debug } from "./logging.js";

let settings;

export async function getSettings() {
	try {
		settings = await storage.sync.get();
		debug("Retrieved settings", settings);
	} catch {
		debug("Failed to retrieve settings from storage.");
		//  Enable the logging automatically if we cannot determine the user preference.
		settings = {};
	}
}

export function isLogging() {
	return settings.logging;
}

export function statusVisibility() {
	return settings.statusVisibility;
}

export function notificationVisibility() {
	return settings.notificationVisibility;
}

export function accountVisibility() {
	return settings.accountVisibility;
}

export function conversationVisibility() {
	return settings.conversationVisibility;
}
