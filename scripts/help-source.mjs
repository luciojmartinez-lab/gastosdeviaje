import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function helpSourceDigest(root){
 const files=(await fs.readdir(root)).filter(name=>/\.(?:js|css|html|webmanifest|txt)$/.test(name)||['package.json','netlify.toml'].includes(name));
 async function scan(dir){for(const entry of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isDirectory())await scan(name);else if(/\.(?:js|mjs|cjs|json|toml)$/.test(name))files.push(name);}}
 await scan('netlify');
 files.push('scripts/help-source.mjs','scripts/build-help-pdf.mjs','scripts/render-help-pdf.py');
 const hash=createHash('sha256');for(const file of files.sort()){hash.update(file+'\0');hash.update((await fs.readFile(path.join(root,file),'utf8')).replace(/\r\n/g,'\n'));hash.update('\0');}return hash.digest('hex');
}
