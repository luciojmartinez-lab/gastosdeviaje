/* The read, conflict check, balances and writes belong to the same transaction. */
(function(root) {
  'use strict';
  function save(db, tripId, expectedRevision, proposed, removeMealId = null) {
    return new Promise((resolve, reject) => {
      const names = ['viajes', 'cuentas', 'gastos', 'transferencias', 'categorias'];
      if(removeMealId!==null)names.push('appSettings','blogEntries');
      const tx = db.transaction(names, 'readwrite');
      const snapshot = {};
      let remaining = names.length, failure, saved;
      tx.onabort = () => reject(failure || tx.error || new Error('No se ha guardado el grupo. Los datos anteriores se conservan.'));
      tx.onerror = () => {};
      tx.oncomplete = () => resolve(saved);
      for (const name of names) {
        const request = name === 'viajes' ? tx.objectStore(name).get(Number(tripId)) : name==='appSettings'?tx.objectStore(name).get('groupMealDraft:'+tripId):tx.objectStore(name).getAll();
        request.onsuccess = () => {
          snapshot[name] = request.result;
          if (--remaining) return;
          try {
            const trip = snapshot.viajes;
            if (!trip) throw new Error('El viaje ya no existe.');
            const previous = root.TravelGroup.normalize(trip.group);
            if (previous.revision !== expectedRevision) throw new Error(removeMealId!==null?'El grupo ha cambiado en otra pestaña. Vuelve a solicitar el borrado para revisar la comida actual.':'El grupo ha cambiado en otra pestaña. Conserva tu borrador y vuelve a abrir la comida para revisar los cambios.');
            const group = root.TravelGroup.normalize(removeMealId===null?proposed:previous);
            if(removeMealId!==null){
              if(!group.meals.some(meal=>meal.id===removeMealId))throw new Error('La comida ya no existe. Recarga los datos antes de continuar.');
              group.meals=group.meals.filter(meal=>meal.id!==removeMealId);
              group.settlements=group.settlements.filter(payment=>payment.mealId!==removeMealId);
            }
            group.revision = previous.revision;
            const operations = root.TravelGroupLedger.plan(group, trip, snapshot);
            if(removeMealId!==null&&snapshot.appSettings?.draft?.meal?.id===removeMealId)operations.push({store:'appSettings',type:'delete',key:'groupMealDraft:'+tripId});
            if(removeMealId!==null){
              const expenseIds=new Set(snapshot.gastos.filter(expense=>Number(expense.groupTripId)===Number(tripId)&&expense.groupSource==='meal:'+removeMealId).map(expense=>Number(expense.id)));
              for(const entry of snapshot.blogEntries.filter(entry=>expenseIds.has(Number(entry.sourceGastoId)))){
                if(Number(entry.viajeId)!==Number(tripId))throw new Error('La comida tiene una referencia en el Blog de otro viaje. No se ha borrado nada.');
                operations.push({store:'blogEntries',type:'delete',key:entry.id});
              }
            }
            for (const operation of operations) {
              const store = tx.objectStore(operation.store);
              if (operation.type === 'delete') store.delete(operation.key);
              else store.put(operation.data);
            }
            saved = operations.find(operation => operation.store === 'viajes').data;
          } catch(error) { failure = error; tx.abort(); }
        };
      }
    });
  }
  root.TravelGroupStore = { save,removeMeal:(db,tripId,mealId,expectedRevision)=>save(db,tripId,expectedRevision,null,String(mealId)) };
})(globalThis);
