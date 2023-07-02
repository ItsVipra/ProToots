import { insertAfter } from "./domhelpers";
import { fetchRelationship, fetchStatus, getActiveAccessToken } from "./fetchPronouns";
import { normaliseAccountName } from "./protootshelpers";

let layer;
let hovering = null;
let hovercard_exists = false;

export function addHoverCardLayer() {
	layer = document.createElement("div");
	layer.id = "hovercardlayer";
	layer.style.position = "absolute";
	layer.style.top = "0";
	layer.style.left = "0";

	document.body.appendChild(layer);
}

export function addHoverCardListener(el) {
	console.log("adding hovercard listener to", el);
	if (el.nodeName != "DIV") return;
	let nametag = el.querySelector(".display-name");
	const id = el.dataset.id;
	nametag.addEventListener("mouseenter", (mouseEvent) => {
		hovering = nametag;
		console.log(hovering);
		const enterpos = { x: mousePos.x, y: mousePos.y };
		setTimeout(() => {
			// if (hovering && hovering != nametag) return;
			if (Math.hypot(mousePos.x - enterpos.x, mousePos.y - enterpos.y) > 50) return;
			generateHoverCard(nametag, id, mouseEvent);
		}, 200);
	});
	nametag.addEventListener("mouseleave", () => {
		hovering = null;
		console.log(hovering);
		setTimeout(() => {
			hovercard_exists = false;
			if (hovering === nametag) return;
			removeHoverCard(layer.querySelector(".protoots-hovercard"));
		}, 200);
	});
}

/**
 *
 * @param {*} el
 * @param {*} id
 * @param {MouseEvent} mouseEvent
 */
async function generateHoverCard(el, id, mouseEvent) {
	if (hovercard_exists) return;
	hovercard_exists = true;
	document.querySelectorAll("#protoots-hovercard").forEach((element) => element.remove());
	el.setAttribute("title", "");
	let hovercard = document.createElement("div");
	const testdiv = document.createElement("div");
	testdiv.classList.add("account__header");
	hovercard.appendChild(testdiv);
	const status = await fetchStatus(id);
	const account = status.account;
	if (!account) return;

	const relationship = await fetchRelationship(account.id);

	const header_image = await generateHeaderimage(account, relationship);
	testdiv.appendChild(header_image);

	const header_bar = createElementWithClass("div", "account__header__bar");
	testdiv.appendChild(header_bar);

	const header_tabs = generateHeaderTabs(account, relationship);
	header_bar.appendChild(header_tabs);

	const header_tabs_name = generateHeaderTabsName(account);
	header_bar.appendChild(header_tabs_name);

	const header_extra = generateHeaderExtra(account, relationship);
	header_bar.appendChild(header_extra);

	hovercard.classList.add("protoots-hovercard");
	hovercard.id = "protoots-hovercard";
	hovercard.style.left = mousePos.x.toString() + "px";
	hovercard.style.top = mousePos.y.toString() + "px";
	layer.appendChild(hovercard);

	hovercard.addEventListener("mouseenter", () => (hovering = el));
	hovercard.addEventListener("mouseleave", () => {
		hovering = false;
		hovercard_exists = false;
		setTimeout(() => {
			if (hovering) return;
			removeHoverCard(hovercard);
			// hovercard.remove();
		}, 200);
	});
}

function removeHoverCard(card) {
	card.classList.add("hidden");
	card.addEventListener("transitioned", () => card.remove());
	setTimeout(() => {
		card.remove();
	}, 200);
}

async function generateHeaderimage(account, relationship) {
	const header_image_div = createElementWithClass("div", "account__header__image");

	const header_info = createElementWithClass("div", "account__header__info");

	if (relationship[0].followed_by) {
		const relationship_tag = createElementWithClass("span", "relationship-tag");
		const spanforsomereason = document.createElement("span");
		spanforsomereason.textContent = "FOLLOWS YOU";
		relationship_tag.appendChild(spanforsomereason);
		header_info.appendChild(relationship_tag);
	}
	header_image_div.appendChild(header_info);

	const header_image = createElementWithClass("img", "parallax");
	header_image.src = account.header;

	header_image_div.appendChild(header_image);
	return header_image_div;
}

function generateHeaderTabs(account, relationship) {
	function setFollow(button) {
		button.textContent = "Follow";
		button.classList.remove("button--destructive");
		button.addEventListener("click", async () => {
			const response = await followAccount(account.id);
			if (response.ok) setUnfollow(button);
			else button.textContent = "aww cute doggy";
		});
	}

	function setUnfollow(button) {
		button.textContent = "Unfollow";
		button.classList.add("button--destructive");
		button.addEventListener("click", async () => {
			await unfollowAccount(account.id);
			setFollow(button);
		});
	}

	const header_tabs = createElementWithClass("div", "account__header__tabs");
	const avatar = createElementWithClass("a", "avatar");
	const account_avatar = createElementWithClass("div", "account__avatar");
	const account_avatar_img = document.createElement("img");
	account_avatar_img.src = account.avatar;
	account_avatar.appendChild(account_avatar_img);
	avatar.appendChild(account_avatar);
	header_tabs.appendChild(avatar);

	const header_tabs_buttons = createElementWithClass("div", "account__header__tabs__buttons");
	const follow_button = createElementWithClass("button", "button", "logo-button");
	follow_button.type = "button";
	if (!relationship[0].following) {
		setFollow(follow_button);
	} else {
		setUnfollow(follow_button);
	}
	header_tabs_buttons.appendChild(follow_button);
	header_tabs.appendChild(header_tabs_buttons);

	return header_tabs;
}

