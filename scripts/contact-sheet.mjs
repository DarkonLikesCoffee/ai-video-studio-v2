import {readdir,writeFile} from "node:fs/promises";
import path from "node:path";
const dir=process.argv[2];
if(!dir){console.error("Usage: node scripts/contact-sheet.mjs <frames-directory>");process.exit(1);}
const images=(await readdir(dir)).filter(f=>/\.(jpe?g|png)$/i.test(f)).sort();
const html=`<!doctype html><meta charset="utf-8"><title>Remotion contact sheet</title><style>body{margin:20px;background:#10141a;color:#eee;font:13px system-ui;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}figure{margin:0}img{display:block;width:100%;height:auto;background:#252a33}figcaption{padding:6px}</style>${images.map(f=>`<figure><img src="${f}"><figcaption>${f}</figcaption></figure>`).join("")}`;
await writeFile(path.join(dir,"index.html"),html);
console.log(path.join(dir,"index.html"));
