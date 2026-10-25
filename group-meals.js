/* Integer cents throughout: a shared ticket must always reconcile exactly. */
(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set(values)];
  const integer = value => Number.isSafeInteger(Number(value)) ? Number(value) : 0;
  const money = cents => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  function cents(value) {
    const text = String(value ?? '').trim().replace(/\s|€/g, '');
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe un importe con un máximo de dos decimales.');
    const negative = normalized.startsWith('-');
    const [whole, decimals = ''] = normalized.replace(/^-/, '').split('.');
    const exact = (BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'))) * (negative ? -1n : 1n);
    if (exact > BigInt(Number.MAX_SAFE_INTEGER) || exact < -BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Importe demasiado grande.');
    return Number(exact);
  }
  function expandUnits(items) {
    const count = item => Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) > 1 ? Number(item.quantity) : 1;
    if (items.reduce((sum,item)=>sum+count(item),0)>500) throw new Error('La propuesta supera 500 platos o unidades. Revisa el texto antes de incorporarlo.');
    return items.flatMap(item => {
      const quantity=count(item);
      if(quantity===1)return [copy(item)];
      if(!Number.isSafeInteger(item.amountCents)||item.amountCents<0)throw new Error('Revisa el importe de la línea antes de desglosar las unidades.');
      const base=Math.floor(item.amountCents/quantity),remainder=item.amountCents%quantity;
      return Array.from({length:quantity},(_,index)=>({...copy(item),quantity:1,amountCents:base+(index<remainder?1:0)}));
    });
  }
  function ticketPhotos(meal) {
    if(Array.isArray(meal.ticketPhotos)&&meal.ticketPhotos.length)return meal.ticketPhotos;
    return meal.ticketData?[{data:meal.ticketData,name:meal.ticketName||'ticket.jpg',type:meal.ticketType||'image/jpeg'}]:[];
  }
  function setTicketPhotos(meal, photos) {
    if(!Array.isArray(photos)||photos.length>8)throw new Error('Se admiten hasta 8 fotos del mismo ticket.');
    if(photos.some(photo=>!photo||typeof photo.data!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(photo.data)))throw new Error('Una foto del ticket no es válida.');
    delete meal.ticketPhotos;delete meal.ticketData;delete meal.ticketName;delete meal.ticketType;delete meal.ticketRef;
    if(photos.length===1){meal.ticketData=photos[0].data;meal.ticketName=photos[0].name;meal.ticketType=photos[0].type;}
    else if(photos.length)meal.ticketPhotos=photos.map(photo=>({data:photo.data,name:photo.name||'ticket.jpg',type:photo.type||'image/jpeg'}));
  }
  function normalize(value = {}) {
    const group = value && typeof value === 'object' ? copy(value) : {};
    return { ...group, version: 1, enabled: group.enabled === true, selfId: String(group.selfId || ''),
      integrate: group.integrate === true, revision: integer(group.revision),
      participants: Array.isArray(group.participants) ? group.participants.filter(p => p && p.id && p.name).map(p => ({ ...p, id: String(p.id), name: String(p.name), active: p.active !== false })) : [],
      meals: Array.isArray(group.meals) ? group.meals : [], settlements: Array.isArray(group.settlements) ? group.settlements : [] };
  }
  function participantInUse(group,id,draft=null){
    const meals=[...(group.meals||[]),...(draft?.meal?[draft.meal]:[])];
    return group.selfId===id||meals.some(meal=>meal.payerId===id||(meal.attendees||[]).includes(id)||(meal.items||[]).some(item=>Object.hasOwn(item.shares||{},id)))||(group.settlements||[]).some(payment=>payment.fromId===id||payment.toId===id);
  }
  function removeParticipant(group,id,draft=null){
    if(!group.participants.some(person=>person.id===id))throw new Error('Este viajero ya no está en el grupo.');
    if(participantInUse(group,id,draft))throw new Error('Este viajero está seleccionado como «yo» o tiene referencias en comidas, devoluciones o un borrador local. Puedes desactivarlo para conservar su historial.');
    const next=normalize(group);next.participants=next.participants.filter(person=>person.id!==id);return next;
  }
  function split(amount, shares) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Importe de reparto no válido.');
    if (Object.values(shares || {}).some(weight => !Number.isFinite(Number(weight)) || Number(weight) < 0)) throw new Error('Reparto no válido.');
    const entries = Object.entries(shares || {}).filter(([, weight]) => Number(weight) > 0);
    if (!entries.length) throw new Error('Hay un concepto sin asignar.');
    if (entries.some(([, weight]) => !Number.isFinite(Number(weight)) || Number(weight) > 1000000)) throw new Error('Reparto no válido.');
    const weights = entries.map(([id, weight], index) => {
      const scaled = Math.round(Number(weight) * 1000000);
      if (!scaled || Math.abs(Number(weight) - scaled / 1000000) > 1e-12) throw new Error('Usa como máximo seis decimales en los pesos.');
      return { id, index, weight: BigInt(scaled) };
    });
    const totalWeight = weights.reduce((sum, row) => sum + row.weight, 0n);
    const rows = weights.map(row => {
      const numerator = BigInt(amount) * row.weight;
      return { ...row, value: Number(numerator / totalWeight), remainder: numerator % totalWeight };
    });
    let remaining = amount - rows.reduce((sum, row) => sum + row.value, 0);
    [...rows].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)
      .forEach(row => { if (remaining-- > 0) row.value += 1; });
    return Object.fromEntries(rows.map(row => [row.id, row.value]));
  }
  function allocation(meal) {
    const attendees = unique(meal.attendees || []);
    const totals = Object.fromEntries(attendees.map(id => [id, 0]));
    const common = { ...totals }, individual = { ...totals };
    let totalCents = 0, unassignedCents = 0;
    const errors = [];
    for (const item of meal.items || []) {
      const amount = integer(item.amountCents);
      if (!item.name?.trim() || amount < 0 || !Number.isSafeInteger(item.amountCents)) { errors.push('Revisa el nombre y el importe de cada concepto.'); continue; }
      totalCents += amount;
      if (!Number.isSafeInteger(totalCents)) errors.push('Importe demasiado grande.');
      if (item.quantity != null && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) errors.push('Revisa las unidades de cada concepto.');
      const shares = item.common ? Object.fromEntries(attendees.map(id => [id, 1])) : item.shares || {};
      const selected = Object.entries(shares).filter(([, weight]) => Number(weight) > 0);
      if (!selected.length) { unassignedCents += amount; errors.push(`Falta asignar: ${item.name}.`); continue; }
      if (selected.some(([id]) => !attendees.includes(id))) { errors.push(`Hay una persona ausente en ${item.name}.`); continue; }
      try {
        if (Object.values(shares).some(weight => !Number.isFinite(Number(weight)) || Number(weight) < 0)) throw new Error('Reparto no válido.');
        if (item.mode === 'units' && !item.common && Math.abs(selected.reduce((sum, [, weight]) => sum + Number(weight), 0) - Number(item.quantity)) > 0.000001) throw new Error(`Las unidades asignadas no coinciden en ${item.name}.`);
        for (const [id, value] of Object.entries(split(amount, shares))) {
          totals[id] += value;
          (item.common ? common : individual)[id] += value;
        }
      } catch (error) { errors.push(error.message); }
    }
    if (!attendees.length) errors.push('Selecciona los asistentes.');
    if (!(meal.items || []).length) errors.push('Añade los conceptos del ticket.');
    const differenceCents = integer(meal.totalCents) - totalCents;
    if (!Number.isSafeInteger(meal.totalCents) || meal.totalCents <= 0) errors.push('Indica el total del ticket.');
    if (differenceCents !== 0) errors.push(`Los conceptos y el ticket difieren en ${money(differenceCents)}.`);
    return { totals, common, individual, totalCents, unassignedCents, differenceCents, errors: unique(errors) };
  }
  function validDate(value) { const date = new Date(String(value) + 'T12:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value; }
  function validate(group) {
    const ids = group.participants.map(p => p.id);
    if (group.participants.some(p => !p.name.trim())) throw new Error('Escribe el nombre de cada viajero.');
    if (!Number.isSafeInteger(group.revision) || group.revision < 0) throw new Error('Revisión de grupo no válida.');
    if (new Set(ids).size !== ids.length) throw new Error('Hay viajeros duplicados.');
    if (group.selfId && !ids.includes(group.selfId)) throw new Error('Selecciona quién eres en el grupo.');
    if (group.integrate && !group.selfId) throw new Error('Indica quién eres para registrar tu parte en Gastos.');
    const mealIds = new Set();
    for (const meal of group.meals) {
      if (!meal.id || mealIds.has(meal.id)) throw new Error('Comida duplicada.');
      mealIds.add(meal.id);
      if (!['draft', 'closed'].includes(meal.status)) throw new Error('Estado de comida no válido.');
      if (meal.currency !== 'EUR') throw new Error('Las comidas de grupo de esta versión se registran en euros.');
      if (!Array.isArray(meal.attendees) || !Array.isArray(meal.items)) throw new Error('Datos de comida no válidos.');
      if(meal.ticketPhotos!=null && (!Array.isArray(meal.ticketPhotos)||meal.ticketPhotos.length>8||meal.ticketPhotos.some(photo=>!photo||typeof photo.data!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(photo.data))))throw new Error('Las fotos de una comida no son válidas. No se ha guardado el grupo.');
      if (new Set(meal.attendees).size !== meal.attendees.length) throw new Error('Asistentes duplicados.');
      const itemIds = meal.items.map(item => item.id).filter(Boolean);
      if (new Set(itemIds).size !== itemIds.length) throw new Error('Conceptos duplicados.');
      if (meal.attendees.some(id => !ids.includes(id))) throw new Error('Una comida contiene un viajero que no existe.');
      if (meal.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time)) throw new Error('Indica una hora válida para la comida.');
      if (meal.status !== 'closed') continue;
      const result = allocation(meal);
      if (result.errors.length) throw new Error(result.errors[0]);
      if (!ids.includes(meal.payerId)) throw new Error('Indica quién pagó al restaurante.');
      if (!validDate(meal.date) || !meal.name?.trim()) throw new Error('Indica restaurante y fecha.');
    }
    const settlementIds = new Set();
    for (const payment of group.settlements) {
      if (!payment.id || settlementIds.has(payment.id)) throw new Error('Cobro duplicado.');
      settlementIds.add(payment.id);
      if (payment.voided) { if (!String(payment.voidReason || '').trim()) throw new Error('Indica por qué anulas la devolución.'); continue; }
      const meal = group.meals.find(m => m.id === payment.mealId && m.status === 'closed');
      if (!meal || !meal.attendees.includes(payment.fromId) || payment.toId !== meal.payerId || payment.fromId === payment.toId) throw new Error('El cobro no corresponde a esta comida.');
      if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0) throw new Error('El cobro debe ser mayor que cero.');
      const paid = group.settlements.filter(p => !p.voided && p.mealId === meal.id && p.fromId === payment.fromId).reduce((sum, p) => sum + p.amountCents, 0);
      if (paid > (allocation(meal).totals[payment.fromId] || 0)) throw new Error('El cobro supera la parte pendiente de esa persona.');
      if (!validDate(payment.date)) throw new Error('Indica la fecha de la devolución.');
    }
    return group;
  }
  function mealPayments(group, meal) {
    const result = allocation(meal);
    return meal.attendees.map(id => {
      const due = result.totals[id] || 0;
      const received = group.settlements.filter(p => !p.voided && p.mealId === meal.id && p.fromId === id).reduce((sum, p) => sum + p.amountCents, 0);
      return { id, due, paid: id === meal.payerId ? due : received, remaining: id === meal.payerId ? 0 : due - received };
    });
  }
  function balances(group) {
    const rows = Object.fromEntries(group.participants.map(p => [p.id, { ...p, consumed: 0, advanced: 0, sent: 0, received: 0, balance: 0 }]));
    for (const meal of group.meals.filter(m => m.status === 'closed')) {
      for (const [id, amount] of Object.entries(allocation(meal).totals)) rows[id].consumed += amount;
      rows[meal.payerId].advanced += meal.totalCents;
    }
    for (const payment of group.settlements.filter(p => !p.voided)) { rows[payment.fromId].sent += payment.amountCents; rows[payment.toId].received += payment.amountCents; }
    return Object.values(rows).map(row => ({ ...row, balance: row.advanced - row.consumed + row.sent - row.received }));
  }
  function advanceDetails(group,meal){
    const own=allocation(meal).totals[group.selfId]||0;
    const advanced=meal.payerId===group.selfId?meal.totalCents:0;
    const received=group.settlements.filter(payment=>!payment.voided&&payment.mealId===meal.id&&payment.toId===group.selfId).reduce((total,payment)=>total+payment.amountCents,0);
    return {own,advanced,received,pending:advanced?Math.max(0,advanced-own-received):0};
  }
  function parseItems(text) {
    const items = [], ignored = [];
    const metadata = /\b(total|subtotal|sub total|base imponible|iva|igic|impuesto|tarjeta|efectivo|cambio|pagado|entregado|comensales|por persona|mesa|factura|fecha|hora|cif|nif|telefono|tel\.|descuento|propina)\b/i;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim().replace(/\s+/g, ' ');
      if (!line || metadata.test(line.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) continue;
      const match = line.match(/^(.*?)\s+(-?\d+(?:[.,]\d{3})*[.,]\d{2})\s*(?:€|EUR)?$/i);
      if (!match || !/[a-záéíóúüñ]/i.test(match[1])) continue;
      let label = match[1].trim(), quantity = 1;
      const count = label.match(/^(\d{1,4}(?:[.,]\d+)?)\s*(?:[x×]\s*|\s+)(.+)$/i);
      if (count) { quantity = Number(count[1].replace(',', '.')); label = count[2]; }
      // Some receipts include a unit price before the final line amount.
      label = label.replace(/\s+\d+[.,]\d{2}\s*(?:€|EUR)?$/i, '').trim();
      const amountCents = cents(match[2]);
      if (amountCents < 0 || !quantity || !label) { ignored.push(line); continue; }
      const common = /^(?:pan(?:\s|$)|agua(?:\s|$)|servicio de pan\b)/i.test(label);
      items.push({ name: label, quantity, amountCents, common, shares: {} });
    }
    return { items, ignored };
  }
  function remapAccounts(group, accountMap) {
    if (!group) return group;
    const next = normalize(group);
    next.meals.forEach(meal => { meal.accountId = accountMap[Number(meal.accountId)] || null; });
    next.settlements.forEach(payment => { payment.accountId = accountMap[Number(payment.accountId)] || null; });
    return next;
  }
  function personalReceipt(group, meal, participantId) {
    if(meal?.status!=='closed')throw new Error('Cierra y revisa la comida antes de generar justificantes.');
    validate(group);
    const person=group.participants.find(person=>person.id===participantId);
    if(!person||!meal.attendees.includes(participantId))throw new Error('Selecciona un asistente de esta comida.');
    const rows=[];
    for(const item of meal.items){
      const shares=item.common?Object.fromEntries(meal.attendees.map(id=>[id,1])):item.shares||{};
      if(!(Number(shares[participantId])>0))continue;
      const shared=Object.values(shares).filter(weight=>Number(weight)>0).length>1;
      rows.push({name:item.name,label:item.name+(item.common?' (común)':shared?' (compartido)':''),amountCents:split(item.amountCents,shares)[participantId]});
    }
    const payment=mealPayments(group,meal).find(row=>row.id===participantId);
    return {participantName:person.name,mealName:meal.name,date:meal.date,payerName:group.participants.find(person=>person.id===meal.payerId)?.name||'',isPayer:participantId===meal.payerId,rows,totalCents:payment.due,paidCents:payment.paid,remainingCents:payment.remaining};
  }
  function summary(group, meal) {
    const result = allocation(meal);
    const name = id => group.participants.find(p => p.id === id)?.name || '?';
    return [`${meal.name} · ${meal.date}${meal.time?' · '+meal.time:''}`, `Total: ${money(meal.totalCents)} · ${meal.attendees.length} asistentes`, '',
      ...meal.attendees.map(id => `${name(id)}: ${money(result.totals[id] || 0)} (individual ${money(result.individual[id] || 0)} + compartido ${money(result.common[id] || 0)})`),
      '', ...mealPayments(group, meal).map(row => `${name(row.id)}: ${row.id === meal.payerId ? 'cubierto' : 'devuelto'} ${money(row.paid)} · pendiente ${money(row.remaining)}`), '', `Pagó: ${name(meal.payerId)}`, 'El reparto de céntimos conserva exactamente el total del ticket.'].join('\n');
  }
  root.TravelGroup = { normalize, validate, participantInUse, removeParticipant, allocation, split, expandUnits, ticketPhotos, setTicketPhotos, cents, money, balances, mealPayments, advanceDetails, parseItems, remapAccounts, personalReceipt, summary };
})(globalThis);
