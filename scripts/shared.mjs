import copyPluginPkg from "@sprout2000/esbuild-copy-plugin";
import path from "path";
const { copyPlugin } = copyPluginPkg; // js and your fucking mess of imports, sigh.
import { firefoxManifest, chromeManifest } from "./manifest.mjs";
import fs from "fs";

/**
 * This array contains all files that we want to handle with esbuild.
 * For now, this is limited to our scripts, but it can be extended to more files in the future if needed.
 *
 * @type {string[]}
 */
const files = [
	path.join("src", "content_scripts", "protoots.js"),
	path.join("src", "background", "worker.js"),
	path.join("src", "options", "options.js"),
];

/**
 * @type {import("esbuild").BuildOptions}
 */
export const defaultBuildOptions = {
	entryPoints: files,

	// Use bundling. Especially useful because web extensions do not support it by default for some reason.
	bundle: true,
	format: "esm",

	// Settings for the correct esbuild output.
	outbase: "src",
	outdir: "dist",

	// Because we modify the files, sourcemaps are essential for us.
	sourcemap: "inline",

	// self-explanatory
	platform: "browser",
	logLevel: "info",

	// Copy all files from src/ except our build files (they would be overwritten) to dist/.
	plugins: [
		copyPlugin({
			src: "src",
			dest: "dist",
			recursive: true,

			// Return true if the file should be copied and false otherwise.
			filter: (src) => !src.endsWith(".js"),
		}),
	],
};

/** Writes the manifest for the current browser to the dist folder. */
export const writeManifest = () => {
	const allowedBrowsers = ["firefox", "chrome"];
	const browser = process.env.TARGET ?? "firefox";

	if (!allowedBrowsers.includes(browser)) {
		throw new Error(
			"The browser set via the TARGET environment is not valid. Only 'firefox' or 'chrome' are allowed.",
		);
	}

	const { outdir } = defaultBuildOptions;
	if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);

	const manifest = JSON.stringify(browser === "firefox" ? firefoxManifest : chromeManifest);
	fs.writeFileSync(path.join(outdir, "manifest.json"), manifest, { flag: "w" });
};
