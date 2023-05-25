// @ts-check
//const proplate = document.createElement("bdi");
//proplate.textContent = "pro/nouns";
//document.body.display-name__html.append();

// const max_age = 8.64e7
const max_age = 24 * 60 * 60 * 1000; //time after which cached pronouns should be checked again: 24h
const host_name = location.host;

//before anything else, check whether we're on a Mastodon page
checkSite();
let logging;

function error() {
	if (logging) console.error(arguments);
}

function warn() {
	if (logging) console.warn(arguments);
}

function log() {
	if (logging) console.log(arguments);
}

function info() {
	if (logging) console.info(arguments);
}

function debug() {
	if (logging) console.debug(arguments);
}

// log("hey vippy, du bist cute <3")

/**
 * Checks whether site responds to Mastodon API Calls.
 * If so creates an 'readystatechange' EventListener, with callback to main()
 */
async function checkSite() {
	await browser.storage.sync.get("logging").then(
		(res) => {
			logging = res["logging"];
		},
		() => {
			logging = true;
		},
	);
	let requestDest = location.protocol + "//" + host_name + "/api/v1/instance";
	let response = await fetch(requestDest);

	if (response) {
		// debug('checksite response got', {'response' : response.json()})

		document.addEventListener("readystatechange", main);
	} else {
		warn("Not a Mastodon instance");
	}
}

/**
 * Evaluates the result of document.querySelector("#mastodon") and only creates a MutationObserver if the site is Mastodon.
 * Warns that site is not Mastodon otherwise.
 * - This prevents any additional code from being run.
 *
 */
function main() {
	// debug('selection for id mastodon', {'result': document.querySelector("#mastodon")})
	if (document.querySelector("#mastodon")) {
		log("Mastodon instance, activating Protoots");

		let lastUrl = location.href;
		new MutationObserver((mutations) => {
			const url = location.href;
			if (url !== lastUrl) {
				lastUrl = url;
				onUrlChange();
			}

			for (const m of mutations) {
				m.addedNodes.forEach((n) => {
					if (!(n instanceof HTMLElement)) return;

					if (n.className == "column") {
						debug("found a column: ", n);
						createObserver(n);
						//TODO: yet another bad hack, pls fix
						//TODO: doesn't work when going from detailed-status to detailed-status
						document.querySelectorAll(".detailed-status").forEach((el) => addProplate(el));
					}
				});
			}
		}).observe(document, { subtree: true, childList: true });
	} else {
		warn("Not a Mastodon instance");
	}
}

/**
 * Fetches pronouns associated with account name.
 * If cache misses status is fetched from the instance.
 *
 * @param {string | undefined} statusID ID of the status being requested, in case cache misses.
 * @param {string} account_name The account name, used for caching. Should have the "@" prefix.
 */
async function fetchPronouns(statusID, account_name) {
	// log(`searching for ${account_name}`);

	let cacheResult = await browser.storage.local.get().then(getSuccess, onError);

	if (account_name[0] == "@") account_name = account_name.substring(1);
	// if the username doesn't contain an @ (i.e. the post we're looking at is from this instance)
	// append the host name to it, to avoid cache overlap between instances
	if (!account_name.includes("@")) {
		account_name = account_name + "@" + host_name;
	}

	// debug(cacheResult);

	if (Object.keys(cacheResult).length == 0) {
		let pronounsCache = {};
		await browser.storage.local.set({ pronounsCache }).then(setSuccess, onError);
		warn("created pronounsCache in storage");
	}

	let cacheKeys = Object.keys(cacheResult["pronounsCache"]);

	if (cacheKeys.includes(account_name)) {
		let entryValue = cacheResult["pronounsCache"][account_name].value;
		let entryTimestamp = cacheResult["pronounsCache"][account_name].timestamp;
		if (Date.now() - entryTimestamp < max_age) {
			info(`${account_name} in cache:`, {
				"cache entry": cacheResult["pronounsCache"][account_name],
			});
			return entryValue;
		} else {
			info(`${account_name} entry is stale, refreshing`);
		}
	}

	if (!statusID) {
		console.warn(
			`Could not fetch pronouns for user ${account_name}, because no status ID was passed. This is an issue we're working on.`,
		);
		return;
	}

	info(`${account_name} not in cache, fetching status`);
	let status = await fetchStatus(statusID);

	let PronounField = getPronounField(status, account_name);
	if (PronounField == "null") {
		//TODO: if no field check bio
		info(`no pronouns found for ${account_name}, cached null`);
	}
	return PronounField;
}

