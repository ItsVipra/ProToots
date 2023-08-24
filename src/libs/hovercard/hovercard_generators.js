import { insertAfter } from "../domhelpers";
import { normaliseAccountName } from "../protootshelpers";
import { followAccount, setPrivateNote, unfollowAccount } from "./hovercard_api";
import { createElementWithClass, replaceEmoji } from "./hovercard_helpers";

/**
 * Calls all the other generators and puts everything into a profileDiv
 * @param {Object} account Account object from Mastodon API
 * @param {Array} relationship Relationship array to account from Mastodon API
 * @param {Object} options Settings object from ProToots
 * @returns {HTMLElement[]} Div containing the profile
 */
export function generateProfile(
	account,
	relationship,
	options = { stats: true, privateNote: false, creationDate: true, fields: true },
) {
	const profileDiv = createElementWithClass("div", "account__header");

	profileDiv.appendChild(generateHeaderimage(account, relationship));

	const headerBar = createElementWithClass("div", "account__header__bar");
	profileDiv.appendChild(headerBar);

	headerBar.appendChild(generateHeaderTabs(account, relationship));

	headerBar.appendChild(generateHeaderTabsName(account, options));

	const [headerExtra, bio] = generateHeaderExtra(account, relationship, options);
	headerBar.appendChild(headerExtra);

	return [profileDiv, bio];
}

/**
 * Generates header image, with relationship tag - "follows you"
 * @param {Object} account
 * @param {Array} relationship
 * @returns {HTMLElement}
 */
function generateHeaderimage(account, relationship) {
	const headerImageDiv = createElementWithClass("div", "account__header__image");

	if (relationship[0].followed_by) {
		headerImageDiv.appendChild(generateRelationshipTag());
	}

	const headerImage = createElementWithClass("img", "parallax");
	headerImage.src = account.header;

	headerImageDiv.appendChild(headerImage);
	return headerImageDiv;

	function generateRelationshipTag() {
		const headerInfo = createElementWithClass("div", "account__header__info");
		const relationshipTag = createElementWithClass("span", "relationship-tag");
		const spanforsomereason = document.createElement("span");
		spanforsomereason.textContent = "FOLLOWS YOU";
		relationshipTag.appendChild(spanforsomereason);
		headerInfo.appendChild(relationshipTag);
		return headerInfo;
	}
}

/**
 * Generates header tabs - profile pic and follow button
 * @param {Object} account
 * @param {Array} relationship
 * @returns
 */
function generateHeaderTabs(account, relationship) {
	const headerTabs = createElementWithClass("div", "account__header__tabs");

	headerTabs.appendChild(generateAvatar(account));

	headerTabs.appendChild(generateFollowButton());

	return headerTabs;

	/**
	 * Generates Follow button with style according to following status
	 * @returns {HTMLElement}
	 */
	function generateFollowButton() {
		const headerTabsButtons = createElementWithClass("div", "account__header__tabs__buttons");
		const followButton = createElementWithClass("button", "button", "logo-button");
		followButton.type = "button";
		if (!relationship[0].following) {
			setFollow(followButton);
		} else {
			setUnfollow(followButton);
		}
		headerTabsButtons.appendChild(followButton);
		return headerTabsButtons;
	}

	/**
	 * Generates Avatar HTMLElement
	 * @param {Object} account
	 * @returns {HTMLElement}
	 */
	function generateAvatar(account) {
		const avatar = createElementWithClass("a", "avatar");
		const accountAvatar = createElementWithClass("div", "account__avatar");
		const accountAvatarImg = document.createElement("img");
		accountAvatarImg.src = account.avatar;
		accountAvatar.appendChild(accountAvatarImg);
		avatar.appendChild(accountAvatar);
		return avatar;
	}

	/**
	 * Sets textContent, style and callback for follow
	 * @param {HTMLElement} button
	 */
	function setFollow(button) {
		button.textContent = "Follow";
		button.classList.remove("button--destructive");
		button.addEventListener(
			"click",
			async () => {
				const response = await followAccount(account.id);
				if (response.ok) setUnfollow(button);
				else button.textContent = "aww cute doggy";
			},
			{ once: true },
		);
	}

	/**
	 * Sets textContent, style and callback for unfollow
	 * @param {HTMLElement} button
	 */
	function setUnfollow(button) {
		button.textContent = "Unfollow";
		button.classList.add("button--destructive");
		button.addEventListener(
			"click",
			async () => {
				await unfollowAccount(account.id);
				setFollow(button);
			},
			{ once: true },
		);
	}
}

/**
 * Generates user- and account name with lock, if account is locked
 * @param {Object} account
 * @param {Object} options
 * @returns {HTMLElement}
 */
function generateHeaderTabsName(account, options) {
	const headerTabsName = createElementWithClass("div", "account__header__tabs__name");

	headerTabsName.appendChild(generateDisplayName());
	// headerTabsName.appendChild(generateUsername());

	if (options.stats) headerTabsName.appendChild(generateStats(account));

	return headerTabsName;

	function generateUsername() {
		const small = document.createElement("small");
		small.textContent = "@" + normaliseAccountName(account.acct) + " ";

		if (account.locked) {
			const lock = createElementWithClass("i", "fa", "fa-lock");
			small.appendChild(lock);
		}

		return small;
	}

	function generateDisplayName() {
		const h1 = document.createElement("h1");
		const a = document.createElement("a");
		const span = document.createElement("span");
		span.innerHTML = replaceEmoji(account.display_name, account);
		a.appendChild(span);
		h1.appendChild(a);
		h1.appendChild(generateUsername());
		return h1;
	}
}

