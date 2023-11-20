import browser from "webextension-polyfill";
const { storage } = browser;

let settings;

export async function getSettings() {
	try {
		settings = await storage.sync.get();
	} catch {
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
