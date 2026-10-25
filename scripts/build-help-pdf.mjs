import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {helpSourceDigest} from './help-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=await fs.readFile(path.join(root,'ayuda.html'),'utf8'),doc=new JSDOM(html).window.document;
const version=(await fs.readFile(path.join(root,'version.txt'),'utf8')).trim();
if(!doc.title.endsWith(version))throw new Error('Actualiza la versión de ayuda antes de generar el PDF.');
const sourceSha256=await helpSourceDigest(root),blocks=[];
const xml=value=>String(value).replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
function rich(node){
 if(node.nodeType===3)return xml(node.textContent.replace(/\s+/g,' '));
 if(node.nodeType!==1||['SCRIPT','STYLE','UL','OL'].includes(node.tagName))return '';
 const content=Array.from(node.childNodes).map(rich).join(''),anchor=node.id?`<a name="${xml(node.id)}"/>`:'';
 if(['STRONG','B'].includes(node.tagName))return anchor+`<b>${content}</b>`+(node.parentElement?.classList.contains('principle')?'<br/>':'');
 if(['EM','I'].includes(node.tagName))return anchor+`<i>${content}</i>`;
 if(node.tagName==='BR')return '<br/>';
 if(node.tagName==='A'&&node.getAttribute('href')){const href=node.getAttribute('href');return anchor+`<a href="${xml(href.startsWith('#')||/^https?:/.test(href)?href:'https://gastosdeviaje2026.netlify.app/'+href)}" color="#07578f">${content}</a>`;}
 return anchor+content+(['P','DIV'].includes(node.tagName)?'<br/>':'');
}
const content=node=>Array.from(node.childNodes).map(rich).join('').trim().replace(/(?:<br\/>)+$/,'');
function walk(node){
 if(node.nodeType!==1||node.matches('.back,.no-print,script,style'))return;
 if(node.id)blocks.push({type:'anchor',id:node.id});
 const tag=node.tagName;
 if(/^H[1-6]$/.test(tag)){blocks.push({type:'heading',level:Number(tag[1]),html:content(node)});return;}
 if(tag==='P'){blocks.push({type:'paragraph',html:node.classList.contains('doc-meta')?Array.from(node.children).map(rich).join('<br/>'):content(node),kind:node.className});return;}
 if(tag==='TABLE'){blocks.push({type:'table',rows:Array.from(node.rows).map(row=>Array.from(row.cells).map(cell=>({html:rich(cell),header:cell.tagName==='TH'})))});return;}
 if(tag==='FIGURE'){const image=node.querySelector('img');if(image)blocks.push({type:'image',src:image.getAttribute('src'),caption:node.querySelector('figcaption')?.textContent||''});return;}
 if(tag==='UL'||tag==='OL'){Array.from(node.children).filter(child=>child.tagName==='LI').forEach((item,i)=>{blocks.push({type:'paragraph',html:(tag==='OL'?`${i+1}. `:'• ')+content(item),kind:'list'});Array.from(item.children).filter(child=>['UL','OL'].includes(child.tagName)).forEach(walk);});return;}
 if(node.classList.contains('anchor-list')){blocks.push({type:'paragraph',html:Array.from(node.children).map(rich).join(' · ')});return;}
 if(!node.querySelector(':scope > p,:scope > div,:scope > section,:scope > article,:scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > ul,:scope > ol,:scope > table,:scope > figure')){const text=content(node);if(text)blocks.push({type:'paragraph',html:text,kind:node.className});return;}
 Array.from(node.children).forEach(walk);
 if(node.classList.contains('intro'))blocks.push({type:'pagebreak'});
}
doc.querySelector('.manual').childNodes.forEach(walk);
const tmp=path.join(root,'tmp','pdfs');await fs.mkdir(tmp,{recursive:true});const target=path.join(tmp,'ayuda-nueva.pdf');
const candidate=path.join(process.env.USERPROFILE||'','.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
const python=process.env.BITACORA_PYTHON||(await fs.access(candidate).then(()=>candidate,()=>process.platform==='win32'?'python':'python3'));
const result=spawnSync(python,[path.join(root,'scripts','render-help-pdf.py')],{input:JSON.stringify({root,target,version,sourceSha256,blocks}),encoding:'utf8',maxBuffer:4_000_000});
if(result.status!==0)throw new Error(result.stderr||result.error?.message||'No se ha podido generar el PDF.');
const pdf=await fs.readFile(target);if(pdf.subarray(0,5).toString()!=='%PDF-')throw new Error('Salida PDF no válida.');
const output=path.join(root,'output','pdf','ayuda-cuaderno-bitacora.pdf');await fs.copyFile(target,output);
await fs.writeFile(path.join(root,'output','pdf','ayuda-cuaderno-bitacora.manifest.json'),JSON.stringify({version,sourceSha256,pdfSha256:createHash('sha256').update(pdf).digest('hex'),blocks:blocks.length},null,2)+'\n');
console.log(`Ayuda ${version}: PDF regenerado (${blocks.length} bloques, ${pdf.length} bytes).`);
