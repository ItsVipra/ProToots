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
