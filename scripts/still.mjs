import {mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
const [id,frames] = process.argv.slice(2);
if(!id||!frames||!/^[0-9,\-]+$/.test(frames)) {console.error("Usage: npm run still -- <CompositionId> <frame,frame,...>");process.exit(1);}
const out=`out/review/${id}/latest`; await mkdir(out,{recursive:true});
const result=spawnSync("npx",["remotion","render","src/index.ts",id,out,`--frames=${frames}`,"--image-format=png","--sequence"],{stdio:"inherit"});
process.exit(result.status??1);
