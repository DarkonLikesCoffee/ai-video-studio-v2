import {mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import path from "node:path";
const [id,frames] = process.argv.slice(2);
if (!id || !frames || !/^[0-9,\-]+$/.test(frames)) {
  console.error("Usage: npm run still -- <CompositionId> <frame,frame,...>");
  process.exit(1);
}
const output = path.join("out","review",id,"latest");
await mkdir(output,{recursive:true});
const result = spawnSync("npx",["remotion","render","src/index.ts",id,output,`--frames=${frames}`,"--image-format=png","--sequence"],{stdio:"inherit"});
process.exit(result.status ?? 1);
