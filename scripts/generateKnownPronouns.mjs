import * as fs from "fs";
import path from "path";

const licenseHeader = [
	"Thanks to pronoun.page for providing the service known as pronoun.page!",
	"The pronouns are fetched from them, therefore the content of this file is licensed under the '🏳️‍🌈 Opinionated Queer License v1.1'.",
	"",
	"The license can be found here: https://en.pronouns.page/license\n",
]
	.map((x) => `// ${x}`)
	.join("\n");

const languages = [
	"ar",
	"de",
	"en",
	"eo",
	"es",
	"et",
	"fr",
	"gl",
	"it",
	"ja",
	"ko",
	"lad",
	"nl",
	"no",
	"pl",
	"pt",
	"ro",
	"ru",
	"sv",
	"tok",
	"tr",
	"ua",
	"vi",
	"yi",
	"zh",
];

const fetchedLanguages = [];

for (const lang of languages) {
	try {
		const resp = await fetch(`https://${lang}.pronouns.page/api/pronouns`);
		if (!resp.ok) continue;

		const json = await resp.json();
		let morphemes = [];
		for (const pronoun of Object.values(json)) {
			morphemes.push(...Object.values(pronoun.morphemes));
		}

		// CC-BY-SA 4.0 community wiki https://stackoverflow.com/a/9229821
		morphemes = [...new Set(morphemes)].filter((x) => x);
		fs.writeFile(
			path.join(process.cwd(), "src", "libs", "generated", "pronouns", `${lang}.js`),
			licenseHeader + "export default " + JSON.stringify(morphemes),
			(err) => {
				if (err) console.error("writing file failed: ", err);
			},
		);
		fetchedLanguages.push(lang);
	} catch (error) {
		console.log(`fetching pronouns for ${lang} failed, skipping`, error);
	}
}

fs.writeFile(
	path.join(process.cwd(), "src", "libs", "generated", "pronouns", `index.js`),
	licenseHeader +
		`${fetchedLanguages.map((x) => `import ${x} from './${x}.js';`).join("\n")}
		export default {${fetchedLanguages.join(", ")}};
		export const allKnownPronouns = [${fetchedLanguages.map((x) => "..." + x).join(",\n")}]`,
	(err) => {
		if (err) console.error("writing index file failed: ", err);
	},
);
