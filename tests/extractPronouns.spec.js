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
	["es,ihr / they, them", "es,ihr / they, them"], // exact match with multiple values, comma-separated
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

const textExtractSuite = suite("text extraction");
const textExtractTests = [
	["I'm cute and my pronouns are she/her", "she/her"], // exact match
	["my pronouns are helicopter/joke", null], // not on allowlist
	["pronouns: uwu/owo", "uwu/owo"], // followed by pronoun pattern
	["pronouns: any", "any"], // followed by pronoun pattern
	["I'm cute af (she / they)", "she/they"], // with whitespace between pronouns
	["pronouns: any/all", "any/all"], // any pronouns
	["any pronouns", "any pronouns"], // any pronouns
	["He/Him", "He/Him"], //capitalised pronouns
];
for (const [input, expects] of textExtractTests) {
	textExtractSuite(input, async () => {
		const result = await pronouns.extractFromStatus({
			account: { note: input },
		});
		assert.equal(result, expects);
	});
}

textExtractSuite.run();

const endToEndTests = [
	{
		name: "find pronouns in field name",
		fields: [{ name: "they/them", value: "gender: not found" }],
		expect: "they/them",
	},
	{
		name: "find pronouns in field name",
		fields: [{ name: "they/them", value: "gender: not found" }],
		expect: "they/them",
	},
	{
		name: "find pronouns.page link in bio",
		fields: [{ name: "age", value: "42" }],
		note: "https://en.pronouns.page/they/them",
		expect: "they/them",
	},
	{
		name: "find pronouns.page link in unknown field name",
		fields: [{ name: "gender: not found", value: "https://en.pronouns.page/they/them" }],
		expect: "they/them",
	},
	{
		name: "multiple languages and one emoji",
		fields: [{ name: "Pronomina/Pronouns", value: ":hehim: er, ihm / he, him" }],
		expect: "er, ihm / he, him",
	},
	{
		name: "not just pronouns in field",
		fields: [{ name: "RL stats :loading_indicator:", value: "30 | :heart: | She/her" }],
		expect: "She/her",
	},
	{
		name: "multiple subjects in field name",
		fields: [{ name: "She/sie/zij/elle", value: "etc" }],
		expect: "She/sie/zij/elle",
	},
	{
		name: "more complete pronoun definition in bio",
		note: ":speech_bubble: e/em/eir",
		expect: "e/em/eir",
	},
	{
		name: "comma-separated pronouns in bio",
		note: "test er, he, him, more test",
		expect: "er/he/him",
	},
];
const endToEndTestSuite = suite("end to end tests");
for (const { name, fields, expect, note } of endToEndTests) {
	endToEndTestSuite(name, async () => {
		const result = await pronouns.extractFromStatus({
			account: { note, fields },
		});
		assert.equal(result, expect);
	});
}

endToEndTestSuite.run();
