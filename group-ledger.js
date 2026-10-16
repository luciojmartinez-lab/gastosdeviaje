/* Ordinary expenses and transfers keep existing summaries and account balances compatible. */
(function (root) {
  'use strict';
  function plan(group, trip, snapshot, now = new Date().toISOString()) {
    const api = root.TravelGroup;
    api.validate(group);
    const operations = [];
    const oldExpenses = snapshot.gastos.filter(g => Number(g.groupTripId) === Number(trip.id));
    const oldTransfers = snapshot.transferencias.filter(t => Number(t.groupTripId) === Number(trip.id));
    const accounts = snapshot.cuentas.map(account => ({ ...account }));
    const changes = new Map();
    const adjust = (id, deltaCents) => {
      const account = accounts.find(c => Number(c.id) === Number(id));
      if (!account) throw new Error('Falta una cuenta de los movimientos del grupo.');
      const balance = Math.round(Number(account.saldoActual || 0) * 100) + deltaCents;
      if (!Number.isSafeInteger(balance)) throw new Error('Saldo no válido.');
      account.saldoActual = balance / 100;
      changes.set(Number(account.id), account);
    };
    oldExpenses.forEach(g => adjust(g.cuentaId, Math.round(g.importe * 100)));
    oldTransfers.forEach(t => { adjust(t.fromId, Math.round(t.importeFrom * 100)); adjust(t.toId, -Math.round(t.importeTo * 100)); });
    const closed = group.meals.filter(meal => meal.status === 'closed');
    const newExpenses = [], newTransfers = [];
    const counters = Object.fromEntries(['cuentas', 'gastos', 'transferencias', 'categorias'].map(name => [name, snapshot[name].reduce((max, record) => Math.max(max, Number(record.id) || 0), 0)]));
    const idFor = (store, source, old) => old.find(record => record.groupSource === source)?.id || ++counters[store];
    if (group.enabled && group.integrate && closed.length) {
      let clearing = accounts.find(account => account.groupClearing === true && Number(account.viajeId) === Number(trip.id));
      if (!clearing) {
        clearing = { id: ++counters.cuentas, nombre: 'Grupo · pendiente de recuperar / pagar', moneda: 'EUR', viajeId: trip.id,
          saldoInicial: 0, saldoActual: 0, accountType: 'standard', groupClearing: true,
          nota: 'Cuenta de compensación: saldo positivo = recuperar del grupo; negativo = pagar al grupo. Los movimientos se gestionan desde Grupo.', createdAt: now, updatedAt: now };
        accounts.push(clearing);
        changes.set(clearing.id, clearing);
      }
      let category = snapshot.categorias.find(c => !c.parentId && /comid|aliment|restaur/i.test(c.nombre));
      if (!category) {
        category = { id: ++counters.categorias, nombre: 'Comidas', parentId: null };
        operations.push({ store: 'categorias', type: 'put', data: category });
      }
      const realAccount = id => {
        const account = accounts.find(c => Number(c.id) === Number(id));
        if (!account || account.groupClearing || account.moneda !== 'EUR' || Number(account.viajeId) !== Number(trip.id)) throw new Error('Elige una cuenta en euros de este viaje para tus pagos y cobros.');
        return account;
      };
      const transfer = (source, date, fromId, toId, amount, note) => {
        if (!amount) return;
        newTransfers.push({ id: idFor('transferencias', source, oldTransfers), groupTripId: trip.id, groupSource: source,
          fecha: date, fromId, toId, monedaFrom: 'EUR', monedaTo: 'EUR', importeFrom: amount / 100, importeTo: amount / 100,
          importeEur: amount / 100, tipoCambio: 1, importeToManual: true, nota: note, createdAt: oldTransfers.find(t => t.groupSource === source)?.createdAt || now, updatedAt: now });
        adjust(fromId, -amount); adjust(toId, amount);
      };
      for (const meal of closed) {
        const own = api.allocation(meal).totals[group.selfId] || 0;
        if (own) {
          const source = `meal:${meal.id}`;
          const previous = oldExpenses.find(g => g.groupSource === source);
          newExpenses.push({ ...previous, id: idFor('gastos', source, oldExpenses), groupTripId: trip.id, groupSource: source,
            viajeId: trip.id, fecha: meal.date, hora: '00:00', cuentaId: clearing.id, moneda: 'EUR', importe: own / 100, importeEur: own / 100,
            catId: category.id, subcatId: null, desc: `${meal.name} · mi parte de la comida del grupo`, extraImages: [], createdAt: previous?.createdAt || now, updatedAt: now });
          adjust(clearing.id, -own);
        }
        if (meal.payerId === group.selfId) transfer(`advance:${meal.id}`, meal.date, realAccount(meal.accountId).id, clearing.id, meal.totalCents, `${meal.name} · pago completo al restaurante`);
      }
      for (const payment of group.settlements.filter(payment => !payment.voided)) {
        const meal = closed.find(m => m.id === payment.mealId);
        if (payment.fromId === group.selfId) transfer(`settlement:${payment.id}`, payment.date, realAccount(payment.accountId).id, clearing.id, payment.amountCents, `${meal.name} · devolución al compañero que pagó`);
        if (payment.toId === group.selfId) transfer(`settlement:${payment.id}`, payment.date, clearing.id, realAccount(payment.accountId).id, payment.amountCents, `${meal.name} · devolución recibida`);
      }
    }
    for (const [store, oldRecords, nextRecords] of [['gastos', oldExpenses, newExpenses], ['transferencias', oldTransfers, newTransfers]]) {
      const kept = new Set(nextRecords.map(record => record.id));
      oldRecords.filter(record => !kept.has(record.id)).forEach(record => operations.push({ store, type: 'delete', key: record.id }));
      nextRecords.forEach(record => operations.push({ store, type: 'put', data: record }));
    }
    changes.forEach(account => operations.push({ store: 'cuentas', type: 'put', data: { ...account, updatedAt: now } }));
    operations.push({ store: 'viajes', type: 'put', data: { ...trip, group: { ...group, revision: group.revision + 1 }, updatedAt: now } });
    return operations;
  }
  root.TravelGroupLedger = { plan };
})(globalThis);
