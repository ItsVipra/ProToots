/* eslint-disable */
const manifest = {
	manifest_version: 3,
	name: "ProToots",
	version: "1.2.1",

	icons: {
		48: "icons/icon small_size/icon small_size.png",
		96: "icons/icon small_size/icon small_size.png",
	},

	description: "puts pronouns next to usernames on mastodon",
	homepage_url: "https://github.com/ItsVipra/ProToots",
	permissions: ["storage", "activeTab"],
	host_permissions: ["https://en.pronouns.page/api/*"],

	action: {
		default_icon: "icons/icon small_size/icon small_size.png",
		default_title: "Enable ProToots on this page",
	},
	content_scripts: [
		{
			matches: ["*://*/*"],
			js: ["content_scripts/protoots.js"],
			css: ["styles/proplate.css"],
			run_at: "document_start",
		},
	],

	options_ui: {
		page: "options/options.html",
		browser_style: false,
	},

	browser_specific_settings: {
		gecko: {
			id: "protoots@trans.rights",
		},
	},
};

const firefoxManifest = {
	...manifest,
	background: {
		scripts: ["background/worker.js"],
	},
};

const chromeManifest = {
	...manifest,
	background: {
		service_worker: "background/worker.js",
		type: "module",
	},
};

export { firefoxManifest, chromeManifest };
