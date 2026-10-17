// Read dimensions from a small header before asking the browser to decode pixels.
export function rasterImageHeader(buffer) {
  const v=new DataView(buffer),n=v.byteLength;
  const text=(offset,length)=>offset+length<=n?String.fromCharCode(...new Uint8Array(buffer,offset,length)):'';
  const size=(width,height,orientation=1)=>width>0&&height>0?{width:orientation>=5&&orientation<=8?height:width,height:orientation>=5&&orientation<=8?width:height}:null;
  if(n>=24&&v.getUint32(0)===0x89504e47&&text(12,4)==='IHDR')return size(v.getUint32(16),v.getUint32(20));
  if(n>=10&&/^GIF8[79]a$/.test(text(0,6)))return size(v.getUint16(6,true),v.getUint16(8,true));
  if(n>=30&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
    const chunk=text(12,4),u24=offset=>v.getUint8(offset)+(v.getUint8(offset+1)<<8)+(v.getUint8(offset+2)<<16);
    if(chunk==='VP8X')return size(u24(24)+1,u24(27)+1);
    if(chunk==='VP8 '&&text(23,3)==='\x9d\x01\x2a')return size(v.getUint16(26,true)&0x3fff,v.getUint16(28,true)&0x3fff);
    if(chunk==='VP8L'&&v.getUint8(20)===0x2f){const bits=v.getUint32(21,true);return size((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1);}
  }
  if(n<4||v.getUint16(0)!==0xffd8)return null;
  let offset=2,width=0,height=0,orientation=1;
  while(offset+4<=n){
    if(v.getUint8(offset)!==0xff){offset++;continue;}
    const marker=v.getUint8(offset+1);
    if(marker===0xda||marker===0xd9)break;
    if(marker===0xff||marker===0x01||(marker>=0xd0&&marker<=0xd8)){offset+=2;continue;}
    const length=v.getUint16(offset+2),end=offset+2+length;
    if(length<2||end>n)break;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=8){height=v.getUint16(offset+5);width=v.getUint16(offset+7);}
    if(marker===0xe1&&length>=16&&text(offset+4,6)==='Exif\0\0'){
      const tiff=offset+10,order=v.getUint16(tiff),le=order===0x4949;
      if((le||order===0x4d4d)&&tiff+8<=end&&v.getUint16(tiff+2,le)===42){
        const ifd=tiff+v.getUint32(tiff+4,le);
        if(ifd>=tiff+8&&ifd+2<=end){
          const count=Math.min(v.getUint16(ifd,le),Math.floor((end-ifd-2)/12));
          for(let i=0;i<count;i++){const entry=ifd+2+i*12;if(v.getUint16(entry,le)===0x112&&v.getUint16(entry+2,le)===3&&v.getUint32(entry+4,le)===1)orientation=v.getUint16(entry+8,le);}
        }
      }
    }
    offset=end;
  }
  return size(width,height,orientation);
}

export async function decodeImageFile(file,{maxDimension,loadFallback,bitmap=globalThis.createImageBitmap}={}) {
  const limit=Math.max(640,Math.min(2200,Number(maxDimension)||1600));
  let dimensions=null;
  try{dimensions=rasterImageHeader(await file.slice(0,512*1024).arrayBuffer());}catch{/* Legacy files still have the guarded fallback below. */}
  if(dimensions&&typeof bitmap==='function'){
    const scale=Math.min(1,limit/Math.max(dimensions.width,dimensions.height));
    let image;
    try{
      image=await bitmap(file,{imageOrientation:'from-image',resizeWidth:Math.max(1,Math.round(dimensions.width*scale)),resizeHeight:Math.max(1,Math.round(dimensions.height*scale)),resizeQuality:'high'});
      if(image.width>limit||image.height>limit||!image.width||!image.height)throw new Error('El navegador no ha reducido la foto.');
      return image;
    }catch{image?.close?.();}
  }
  // Do not retry a very large photo by decoding all its pixels on the main page.
  if((dimensions&&dimensions.width*dimensions.height>12_000_000)||(!dimensions&&file.size>8*1024*1024))throw new Error('Esta foto es demasiado grande para prepararla con seguridad en este navegador. Hazla en resolución normal (sin modo 48/108/200 MP) o recórtala y selecciónala desde Archivos.');
  return loadFallback();
}

