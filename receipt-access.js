(function(root){
  'use strict';
  const key='cuaderno.receiptAccess.v1',listeners=new Set();
  let code='',persistent=false,storageError='';
  try{code=String(root.localStorage.getItem(key)||'').trim();persistent=!!code;}catch{storageError='save';}
  const get=()=>code;
  function description(){
    if(storageError==='forget')return 'El navegador no ha permitido borrar el código guardado. Revisa sus ajustes de almacenamiento.';
    if(storageError)return 'El navegador no permite guardar el código. Se conservará solo mientras esta página siga abierta; copia el código antes de cerrarla.';
    return code?'Código guardado en este navegador, compartido entre Gastos y Grupo.':'El código se guarda automáticamente en este navegador al introducirlo, aunque Google esté saturado.';
  }
  function notify(reason){for(const listener of listeners)listener({code,persistent,reason});}
  function save(value){
    const next=String(value||'').trim();
    if(!next)return false; // Clearing an input is not an instruction to forget a saved code.
    code=next;
    try{root.localStorage.setItem(key,code);persistent=true;storageError='';}catch{persistent=false;storageError='save';}
    notify('save');return persistent;
  }
  function forget(){
    code='';persistent=false;
    try{root.localStorage.removeItem(key);storageError='';}catch{storageError='forget';}
    notify('forget');
  }
  root.addEventListener('storage',event=>{
    if(event.key!==key&&event.key!==null)return;
    try{
      if(event.storageArea&&event.storageArea!==root.localStorage)return;
      // A queued event may describe a value superseded by a more recent save.
      code=String(root.localStorage.getItem(key)||'').trim();
    }catch{return;}
    persistent=!!code;storageError='';notify('external');
  });
  root.ReceiptAccess={get,save,forget,description,isPersistent:()=>persistent,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}};
})(globalThis);
