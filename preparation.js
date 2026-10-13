(function initializeTravelPreparation(root) {
  'use strict';
  const sections = { before: 'Antes de salir', bring: 'Cosas que llevar' };
  const groups = [
    ['before', 'Casa y seguridad', '', ['Cerrar puertas y ventanas', 'Comprobar el gas', 'Comprobar grifos y agua', 'Desenchufar electrodomésticos', 'Activar la alarma', 'Sacar la basura', 'Revisar alimentos de la nevera', 'Dejar llaves a una persona de confianza']],
    ['before', 'Gestiones', '', ['Revisar billetes y reservas', 'Hacer el check-in', 'Organizar traslado al aeropuerto o estación', 'Revisar documentación y seguro de viaje']],
    ['before', 'Mascotas y plantas', '', ['Organizar cuidados de mascotas', 'Preparar comida de mascotas', 'Organizar riego de plantas']],
    ['before', 'Preparación digital', '', ['Descargar mapas sin conexión', 'Descargar billetes y reservas', 'Guardar copia de documentos', 'Cargar dispositivos']],
    ['bring', 'Documentación y dinero', '', ['DNI', 'Pasaporte', 'Billetes', 'Reservas de alojamiento', 'Seguro de viaje', 'Permiso de conducir', 'Tarjetas bancarias', 'Efectivo', 'Moneda extranjera', 'Guías de viaje', 'Copias de documentos']],
    ['bring', 'Ropa y calzado', 'Común', ['Camisetas', 'Camisas', 'Pantalones largos', 'Ropa interior', 'Calcetines', 'Pijama', 'Calzado cómodo']],
    ['bring', 'Ropa y calzado', 'Invierno', ['Anorak o abrigo', 'Ropa térmica', 'Jersey', 'Gorro', 'Bufanda', 'Guantes']],
    ['bring', 'Ropa y calzado', 'Verano', ['Pantalones cortos', 'Bañador', 'Gorra', 'Sandalias', 'Ropa ligera']],
    ['bring', 'Ropa y material deportivo', '', ['Chándal', 'Cortavientos', 'Ropa de calentamiento / entreno', 'Ropa de competición', 'Calzado de entreno', 'Calzado de competición']],
    ['bring', 'Electrónica', '', ['Móvil', 'Portátil', 'Cámara', 'Cargadores', 'Cables', 'Batería externa', 'Adaptador de enchufe', 'Base de enchufes', 'Auriculares']],
    ['bring', 'Aseo personal', 'Neceser', ['Neceser', 'Dentífrico', 'Cepillo de dientes', 'Hilo dental', 'Jabón', 'Champú', 'Desodorante', 'Peine', 'Tijeras de aseo', 'Máquina o maquinilla de afeitar', 'Productos de higiene menstrual']],
    ['bring', 'Botiquín y medicación', '', ['Medicación habitual', 'Documentación de recetas', 'Betadine o antiséptico', 'Alcohol', 'Tiritas', 'Gasas', 'Termómetro', 'Tijeras de botiquín']],
    ['bring', 'Protección y comodidad', '', ['Gafas de sol', 'Protector solar', 'Repelente', 'Paraguas', 'Impermeable', 'Tapones de oído', 'Antifaz']],
    ['bring', 'Bolsas y accesorios', '', ['Mochila de día', 'Bolsa para ropa sucia', 'Bolsas organizadoras', 'Candado', 'Etiquetas de equipaje', 'Botella reutilizable']],
    ['bring', 'Actividades', '', ['Material de senderismo', 'Material de playa', 'Material de trabajo']],
    ['bring', 'Otros', '', ['Otros elementos personales']]
  ];
  const defaults = groups.flatMap(([section, category, subcategory, names], groupIndex) => names.map((nombre, itemIndex) => ({
    id: `prep-${groupIndex + 1}-${itemIndex + 1}`, section, category, subcategory, nombre
  })));
  const clean = (value, limit = 120) => String(value ?? '').trim().slice(0, limit);
  function normalizeCatalog(value) {
    const source = Array.isArray(value) ? value : defaults;
    const ids = new Set();
    return source.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const id = clean(item.id), nombre = clean(item.nombre);
      if (!id || !nombre || ids.has(id)) return [];
      ids.add(id);
      return [{ id, nombre, section: item.section === 'before' ? 'before' : 'bring', category: clean(item.category) || 'Otros', subcategory: clean(item.subcategory) }];
    });
  }
  function normalizeItems(value) {
    if (!Array.isArray(value)) return [];
    return normalizeCatalog(value).map(item => {
      const source = value.find(candidate => candidate && String(candidate.id).trim() === item.id);
      return { ...item, done: source.done === true, quantity: clean(source.quantity, 30), note: clean(source.note, 500) };
    });
  }
  function includeItem(items, item, included) {
    const current = normalizeItems(items);
    if (!included) return current.filter(existing => existing.id !== item.id);
    if (current.some(existing => existing.id === item.id)) return current;
    return normalizeItems([...current, { ...item, done: false }]);
  }
  function copyItems(items) {
    return normalizeItems(items).map(item => ({ ...item, done: false }));
  }
  function mergeCatalog(current, incoming) {
    return normalizeCatalog([...normalizeCatalog(current), ...normalizeCatalog(Array.isArray(incoming) ? incoming : [])]);
  }
  function groupItems(items) {
    const result = new Map();
    for (const item of items) {
      const key = JSON.stringify([item.section, item.category, item.subcategory]);
      if (!result.has(key)) result.set(key, { section: item.section, category: item.category, subcategory: item.subcategory, items: [] });
      result.get(key).items.push(item);
    }
    return [...result.values()].sort((a, b) => (a.section === b.section ? 0 : a.section === 'before' ? -1 : 1)
      || a.category.localeCompare(b.category, 'es') || a.subcategory.localeCompare(b.subcategory, 'es'));
  }
  root.TravelPreparation = { sections, defaults, normalizeCatalog, normalizeItems, includeItem, copyItems, mergeCatalog, groupItems };
})(typeof window !== 'undefined' ? window : globalThis);
