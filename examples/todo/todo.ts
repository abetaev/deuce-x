/// <reference lib="deno.ns" />
import { open } from 'https://deno.land/x/open/index.ts';

await Deno.run({ cmd: ["deno", "bundle", "todo.tsx", "todo.js"] }).status()
await open("todo.html", { wait: true })
