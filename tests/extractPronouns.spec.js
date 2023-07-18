import { suite } from "uvu";
import * as assert from "uvu/assert";
import * as pronouns from "../src/libs/pronouns.js";

const extract = suite("field extraction");
const validFields = [
	"pronoun",
	"pronouns",
	"PRONOUNS",
	"professional nouns",
	"pronomen",
	"Pronouns / Pronomen",
	"Pronomen (DE)",
	"Pronouns (EN)",
	"i go by",
	"go by",
];
const invalidFields = ["pronounciation", "pronomenverwaltung"];

for (const field of validFields) {
	extract(`${field} is extracted`, async () => {
		const result = await pronouns.extractFromStatus({
			account: {
				fields: [{ name: field, value: "pro/nouns" }],
			},
		});
		assert.equal("pro/nouns", result);
	});
}

for (const field of invalidFields) {
	extract(`${field} is not extracted`, async () => {
		const result = await pronouns.extractFromStatus({
			account: {
				fields: [{ name: field, value: "pro/nouns" }],
			},
		});
		assert.equal(result, null);
	});
}

extract.run();

const valueExtractionSuite = suite("value extraction");
valueExtractionSuite.before(() => {
	global.window = {
		// @ts-ignore
		navigator: {
			languages: ["en"],
		},
	};
	global.document = {
		// @ts-ignore
		documentElement: {
			lang: "de",
		},
	};
});
valueExtractionSuite.after(() => {
	global.window = undefined;
	global.document = undefined;
});
const valueExtractionTests = [
	["she/her", "she/her"], // exact match
	["they and them", "they and them"], // exact match with multiple words
	["they/them (https://pronouns.page/they/them)", "they/them"], // plain-text "URL" with additional text
	["https://en.pronouns.page/they/them", "they/them"], // plain-text "URLs"
	["pronouns.page/they/them", "they/them"], // plain-text "URLs" without scheme
	[`<a href="https://en.pronouns.page/they/them"></a>`, "they/them"], // HTML-formatted URLs
	[`<a href="https://en.pronouns.page/@Vipra"></a>`, "she/her"], // pronoun pages with usernames
	[
		`<a href="https://en.pronouns.page/@definitely_not_existing_username_on_pronouns_page"></a>`,
		null,
	], // 404 errors
	[`<a href="https://de.pronouns.page/:Katze"></a>`, "Katze"], // custom pronouns
	[`<a href="https://de.pronouns.page/@benaryorg"></a>`, "Katze/Katze's"], // custom pronouns in profile
	[`:theythem:`, null], // emojis shortcodes used for pronouns
	[
		// This is an actual example from a Mastodon field, with example.com redirecting to pronouns.page.
		`dey/denen, es/ihm - <a href="https://example.com" rel="nofollow noopener noreferrer" target="_blank"><span class="invisible">https://</span><span class="">example.com</span><span class="invisible"></span></a>`,
		"dey/denen, es/ihm",
	],
	["https://en.pronouns.page/it", "it/its"], // single-word pronoun pages
];
for (const [input, expects] of valueExtractionTests) {
	valueExtractionSuite(input, async () => {
		const result = await pronouns.extractFromStatus({
			account: {
				fields: [{ name: "pronouns", value: input }],
			},
		});
		assert.equal(result, expects);
	});
}

valueExtractionSuite.run();

const bioExtractSuite = suite("bio extraction");
const bioExtractTests = [
	["I'm cute and my pronouns are she/her", "she/her"], // exact match
	["my pronouns are helicopter/joke", null], // not on allowlist
	["pronouns: uwu/owo", "uwu/owo"], // followed by pronoun pattern
	["pronouns: any", "any"], // followed by pronoun pattern
	["I'm cute af (she / they)", "she/they"], // with whitespace between pronouns
	["pronouns: any/all", "any/all"], // any pronouns
	["any pronouns", "any pronouns"], // any pronouns
	["He/Him", "He/Him"], //capitalised pronouns
];
for (const [input, expects] of bioExtractTests) {
	bioExtractSuite(input, async () => {
		const result = await pronouns.extractFromStatus({
			account: { note: input },
		});
		assert.equal(result, expects);
	});
}

bioExtractSuite.run();