function generateHeaderTabsName(account) {
	const header_tabs_name = createElementWithClass("div", "account__header__tabs__name");
	const h1 = document.createElement("h1");
	const a = document.createElement("a");
	const span = document.createElement("span");
	span.innerHTML = replaceEmoji(account.display_name, account);
	a.appendChild(span);
	h1.appendChild(a);
	header_tabs_name.appendChild(h1);

	const small = document.createElement("small");
	small.textContent = "@" + normaliseAccountName(account.acct) + " ";

	if (account.locked) {
		const lock = createElementWithClass("i", "fa", "fa-lock");
		small.appendChild(lock);
	}

	h1.appendChild(small);
	return header_tabs_name;
}

function generateHeaderExtra(account, relationship) {
	//TODO: private note (in relationships api)
	const header_extra = createElementWithClass("div", "account__header__extra");
	const header_bio = createElementWithClass("div", "account__header__bio");

	//private note
	// const header_account_note = createElementWithClass("div", "account__header__account-note");
	// const note_label = document.createElement("label");
	// note_label.for = "hovercard-note";

	// const label_span = document.createElement("span");
	// label_span.textContent = "NOTE";

	// const note_textfield = createElementWithClass(
	// 	"textarea",
	// 	"account__header__account-note__content",
	// );
	// note_textfield.placeholder = "Click to add note";
	// console.log(relationship[0].note);
	// if (relationship[0].note != "") {
	// 	note_textfield.textContent = relationship[0].note;
	// }
	// note_textfield.addEventListener("blur", () => {
	// 	setPrivateNote(account.id, note_textfield);
	// });

	// note_label.appendChild(label_span);
	// note_label.appendChild(note_textfield);
	// header_account_note.appendChild(note_label);
	// header_bio.appendChild(header_account_note);

	//bio
	const header_account_content = createElementWithClass(
		"div",
		"account__header__content",
		"translate",
	);
	header_account_content.innerHTML = replaceEmoji(account.note, account);

	header_bio.appendChild(header_account_content);
	header_extra.appendChild(header_bio);

	//fields
	const header_fields = createElementWithClass("div", "account__header__fields");

	const dl = document.createElement("dl");
	const dt = document.createElement("dt");
	dt.textContent = "created on";
	const dd = document.createElement("dd");
	const creation_time = new Date(account.created_at);
	dd.innerHTML = creation_time.toLocaleDateString(window.navigator.language, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

	dl.appendChild(dt);
	dl.appendChild(dd);
	header_fields.appendChild(dl);

	for (const field of account.fields) {
		const dl_custom = document.createElement("dl");
		const dt_custom = document.createElement("dt");
		dt_custom.textContent = field.name;

		const dd_custom = document.createElement("dd");
		dd_custom.innerHTML = replaceEmoji(field.value, account);

		dl_custom.appendChild(dt_custom);
		dl_custom.appendChild(dd_custom);
		header_fields.appendChild(dl_custom);
	}

	header_extra.appendChild(header_fields);

	return header_extra;
}

function createElementWithClass(tagname, ...classnames) {
	const el = document.createElement(tagname);
	for (const classname of classnames) {
		el.classList.add(classname);
	}

	return el;
}

async function followAccount(accountID) {
	const accessToken = await getActiveAccessToken();

	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/accounts/${accountID}/follow`,
		{
			method: "POST",
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	return response;
}

async function unfollowAccount(accountID) {
	const accessToken = await getActiveAccessToken();

	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/accounts/${accountID}/unfollow`,
		{
			method: "POST",
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	return response;
}

async function setPrivateNote(accountID, element) {
	const accessToken = await getActiveAccessToken();

	console.log(element.value);
	const response = await fetch(
		`${location.protocol}//${location.host}/api/v1/accounts/${accountID}/note`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"content-type": "application/x-www-form-urlencoded",
			},
			body: `comment=${element.value}`,
		},
	);

	console.log(response);
	return response;
}

function replaceEmoji(string, account) {
	let html = string;
	const regexp = /:(\w*):/giu;
	let matches = [...html.matchAll(regexp)];

	for (const match of matches) {
		for (const emoji of account.emojis) {
			if (match[1] == emoji.shortcode) {
				html = html.replace(match[0], generateEmoji(emoji.shortcode, emoji.url));
			}
		}
	}

	return html;
}

function generateEmoji(shortcode, url) {
	const emoji = createElementWithClass("img", "emojione", "custom-emoji");
	emoji.src = url;

	return emoji.outerHTML;
}

let mousePos = { x: undefined, y: undefined };

window.addEventListener("mousemove", (event) => {
	mousePos = { x: event.pageX, y: event.pageY };
});
