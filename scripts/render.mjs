import {mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
const [id]=process.argv.slice(2);
if(!id){console.error("Usage: npm run render -- <CompositionId>");process.exit(1);}
await mkdir("out",{recursive:true});
const result=spawnSync("npx",["remotion","render","src/index.ts",id,`out/${id}.mp4`],{stdio:"inherit"});
process.exit(result.status??1);
