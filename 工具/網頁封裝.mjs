// Development-time page branding. The shared SDK owns input, storage and runtime glue.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const title='Aquarius Kanban · 星泉看板',folder='網頁';
const file=process.argv[2]?resolve(process.argv[2],'index.html'):fileURLToPath(new URL('../'+folder+'/index.html',import.meta.url));
let html=await readFile(file,'utf8');
html=html.replace(/<html lang="[^"]*"/,'<html lang="zh-Hant"')
 .replace(/<title>[^<]*<\/title>/,'<title>'+title+'</title>')
 .replace(/outline:\s*none;(?:touch-action:\s*none;)?/,'outline:none;touch-action:none;')
 .replace('<pre id="output"','<pre hidden id="output"');
await writeFile(file,html);
console.log(title+'：已完成網頁外殼。');
