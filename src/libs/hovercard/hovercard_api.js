import { getActiveAccessToken } from "../fetchPronouns";

/**
 * Follows the given account, returns API response
 * @param {String} accountID
 * @returns {Promise<Response>}
 */
export async function followAccount(accountID) {
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

/**
 * Unfollows the given account, returns API response
 * @param {String} accountID
 * @returns {Promise<Response>}
 */
export async function unfollowAccount(accountID) {
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

/**
 * Set's the private note for the given account, with the value of the given element
 * @param {String} accountID
 * @param {HTMLElement} element Note textfield element
 * @returns {Promise<Response>}
 */
export async function setPrivateNote(accountID, element) {
	const accessToken = await getActiveAccessToken();

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

	return response;
}
