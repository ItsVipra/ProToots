import copyPluginPkg from "@sprout2000/esbuild-copy-plugin";
import path from "path";
const { copyPlugin } = copyPluginPkg; // js and your fucking mess of imports, sigh.

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
