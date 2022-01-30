/// <reference lib="deno.ns" />
import { open } from 'https://deno.land/x/open/index.ts';

await Deno.run({ cmd: ["deno", "bundle", "view.tsx", "view.js"] }).status()
await open("view.html", { wait: true })