/**
 * Generates Note, Bio and Fields
 * @param {Object} account
 * @param {Array} relationship
 * @param {Object} options
 * @returns
 */
function generateHeaderExtra(account, relationship, options) {
	const headerExtra = createElementWithClass("div", "account__header__extra");
	const headerBio = createElementWithClass("div", "account__header__bio");

	//private note
	if (options.privateNote) headerExtra.appendChild(headerBio.appendChild(generateNote()));

	//bio
	const bio = generateBio();
	headerExtra.appendChild(headerBio.appendChild(bio));

	//fields
	headerExtra.appendChild(generateFields());

	return [headerExtra, bio];

	function generateNote() {
		const headerAccountNote = createElementWithClass("div", "account__header__account-note");
		const noteLabel = document.createElement("label");
		noteLabel.for = "hovercard-note";

		const labelSpan = document.createElement("span");
		labelSpan.textContent = "NOTE";

		const noteTextfield = createElementWithClass(
			"textarea",
			"account__header__account-note__content",
		);
		noteTextfield.placeholder = "Click to add note";

		// console.log(relationship[0].note);
		if (relationship[0].note != "") {
			noteTextfield.textContent = relationship[0].note;
		}

		noteTextfield.addEventListener("blur", () => {
			setPrivateNote(account.id, noteTextfield);
			//TODO: save indicator
		});

		noteLabel.appendChild(labelSpan);
		noteLabel.appendChild(noteTextfield);
		headerAccountNote.appendChild(noteLabel);
		return headerAccountNote;
	}

	function generateFields() {
		const headerFields = createElementWithClass("div", "account__header__fields");

		if (options.creationDate) {
			const dl = document.createElement("dl");
			const dt = document.createElement("dt");
			dt.textContent = "created on";
			const dd = document.createElement("dd");
			const creationTime = new Date(account.created_at);
			dd.innerHTML = creationTime.toLocaleDateString(window.navigator.language, {
				day: "numeric",
				month: "short",
				year: "numeric",
			});

			dl.appendChild(dt);
			dl.appendChild(dd);
			headerFields.appendChild(dl);
		}

		if (options.fields) {
			for (const field of account.fields) {
				const dlCustom = document.createElement("dl");
				const dtCustom = document.createElement("dt");
				dtCustom.textContent = field.name;

				const ddCustom = document.createElement("dd");
				ddCustom.innerHTML = replaceEmoji(field.value, account);

				dlCustom.appendChild(dtCustom);
				dlCustom.appendChild(ddCustom);
				headerFields.appendChild(dlCustom);
			}
		}

		return headerFields;
	}

	function generateBio() {
		const headerAccountContent = createElementWithClass(
			"div",
			"account__header__content",
			"translate",
		);
		headerAccountContent.innerHTML = replaceEmoji(account.note, account);

		return headerAccountContent;
	}
}

/**
 *
 * @param {Object} account
 * @returns
 */
function generateStats(account) {
	const extraLinks = createElementWithClass("div", "account__header__extra__links");
	extraLinks.appendChild(generateStat(account, "following_count", " Following"));
	extraLinks.appendChild(generateStat(account, "followers_count", " Followers"));
	return extraLinks;

	function generateStat(account, statname, statString) {
		const statA = document.createElement("a");
		const outerSpan = document.createElement("span");
		const strong = document.createElement("strong");
		const innerSpan = document.createElement("span");
		innerSpan.textContent = Number(account[statname]).toLocaleString(window.navigator.language, {
			notation: "compact",
		});
		strong.appendChild(innerSpan);
		outerSpan.appendChild(strong);
		outerSpan.innerHTML += statString;
		statA.appendChild(outerSpan);
		return statA;
	}
}

export function addShowMoreButton(bio) {
	const showMoreDiv = createElementWithClass("div", "hovercard-showmore");
	const showMore = createElementWithClass(
		"button",
		"status__content__spoiler-link",
		"status__content__spoiler-link--show-more",
	);
	const span = document.createElement("span");
	span.textContent = "Show more";
	showMore.appendChild(span);
	showMore.addEventListener("click", () => setLess());

	showMoreDiv.appendChild(showMore);
	insertAfter(showMoreDiv, bio);
	const moredivBounds = showMoreDiv.getBoundingClientRect();
	showMoreDiv.style.marginTop = (-moredivBounds.height).toString() + "px";
	const accountHeader = document.querySelector(".icon-button");
	const backgroundColor = getComputedStyle(accountHeader).getPropertyValue("color");
	console.log(backgroundColor);
	showMoreDiv.style.setProperty("--background-color", backgroundColor);

	function setMore() {
		bio.style.maxHeight = "25vh";
		span.textContent = "Show more";
		showMoreDiv.style.marginTop = (-showMoreDiv.getBoundingClientRect().height).toString() + "px";
		showMoreDiv.style.backgroundImage =
			"radial-gradient(farthest-side at bottom center, var(--background-color) 0%, var(--background-color) 75%, transparent)";
		showMoreDiv.style.paddingTop = ".25em";
		showMoreDiv.style.paddingBottom = "0px";
		showMore.addEventListener("click", () => setLess(), { once: true });
	}
	function setLess() {
		bio.style.maxHeight = "unset";
		span.textContent = "Show less";
		showMoreDiv.style.marginTop = "0px";
		showMoreDiv.style.backgroundImage =
			"radial-gradient(farthest-side at top center, var(--background-color) 0%, var(--background-color) 75%, transparent)";
		showMoreDiv.style.paddingTop = "0px";
		showMoreDiv.style.paddingBottom = ".25em";
		showMore.addEventListener("click", () => setMore(), { once: true });
	}
}
