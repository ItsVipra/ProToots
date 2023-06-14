import * as esbuild from "esbuild";
import { defaultBuildOptions } from "./shared.mjs";
let ctx = await esbuild.context(defaultBuildOptions);
await ctx.watch();
