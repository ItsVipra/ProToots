import * as esbuild from "esbuild";
import { defaultBuildOptions } from "./shared.mjs";

await esbuild.build({
	...defaultBuildOptions,
	minify: true,
});
