/// <reference lib="deno.ns" />
import { open } from 'https://deno.land/x/open/index.ts';

await Deno.run({ cmd: ["deno", "bundle", "demo.tsx", "demo.js"] }).status()
await open("demo.html", { wait: true })
