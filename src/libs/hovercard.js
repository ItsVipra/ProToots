import { fetchProfile } from "./fetchPronouns";
import { addShowMoreButton, generateProfile } from "./hovercard/hovercard_generators";
import { normaliseAccountName } from "./protootshelpers";
import { hoverCardSettings } from "./settings";

const listenerTimeout = 200;

let layer;
let hovering = null;
let hovercardExists = false;

/**
 * Adds hovercard layer div to document body
 */
export function addHoverCardLayer() {
	if (document.querySelector("#hovercardlayer")) return;

	layer = document.createElement("div");
	layer.id = "hovercardlayer";
	layer.style.position = "absolute";
	layer.style.top = "0";
	layer.style.left = "0";

	document.body.appendChild(layer);
}

/**
 * Adds mouse enter and leave Eventlisteners to given element.
 * Eventlisteners wait 200ms before adding or removing a hoverCard
 * @param {HTMLElement} el Element to add Eventlisteners to
 * @returns
 */
export function addHoverCardListener(el) {
	// console.log("adding hovercard listener to", el);
	if (el.nodeName != "DIV") return;

	const nametag = /** @type {HTMLElement|null} */ (el.querySelector(".display-name"));
	const id = el.dataset.id;

	nametag.addEventListener("mouseenter", (mouseEvent) => {
		hovering = nametag;
		// console.log(hovering);
		const enterpos = { x: mousePos.x, y: mousePos.y };
		setTimeout(() => {
			// if (hovering && hovering != nametag) return;
			// if the cursor has moved more than 50 pixels since
			// entering the name, don't generate a card
			if (Math.hypot(mousePos.x - enterpos.x, mousePos.y - enterpos.y) > 50) return;
			addHoverCard(nametag, id, mouseEvent);
		}, listenerTimeout);
	});

	nametag.addEventListener("mouseleave", () => {
		hovering = null;
		// console.log(hovering);
		setTimeout(() => {
			hovercardExists = false;
			if (hovering === nametag) return;
			removeHoverCard(layer.querySelector(".protoots-hovercard"));
		}, listenerTimeout);
	});
}

/**
 *
 * @param {HTMLElement} el Element which will be hovered on
 * @param {*} statusID Status data-id
 * @param {MouseEvent} mouseEvent
 */
async function addHoverCard(el, statusID, mouseEvent) {
	if (hovercardExists) return;

	hovercardExists = true;

	//remove all other hovercards
	document.querySelectorAll("#protoots-hovercard").forEach((element) => element.remove());

	//remove title of target element, to avoid double popup
	el.setAttribute("title", "");

	const hovercard = document.createElement("div");

	const accountName = normaliseAccountName(el.querySelector(".display-name__account").textContent);

	//get account
	const { account, relationship } = await fetchProfile(statusID, accountName);
	// const status = await fetchStatus(statusID);
	// const account = status.account;
	if (!account) return;

	//and corresponding relationship
	// const relationship = await fetchRelationship(account.id);

	//

	const settings = hoverCardSettings();

	//generate the profile and add it to the card
	const [profileElement, bio] = generateProfile(account, relationship, settings);
	hovercard.appendChild(profileElement);

	hovercard.classList.add("protoots-hovercard");
	hovercard.id = "protoots-hovercard";

	//set position from mouse cursor
	hovercard.style.left = mousePos.x.toString() + "px";
	hovercard.style.top = mousePos.y.toString() + "px";

	layer.appendChild(hovercard);
	//inserted into DOM here - how the heck do i find out whether the bio is too long now
	//just hand the bio back up the chain?

	// console.log(bio.scrollHeight, bio.clientHeight);

	if (bio.scrollHeight > bio.clientHeight && !settings.scrollableBio) {
		// console.log("bio is scrollable");
		bio.style.overflow = "hidden";
		addShowMoreButton(bio);
	}

	const boundingrect = hovercard.getBoundingClientRect();

	const borderDistance = {
		x: boundingrect.right - window.innerWidth,
		y: boundingrect.bottom - window.innerHeight,
	};

	if (borderDistance.y > 0) {
		hovercard.style.top =
			(Number(hovercard.style.top.replace("px", "")) - borderDistance.y).toString() + "px";
	}
	if (borderDistance.x > 0) {
		hovercard.style.left =
			(Number(hovercard.style.left.replace("px", "")) - borderDistance.y).toString() + "px";
	}

	hovercard.addEventListener("mouseenter", () => (hovering = el));
	hovercard.addEventListener("mouseleave", () => {
		hovering = false;
		hovercardExists = false;
		setTimeout(() => {
			if (hovering) return;
			removeHoverCard(hovercard);
		}, listenerTimeout);
	});
	addEventListener(
		"scroll",
		() => {
			removeHoverCard(hovercard);
		},
		{ once: true },
	);
}

function removeHoverCard(card) {
	card.classList.add("hidden");
	card.addEventListener("transitioned", () => card.remove());
	setTimeout(() => {
		card.remove();
	}, listenerTimeout);
}

let mousePos = { x: undefined, y: undefined };

window.addEventListener("mousemove", (event) => {
	mousePos = { x: event.clientX, y: event.clientY };
});
