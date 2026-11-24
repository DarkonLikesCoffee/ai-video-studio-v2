import {mkdir,readdir,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import path from "node:path";
const [id]=process.argv.slice(2);
if(!id){console.error("Usage: npm run sheet -- <CompositionId>");process.exit(1);}
const dir=`out/review/${id}/sheet-frames`; await mkdir(dir,{recursive:true});
const still=spawnSync("npx",["remotion","render","src/index.ts",id,dir,"--frames=0-","--every-nth-frame=30","--image-format=jpeg","--sequence"],{stdio:"inherit"});
if(still.status!==0) process.exit(still.status??1);
const files=(await readdir(dir)).filter(f=>/\.(png|jpe?g)$/i.test(f)).sort();
const cells=files.map(f=>`<figure><img src="${f}"><figcaption>${f}</figcaption></figure>`).join("\n");
await writeFile(path.join(dir,"index.html"),`<!doctype html><meta charset="utf-8"><style>body{background:#111;color:white;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}figure{margin:0}img{width:100%;height:auto}figcaption{padding:5px}</style>${cells}`);
console.log(`Contact sheet: ${path.join(dir,"index.html")}`);
