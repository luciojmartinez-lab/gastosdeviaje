/* The read, conflict check, balances and writes belong to the same transaction. */
(function(root) {
  'use strict';
  function save(db, tripId, expectedRevision, proposed) {
    return new Promise((resolve, reject) => {
      const names = ['viajes', 'cuentas', 'gastos', 'transferencias', 'categorias'];
      const tx = db.transaction(names, 'readwrite');
      const snapshot = {};
      let remaining = names.length, failure, saved;
      tx.onabort = () => reject(failure || tx.error || new Error('No se ha guardado el grupo. Los datos anteriores se conservan.'));
      tx.onerror = () => {};
      tx.oncomplete = () => resolve(saved);
      for (const name of names) {
        const request = name === 'viajes' ? tx.objectStore(name).get(Number(tripId)) : tx.objectStore(name).getAll();
        request.onsuccess = () => {
          snapshot[name] = request.result;
          if (--remaining) return;
          try {
            const trip = snapshot.viajes;
            if (!trip) throw new Error('El viaje ya no existe.');
            const previous = root.TravelGroup.normalize(trip.group);
            if (previous.revision !== expectedRevision) throw new Error('El grupo ha cambiado en otra pestaña. Conserva tu borrador y vuelve a abrir la comida para revisar los cambios.');
            const group = root.TravelGroup.normalize(proposed);
            group.revision = previous.revision;
            const operations = root.TravelGroupLedger.plan(group, trip, snapshot);
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
  root.TravelGroupStore = { save };
})(globalThis);
