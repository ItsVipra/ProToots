import * as esbuild from "esbuild";
import { defaultBuildOptions, writeManifest } from "./shared.mjs";

writeManifest();

let ctx = await esbuild.context(defaultBuildOptions);
await ctx.watch();
