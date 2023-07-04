import { storage } from "webextension-polyfill";

let settings;

export async function getSettings() {
	try {
		settings = await storage.sync.get();
	} catch {
		//  Enable the logging automatically if we cannot determine the user preference.
		settings = {};
	}
	return settings;
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

export function hoverCardSettings() {
	return settings.hoverCard;
}

export function hoverCardEnabled() {
	return settings.hoverCard.enabled;
}

// export function hoverCardStats() {
// 	return settings.hoverCard.stats;
// }

// export function hoverCardPrivateNote() {
// 	return settings.hoverCard.privateNote;
// }

// export function hoverCardCreationDate() {
// 	return settings.hoverCard.creationDate;
// }

// export function hoverCardFields() {
// 	return settings.hoverCard.fields;
// }