import { storage } from "webextension-polyfill";
import { error } from "../libs/logging";

function saveOptions(e) {
	e.preventDefault();
	storage.sync.set({
		logging: document.querySelector("#logging").checked,
	});
}

function restoreOptions() {
	function setCurrentChoice(result) {
		document.querySelector("#logging").checked = result.logging || false;
	}

	function onError(err) {
		error(`Error: ${err}`);
	}

	const getting = storage.sync.get("logging");
	getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("#resetbutton").addEventListener("click", async () => {
	await storage.local.clear();
});
