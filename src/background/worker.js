import { scripting, runtime, action, permissions, tabs } from "webextension-polyfill";

action.onClicked.addListener(async (tab) => {
	/**
	 * This listener is executed only if we don't have the permissions for the page.
	 * After we have our permissions, the content script ensures with the listener below
	 * that we open the popup with our button.
	 */
	const u = new URL(tab.url);
	const perms = { origins: [`${u.origin}/*`] };
	const hasPermissions = await permissions.contains(perms);
	if (!hasPermissions) {
		await permissions.request(perms);
		await tabs.reload(tab.id);
	}

	action.setPopup({ popup: "options/options.html" });
	action.setTitle({ title: "Configure ProToots" });

	await permissions.request(perms);
	await scripting.executeScript({
		files: ["content_scripts/protoots.js"],
		target: { tabId: tab.id },
	});
});

/**
 * This listener is triggered on each run of our content script and ensures
 * that the action has the proper text and our options popup.
 */
runtime.onMessage.addListener(async () => {
	const [tab] = await tabs.query({ active: true, lastFocusedWindow: true });
	await action.setPopup({ popup: "options/options.html", tabId: tab.id });
	await action.setTitle({ title: "Configure ProToots", tabId: tab.id });
});
