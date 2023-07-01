// @ts-nocheck
import { storage } from "webextension-polyfill";
import { error } from "../libs/logging";

function saveOptions(e) {
	e.preventDefault();
	storage.sync.set({
		logging: document.querySelector("#logging").checked,
		statusVisibility: document.querySelector("#status").checked,
		notificationVisibility: document.querySelector("#notification").checked,
		accountVisibility: document.querySelector("#account").checked,
		conversationVisibility: document.querySelector("#conversation").checked,
	});
}

function restoreOptions() {
	function setCurrentChoice(result) {
		console.log(result);
		document.querySelector("#logging").checked = result.logging || false;
		document.querySelector("#status").checked = result.statusVisibility || false;
		document.querySelector("#notification").checked = result.notificationVisibility || false;
		document.querySelector("#account").checked = result.accountVisibility || false;
		document.querySelector("#conversation").checked = result.conversationVisibility || false;
	}

	function onError(err) {
		error(`Error: ${err}`);
	}

	const getting = storage.sync.get();
	getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("#resetbutton").addEventListener("click", async () => {
	await storage.local.clear();
});
