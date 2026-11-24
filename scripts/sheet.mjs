import {mkdir,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {selectComposition} from "@remotion/renderer";
const [id]=process.argv.slice(2);
if(!id){console.error("Usage: npm run sheet -- <CompositionId>");process.exit(1);}
const serve=spawnSync("npx",["remotion","compositions","src/index.ts"],{encoding:"utf8"});
if(serve.status!==0){process.stderr.write(serve.stderr||"Could not list compositions\n");process.exit(serve.status??1);}
const match=serve.stdout.match(new RegExp(`"id"\\s*:\\s*"${id}"[\\s\\S]{0,350}?"durationInFrames"\\s*:\\s*(\\d+)[\\s\\S]{0,150}?"fps"\\s*:\\s*(\\d+)`));
if(!match){console.error(`Could not read duration/fps for ${id} from Remotion composition list.`);process.exit(1);}
const duration=Number(match[1]),fps=Number(match[2]);
const frames=Array.from({length:Math.ceil(duration/fps)},(_,i)=>i*fps).join(",");
const output=`out/review/${id}/contact-sheet`; await mkdir(output,{recursive:true});
const rendered=spawnSync("npx",["remotion","render","src/index.ts",id,output,`--frames=${frames}`,"--image-format=jpeg","--sequence"],{stdio:"inherit"});
if(rendered.status!==0)process.exit(rendered.status??1);
const result=spawnSync("node",["scripts/contact-sheet.mjs",output],{stdio:"inherit"});
process.exit(result.status??1);