/**
 * Fetches status by statusID from host_name with user's access token.
 *
 * @param {string} statusID ID of status being requested.
 * @returns {Promise<object>} Contents of the status in json form.
 */
async function fetchStatus(statusID) {
	const accessToken = await getActiveAccessToken();
	//fetch status from home server with access token
	const response = await fetch(`https://${host_name}/api/v1/statuses/${statusID}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	let status = await response.json();
	return status;
}

/**
 * Searches for fields labelled "pronouns" in the statuses' author.
 * If found returns the value of said field.
 *
 * @param {string} status
 * @param {string} account_name
 * @returns {string} Author pronouns if found. Otherwise returns "null"
 */
function getPronounField(status, account_name) {
	debug(status);
	// get account from status and pull out fields
	let account = status["account"];
	let fields = account["fields"];

	for (let field of fields) {
		//match fields against "pronouns"
		//TODO: multiple languages
		if (field["name"].toLowerCase().includes("pronouns")) {
			debug(`${account["acct"]}: ${field["value"]}`);

			if (!field["value"].includes("a href")) {
				//filter links
				let pronounSet = generatePronounSet(account_name, field["value"]);
				cachePronouns(account_name, pronounSet);
				return field["value"];
			}
		}
	}

	//if not returned by this point no field with pronouns was found
	let pronounSet = generatePronounSet(account_name, "null");

	cachePronouns(account_name, pronounSet);
	return "null";
}

/**
 * Generates object with pronoun related data to be saved to storage.
 *
 * @param {string} account Full account name as generated in fetchPronouns()
 * @param {string} value Contents of the found field's value
 * @returns {object} Object containing account name, timestamp and pronouns
 */
function generatePronounSet(account, value) {
	return { acct: account, timestamp: Date.now(), value: value }; //TODO: this should be just account right
}

/**
 * Appends an entry to the "pronounsCache" object in local storage.
 *
 * @param {string} account The account ID
 * @param {{ acct: any; timestamp: number; value: any; }} set The data to cache.
 */
async function cachePronouns(account, set) {
	let result = await browser.storage.local.get("pronounsCache").then(getSuccess, onError);
	let pronounsCache = result["pronounsCache"];
	pronounsCache[account] = set;
	await browser.storage.local.set({ pronounsCache }).then(setSuccess, onError);
	debug(`caching ${account}`);
	// return
}

function getSuccess(result) {
	return result;
}

function setSuccess() {}

function onError(error) {
	error("Failed save to storage!");
}

/**
 * Adds the pro-plate to the element. The caller needs to ensure that the passed element
 * is defined and that it's either a:
 * 	- <article> with the "status" class or
 * 	- <article> with the "detailed-status" class.
 *
 * Although it's possible to pass raw {@type Element}s, the method only does things on elements of type {@type HTMLElement}.
 *
 * @param {Element | HTMLElement} element The status where the element should be added.
 */
async function addProplate(element) {
	if (!(element instanceof HTMLElement)) return;

	//check whether element has already had a proplate added
	if (element.hasAttribute("protoots-checked")) return;

	//if not add the attribute
	element.setAttribute("protoots-checked", "true");
	let statusId = element.dataset.id;
	if (!statusId) {
		// We don't have a status ID, pronouns might not be in cache
		warn(
			"The element passed to addProplate does not have a data-id attribute, although it should have one.",
			element,
		);
	}

	let accountNameEl = element.querySelector(".display-name__account");
	if (!accountNameEl) {
		warn(
			"The element passed to addProplate does not have a .display-name__account, although it should have one.",
			element,
		);
		return;
	}
	let accountName = accountNameEl.textContent;
	if (!accountName) {
		warn("Could not extract the account name from the element.");
		return;
	}

	//get the name element and apply CSS
	let nametagEl = /** @type {HTMLElement|null} */ (element.querySelector(".display-name__html"));
	if (!nametagEl) {
		warn(
			"The element passed to addProplate does not have a .display-name__html, although it should have one.",
			element,
		);
		return;
	}

	nametagEl.style.display = "flex";
	nametagEl.style.alignItems = "baseline";

	//create plate
	const proplate = document.createElement("span");
	let pronouns = await fetchPronouns(statusId, accountName);
	if (pronouns == "null" && !logging) {
		return;
	}
	proplate.textContent = pronouns;
	proplate.classList.add("protoots-proplate");
	if (
		(host_name == "queer.group" && (accountName == "@vivien" || accountName == "@jasmin")) ||
		accountName == "@jasmin@queer.group" ||
		accountName == "@vivien@queer.group"
	) {
		//i think you can figure out what this does on your own
		proplate.classList.add("pog");
	}

	//add plate to nametag
	nametagEl.appendChild(proplate);
}

function createObserver(element) {
	// select column as observation target
	// const targetNode = document.querySelector(".column");
	const targetNode = element;

	// observe childlist and subtree events
	// docs: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
	const config = { childList: true, subtree: true, attributes: true };

	// define callback inline
	const callback = (
		/** @type {MutationRecord[]} */ mutationList,
		/** @type {MutationObserver} */ observer,
	) => {
		for (const mutation of mutationList) {
			mutation.addedNodes.forEach((n) => {
				if (!(n instanceof HTMLElement)) return;

				//case for all the other normal statuses
				if (
					containsClass(n.classList, "status") &&
					!containsClass(n.classList, "status__prepend")
				) {
					//|| containsClass(n.classList, "detailed-status"))) {
					addProplate(n);
				} else {
					//for nodes that have a broken classlist
					let statusElement = n.querySelector(".status");
					if (statusElement) {
						addProplate(statusElement);
					}
					//potential solution for dirty hack?
					// debug(".status not found looking for .detailed-status", {"element:": n})
					// statusElement = n.querySelector(".detailed-status")
					// if (statusElement != null) {
					//     addProplate(statusElement);
					// }
				}
			});
		}
		//TODO: bad hack, please remove
		document.querySelectorAll(".status").forEach((el) => addProplate(el));
		document.querySelectorAll(".detailed-status").forEach((el) => addProplate(el));
	};

	// Create an observer instance linked to the callback function
	const observer = new MutationObserver(callback);

	// Start observing the target node for configured mutations
	observer.observe(targetNode, config);
}

/**
 * Called by MutationObserver when the url changes.
 * Creates a new MutationObserver for each column on the page.
 */
function onUrlChange() {
	//select all columns for advanced interface
	document.querySelectorAll(".column").forEach((el) => {
		createObserver(el);
	});
	// createObserver();
}

/**
 * @param {DOMTokenList} classList The class list.
 * @param {string} cl The class to check for.
 * @returns Whether the classList contains the class.
 */
function containsClass(classList, cl) {
	if (!classList || !cl) return false;

	for (const c of classList) {
		if (c === cl) {
			return true;
		}
	}

	return false;
}

/**
 * Fetches the current access token for the user.
 * @returns {Promise<string>} The accessToken for the current user if we are logged in.
 */
async function getActiveAccessToken() {
	// Fortunately, Mastodon provides the initial state in a <script> element at the beginning of the page.
	// Besides a lot of other information, it contains the access token for the current user.
	const initialStateEl = document.getElementById("initial-state");
	if (!initialStateEl) {
		error("user not logged in yet");
		return "";
	}

	// Parse the JSON inside the script tag and extract the meta element from it.
	const { meta } = JSON.parse(initialStateEl.innerText);
	return meta.access_token;
}
