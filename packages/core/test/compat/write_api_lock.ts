/**
 * One-time writer for api-lock.json. Refuses to overwrite an existing lock.
 *   node --experimental-strip-types --import ./scripts/_register.mjs packages/core/test/compat/write_api_lock.ts
 */
import { existsSync, writeFileSync } from "node:fs";
import { currentSurface } from "./api_surface.js";

const file = new URL("./api-lock.json", import.meta.url);
if (existsSync(file)) { console.log("api-lock.json exists; not overwritten"); process.exit(0); }
writeFileSync(file, JSON.stringify(await currentSurface(), null, 2) + "\n", "utf8");
console.log("wrote api-lock.json");
