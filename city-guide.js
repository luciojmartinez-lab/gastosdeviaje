(function(root) {
  const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
  const key = value => clean(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
  function request(value) {
    if (!value || value.consent !== true) throw new Error('Autoriza la consulta de esta ciudad a Google.');
    if (typeof value.city !== 'string' || typeof value.country !== 'string' || !value.city.trim() || !value.country.trim() || value.city.length > 120 || value.country.length > 120) throw new Error('Indica una ciudad y su país, con un máximo de 120 caracteres cada uno.');
    if (value.image != null || value.images != null || value.categories != null) throw new Error('La consulta turística solo admite la ciudad y el país.');
    return {city: clean(value.city, 120), country: clean(value.country, 120)};
  }
  function normalize(value, strict = false) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.items)) {
      if (strict) throw new Error('Propuesta turística no válida.');
      return {intro: '', items: [], source: 'manual', reviewed: false};
    }
    if (strict && (typeof value.intro !== 'string' || !value.items.length || value.items.length > 5)) throw new Error('La propuesta debe contener una introducción y entre uno y cinco lugares.');
    const seen = new Set(), items = [];
    for (const item of value.items.slice(0, 5)) {
      if (strict && (!item || ['name', 'description', 'photoTip'].some(field => typeof item[field] !== 'string'))) throw new Error('Faltan campos en la propuesta turística.');
      const name = clean(item?.name, 160), description = clean(item?.description, 700), photoTip = clean(item?.photoTip, 400);
      if (!name || (strict && !description) || seen.has(key(name))) {
        if (strict) throw new Error('La propuesta tiene lugares vacíos o repetidos.');
        continue;
      }
      const photo = root.TourismPhotos?.normalize(item?.photo);
      seen.add(key(name)); items.push({name, description, photoTip, ...(photo ? {photo} : {})});
    }
    return {intro: clean(value.intro, 1200), items, source: value.source === 'gemini' ? 'gemini' : 'manual', reviewed: value.reviewed === true};
  }
  function destinations(stages) {
    const seen = new Set();
    return (stages || []).filter(stage => {
      if (stage.role !== 'destination' || !stage.city || seen.has(Number(stage.city.id))) return false;
      seen.add(Number(stage.city.id)); return true;
    });
  }
  root.CityGuide = {normalize, request, destinations};
})(globalThis);
