// @ts-nocheck
import { storage } from "webextension-polyfill";
import { error } from "../libs/logging";

function saveOptions(e) {
	e.preventDefault();
	storage.sync.set({
		proplate: {
			enabled: document.querySelector("#proplates-enabled").checked,
			statusVisibility: document.querySelector("#plate-status").checked,
			notificationVisibility: document.querySelector("#plate-notification").checked,
			accountVisibility: document.querySelector("#plate-account").checked,
			conversationVisibility: document.querySelector("#plate-conversation").checked,
		},
		hoverCard: {
			enabled: document.querySelector("#hovercards-enabled").checked,
			stats: document.querySelector("#card-stats").checked,
			privateNote: document.querySelector("#card-note").checked,
			creationDate: document.querySelector("#card-creationDate").checked,
			fields: document.querySelector("#card-fields").checked,
			scrollableBio: document.querySelector("#card-scroll-bio").checked,
		},
		logging: document.querySelector("#logging").checked,
	});
}

function restoreOptions() {
	async function setCurrentChoice(result) {
		if (!result.proplate || !result.hoverCard) {
			await defaultOptions();
		} else {
			document.querySelector("#proplates-enabled").checked = result.proplate.enabled || false;
			document.querySelector("#logging").checked = result.logging || false;
			document.querySelector("#plate-status").checked = result.proplate.statusVisibility || false;
			document.querySelector("#plate-notification").checked =
				result.proplate.notificationVisibility || false;
			document.querySelector("#plate-account").checked = result.proplate.accountVisibility || false;
			document.querySelector("#plate-conversation").checked =
				result.proplate.conversationVisibility || false;

			document.querySelector("#hovercards-enabled").checked = result.hoverCard.enabled || false;
			document.querySelector("#card-stats").checked = result.hoverCard.stats || false;
			document.querySelector("#card-note").checked = result.hoverCard.privateNote || false;
			document.querySelector("#card-creationDate").checked = result.hoverCard.creationDate || false;
			document.querySelector("#card-fields").checked = result.hoverCard.fields || false;
			document.querySelector("#card-scroll-bio").checked = result.hoverCard.scrollableBio || false;

			setDisabled();
		}
	}

	function onError(err) {
		error(`Error: ${err}`);
	}

	const getting = storage.sync.get();
	getting.then(setCurrentChoice, onError);
}

async function defaultOptions() {
	await storage.sync.set({
		proplate: {
			enabled: true,
			statusVisibility: true,
			notificationVisibility: true,
			accountVisibility: true,
			conversationVisibility: false,
		},
		hoverCard: {
			enabled: true,
			stats: false,
			privateNote: false,
			creationDate: true,
			fields: true,
			scrollableBio: true,
		},
		logging: false,
	});
	restoreOptions();
}

function setDisabled() {
	const hovercardToggle = document.querySelector("#hovercards-enabled");
	const proplatesToggle = document.querySelector("#proplates-enabled");

	const hovercardRow2 = document.querySelector("#hovercards-row");
	const proplatesRow2 = document.querySelector("#proplates-row");

	const hovercardCheckboxes = hovercardRow2.querySelectorAll("input");
	const proplatesCheckboxes = proplatesRow2.querySelectorAll("input");

	hovercardCheckboxes.forEach((checkbox) => {
		checkbox.disabled = !hovercardToggle.checked;
	});
	proplatesCheckboxes.forEach((checkbox) => {
		checkbox.disabled = !proplatesToggle.checked;
	});

	hovercardRow2.classList.toggle("disabled", !hovercardToggle.checked);
	proplatesRow2.classList.toggle("disabled", !proplatesToggle.checked);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("form").addEventListener("change", () => {
	setDisabled();
});
document.querySelector("#resetbutton").addEventListener("click", async () => {
	await storage.local.clear();
});
document.querySelector("#defaultSettings").addEventListener("click", async () => {
	await defaultOptions();
});
