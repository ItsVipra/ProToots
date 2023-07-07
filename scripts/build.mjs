import * as esbuild from "esbuild";
import { defaultBuildOptions, writeManifest } from "./shared.mjs";

writeManifest();

await esbuild.build({
	...defaultBuildOptions,
});
