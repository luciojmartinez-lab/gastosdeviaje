import test from 'node:test';
import assert from 'node:assert/strict';
import cvModule from '@techstark/opencv-js';
import {detectReceiptCorners} from '../ticket-image-processing.js';
const {cv}=await new Promise((resolve,reject)=>{if(cvModule.Mat)resolve({cv:cvModule});else cvModule.then(()=>resolve({cv:cvModule}),reject);});
test('el papel con sombra cálida conserva la columna derecha de precios',()=>{
 const source=new cv.Mat(320,240,cv.CV_8UC4);
 try{
  for(let y=0;y<320;y++)for(let x=0;x<240;x++){
   const inside=x>=40&&x<=200&&y>=20&&y<=300;
   const color=inside?(x>=150?[164,136,114]:[230,215,195]):[90,40,10];
   const p=(y*240+x)*4;source.data.set([...color,255],p);
  }
  const corners=detectReceiptCorners(cv,source);
  assert.ok(corners);
  assert.ok(corners[1].x>=195,`El borde derecho se recortó en ${corners[1].x}`);
  assert.ok(corners[2].x>=195);
  assert.ok(corners[0].x<=45);
 }finally{source.delete();}
});
