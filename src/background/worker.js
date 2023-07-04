import { action, permissions, tabs } from "webextension-polyfill";

action.onClicked.addListener(async (tab) => {
	const u = new URL(tab.url);
	const perms = { origins: [`${u.origin}/*`] };
	const hasPermissions = await permissions.contains(perms);
	if (!hasPermissions) {
		await permissions.request(perms);
		await tabs.reload(tab.id);
	}

	action.setPopup({ popup: "options/options.html" });
	action.setTitle({ title: "Configure ProToots" });
});
