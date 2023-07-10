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
];

for (const field of validFields) {
	extract(`${field} is extracted`, () => {
		const result = pronouns.extractFromStatus({
			account: {
				fields: [{ name: field, value: "pro/nouns" }],
			},
		});
		assert.equal("pro/nouns", result);
	});
}

extract.run();

const valueExtractionSuite = suite("value extraction");
valueExtractionSuite.before(() => {
	global.window = {
		// @ts-ignore
		navigator: {
			language: "en",
		},
	};
});
valueExtractionSuite.after(() => {
	global.window = undefined;
});
const valueExtractionTests = [
	["she/her", "she/her"], // exact match
	["they and them", "they and them"], // exact match with multiple words
	["they/them (https://pronouns.page/they/them)", "they/them"], // plain-text "URL" with additional text
	["https://en.pronouns.page/they/them", "they/them"], // plain-text "URLs"
	["pronouns.page/they/them", "they/them"], // plain-text "URLs" without scheme
	[`<a href="https://en.pronouns.page/they/them"></a>`, "they/them"], // HTML-formatted URLs
	[`<a href="https://en.pronouns.page/@Vipra"></a>`, null], // pronoun pages with usernames
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
