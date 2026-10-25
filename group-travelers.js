(function(root){
  'use strict';
  const KEY='groupTravelerCatalog';
  const clean=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ');
  const nameKey=value=>clean(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es');
  function identity(action){
    const givenName=clean(action.givenName),surnames=clean(action.surnames),name=givenName+' '+surnames;
    if(!givenName||!surnames||name.length>160)throw new Error('Escribe nombre y apellidos (máximo 160 caracteres en total).');
    return {name,givenName,surnames};
  }
  const sorted=people=>people.slice().sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id));
  function normalizeCatalog(value){
    if(value==null)return [];
    if(!Array.isArray(value))throw new Error('El catálogo de viajeros no es válido.');
    const seen=new Set();return sorted(value.map(person=>{
      if(!person||typeof person.id!=='string'||!person.id||person.id.length>1200||typeof person.name!=='string'||!person.name.trim()||person.name.trim().length>160||seen.has(person.id))throw new Error('El catálogo de viajeros contiene datos no válidos o duplicados.');
      seen.add(person.id);const result={id:person.id,name:clean(person.name)};
      if(person.givenName!=null||person.surnames!=null){const parts=identity(person);if(parts.name!==result.name)throw new Error('El nombre y los apellidos del viajero no coinciden.');Object.assign(result,parts);}
      return result;
    }));
  }
  function newId(items,name){let id='traveler:'+encodeURIComponent(nameKey(name)).slice(0,1100),suffix=1;const base=id;while(items.some(person=>person.id===id))id=base+':'+(++suffix);return id;}
  function mergeCatalog(current,incoming){const items=normalizeCatalog(current);for(const person of normalizeCatalog(incoming))if(!items.some(item=>item.id===person.id))items.push(person);return sorted(items);}
  function reconcile(catalog,trips){
    const items=normalizeCatalog(catalog);let changed=JSON.stringify(items)!==JSON.stringify(catalog||[]);
    const knownUsers=trips.flatMap(trip=>(trip.group?.participants||[]).filter(person=>person.id===trip.group.selfId||person.isUser===true));
    const ownIds=new Set(knownUsers.map(person=>person.catalogId).filter(Boolean));
    const ownNames=new Set(knownUsers.map(person=>nameKey(person.originalName||person.name)).filter(name=>name&&name!=='yo'));
    const viajes=trips.map(trip=>{
      const source=trip.group||root.TravelGroup.normalize();
      const own=(source.participants||[]).find(person=>person.id===source.selfId)||(source.participants||[]).find(person=>person.isUser===true)||(source.participants||[]).find(person=>ownIds.has(person.catalogId)||ownNames.has(nameKey(person.name)));
      let selfId=own?.id||'__user__';while(!own&&(source.participants||[]).some(person=>person.id===selfId))selfId+=':me';
      let ownCatalog=own?.catalogId&&items.find(item=>item.id===own.catalogId);
      if(own&&!ownCatalog&&!own.isUser&&own.name!=='Yo'){
        ownCatalog=items.find(item=>nameKey(item.name)===nameKey(own.name));
        if(!ownCatalog){ownCatalog={id:newId(items,own.name),name:own.name};items.push(ownCatalog);changed=true;}
      }
      const used=new Set(ownCatalog?[ownCatalog.id]:[]);let modified=!own||source.selfId!==selfId;
      const participants=(source.participants||[]).map(person=>{
        if(person.id===selfId){
          if(person.name==='Yo'&&person.active===true&&person.isUser===true)return person;
          modified=true;return {...person,...(ownCatalog?{catalogId:ownCatalog.id}:{}),name:'Yo',active:true,isUser:true,originalName:person.originalName||person.name};
        }
        let item=items.find(value=>value.id===person.catalogId&&!used.has(value.id));
        if(!item)item=items.find(value=>nameKey(value.name)===nameKey(person.name)&&!used.has(value.id));
        if(!item){item={id:newId(items,person.name),name:person.name.trim()};items.push(item);changed=true;}
        used.add(item.id);
        if(person.catalogId===item.id&&person.name===item.name)return person;
        modified=true;return {...person,catalogId:item.id,name:item.name};
      });
      if(!own)participants.unshift({id:selfId,name:'Yo',active:true,isUser:true});
      if(!modified)return trip;changed=true;return {...trip,group:{...source,selfId,participants}};
    });
    return {items:sorted(items),viajes,changed};
  }
  function references(group,person,draft){return root.TravelGroup.participantInUse(group,person.id,draft);}
  function canDelete(items,trips,id){return !trips.some(trip=>(trip.group?.participants||[]).some(person=>person.catalogId===id&&references(trip.group,person)));}
  function apply(catalog,trips,settings,action){
    const result=reconcile(catalog,trips),items=result.items,viajes=result.viajes;
    const person=items.find(item=>item.id===action.id);
    if(action.type==='add'){
      const parts=identity(action);
      if(items.some(item=>nameKey(item.name)===nameKey(parts.name)))throw new Error('Ya existe un viajero con ese nombre y apellidos: '+parts.name+'.');
      items.push({id:newId(items,parts.name),...parts});
    }else{
      if(!person)throw new Error('Este viajero ya no está en el catálogo.');
      if(action.type==='rename'){
        const parts=identity(action),name=parts.name;
        if(items.some(item=>item.id!==person.id&&nameKey(item.name)===nameKey(name)))throw new Error('Ya existe un viajero con ese nombre y apellidos: '+name+'.');
        Object.assign(person,parts);
        for(let i=0;i<viajes.length;i++){const trip=viajes[i];if(trip.group?.participants?.some(p=>p.catalogId===person.id))viajes[i]={...trip,group:{...trip.group,participants:trip.group.participants.map(p=>p.catalogId===person.id?{...p,name}:p)}};}
      }else if(action.type==='select'){
        const index=viajes.findIndex(trip=>Number(trip.id)===Number(action.tripId));if(index<0)throw new Error('Selecciona un viaje para elegir sus viajeros.');
        const trip=viajes[index],group={...root.TravelGroup.normalize(),...trip.group,participants:trip.group.participants.map(p=>({...p}))},existing=group.participants.find(p=>p.catalogId===person.id);
        if(existing?.id===group.selfId)throw new Error('Yo ya está incluido automáticamente en este viaje.');
        if(existing)existing.active=action.checked===true;
        else if(action.checked===true){let id=person.id;while(group.participants.some(p=>p.id===id))id+=':p';group.participants.push({id,catalogId:person.id,name:person.name,active:true});}
        group.enabled=true;viajes[index]={...trip,group};
      }else if(action.type==='delete'){
        for(const trip of viajes)for(const p of trip.group?.participants||[])if(p.catalogId===person.id){
          const draft=settings.find(setting=>setting.key==='groupMealDraft:'+trip.id)?.draft;
          if(references(trip.group,p,draft))throw new Error('Este viajero tiene historial, está seleccionado como «yo» o aparece en un borrador local. Desmárcalo para futuras comidas; sus datos se conservarán.');
        }
        for(let i=0;i<viajes.length;i++){const trip=viajes[i];if(trip.group?.participants?.some(p=>p.catalogId===person.id))viajes[i]={...trip,group:{...trip.group,participants:trip.group.participants.filter(p=>p.catalogId!==person.id)}};}
        items.splice(items.indexOf(person),1);
      }else throw new Error('Acción de viajeros no válida.');
    }
    return {items:sorted(items),viajes};
  }
  function transaction(db,expected,action){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['viajes','appSettings'],'readwrite');let trips,settings,failure,result,remaining=2;
      tx.onabort=()=>reject(failure||tx.error||new Error('No se han guardado los viajeros.'));tx.onerror=()=>{};tx.oncomplete=()=>resolve(result);
      const ready=()=>{if(--remaining)return;try{
        const previous=settings.find(setting=>setting.key===KEY),revision=Number(previous?.revision)||0;
        if(action&&revision!==expected)throw new Error('Los viajeros han cambiado en otra pestaña. Vuelve a revisar la selección.');
        result=action?apply(previous?.items,trips,settings,action):reconcile(previous?.items,trips);
        for(const trip of result.viajes){const before=trips.find(value=>value.id===trip.id);if(trip!==before){
          const group={...trip.group,revision:(Number(before.group?.revision)||0)+(action?1:0)};root.TravelGroup.validate(root.TravelGroup.normalize(group));tx.objectStore('viajes').put({...trip,group});
        }}
        if(action||result.changed||!previous)tx.objectStore('appSettings').put({key:KEY,items:result.items,revision:revision+(action||result.changed?1:0),updatedAt:new Date().toISOString()});
      }catch(error){failure=error;tx.abort();}};
      const a=tx.objectStore('viajes').getAll();a.onsuccess=()=>{trips=a.result;ready();};const b=tx.objectStore('appSettings').getAll();b.onsuccess=()=>{settings=b.result;ready();};
    });
  }
  function select(db,expected,action){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['viajes','appSettings'],'readwrite');let trip,setting,failure,result,remaining=2;
      tx.onabort=()=>reject(failure||tx.error||new Error('No se ha guardado la selección.'));tx.onerror=()=>{};tx.oncomplete=()=>resolve(result);
      const ready=()=>{if(--remaining)return;try{
        if((Number(setting?.revision)||0)!==expected)throw new Error('Los viajeros han cambiado en otra pestaña. Vuelve a revisar la selección.');
        if(!trip)throw new Error('Selecciona un viaje para elegir sus viajeros.');
        const applied=apply(setting?.items,[trip],[],action),saved=applied.viajes[0];
        const group={...saved.group,revision:(Number(trip.group?.revision)||0)+1};
        result={trip:{...saved,group},items:applied.items,revision:expected+1};
        tx.objectStore('viajes').put(result.trip);tx.objectStore('appSettings').put({key:KEY,items:result.items,revision:result.revision,updatedAt:new Date().toISOString()});
      }catch(error){failure=error;tx.abort();}};
      const a=tx.objectStore('viajes').get(Number(action.tripId));a.onsuccess=()=>{trip=a.result;ready();};
      const b=tx.objectStore('appSettings').get(KEY);b.onsuccess=()=>{setting=b.result;ready();};
    });
  }
  root.TravelGroupTravelers={KEY,normalizeCatalog,mergeCatalog,reconcile,canDelete,apply,ensure:db=>transaction(db,null,null),save:(db,expected,action)=>action?.type==='select'?select(db,expected,action):transaction(db,expected,action)};
})(globalThis);
