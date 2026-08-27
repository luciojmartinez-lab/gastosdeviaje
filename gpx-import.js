(function initGpxTrackImport(root) {
  'use strict';

  const DEFAULT_MAX_GAP_MS = 5 * 60 * 1000;
  const MAX_POINTS = 20000;

  function decodeXml(value) {
    return String(value || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  function attribute(source, name) {
    const match = String(source || '').match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    return match ? decodeXml(match[2]).trim() : '';
  }

  function elementText(source, name) {
    const match = String(source || '').match(new RegExp(`<(?:[\\w.-]+:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${name}>`, 'i'));
    return match
      ? decodeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')).trim()
      : '';
  }

  function distanceMeters(first, second) {
    const toRadians = value => Number(value) * Math.PI / 180;
    const lat1 = toRadians(first.latitude);
    const lat2 = toRadians(second.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = toRadians(second.longitude) - toRadians(first.longitude);
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function parsePoint(attributes, body) {
    const latitude = Number(attribute(attributes, 'lat'));
    const longitude = Number(attribute(attributes, 'lon'));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
    const rawTime = elementText(body, 'time');
    const parsedTime = Date.parse(rawTime);
    const elevation = Number(elementText(body, 'ele'));
    return {
      latitude,
      longitude,
      time: Number.isFinite(parsedTime) ? new Date(parsedTime).toISOString() : '',
      ...(Number.isFinite(elevation) ? { elevation } : {}),
      kind: 'gpx'
    };
  }

  function pointsFromXml(source, tagName) {
    const points = [];
    const expression = new RegExp(`<(?:[\\w.-]+:)?${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tagName}>`, 'gi');
    let match;
    while ((match = expression.exec(source))) {
      const point = parsePoint(match[1], match[2]);
      if (point) points.push(point);
      if (points.length > MAX_POINTS) throw new Error(`El GPX supera el límite de ${MAX_POINTS.toLocaleString('es-ES')} puntos para un día.`);
    }
    return points;
  }

  function splitOnPauses(points, maxGapMs) {
    const segments = [];
    let current = [];
    points.forEach(point => {
      const previous = current[current.length - 1];
      const previousMs = previous ? Date.parse(previous.time) : NaN;
      const currentMs = Date.parse(point.time);
      const gap = Number.isFinite(previousMs) && Number.isFinite(currentMs) ? currentMs - previousMs : 0;
      if (previous && gap > maxGapMs) {
        if (current.length > 1) segments.push(current);
        current = [];
      }
      if (!previous || distanceMeters(previous, point) >= 0.5 || point.time !== previous.time) current.push(point);
    });
    if (current.length > 1) segments.push(current);
    return segments;
  }

  function providerFrom(creator, name) {
    const value = `${creator} ${name}`.toLowerCase();
    if (value.includes('wikiloc')) return 'Wikiloc';
    if (value.includes('garmin')) return 'Garmin';
    return 'GPX';
  }

  function localDateFromIso(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parse(text, options = {}) {
    const xml = String(text || '').trim();
    if (!/<(?:[\w.-]+:)?gpx\b/i.test(xml)) throw new Error('El archivo seleccionado no es un GPX válido.');
    const creator = attribute((xml.match(/<(?:[\w.-]+:)?gpx\b([^>]*)>/i) || [])[1], 'creator');
    const trackName = elementText((xml.match(/<(?:[\w.-]+:)?trk\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?trk>/i) || [])[1], 'name')
      || elementText(xml, 'name')
      || 'Recorrido GPX';
    const sourceSegments = [];
    const segmentExpression = /<(?:[\w.-]+:)?trkseg\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?trkseg>/gi;
    let segmentMatch;
    while ((segmentMatch = segmentExpression.exec(xml))) {
      const points = pointsFromXml(segmentMatch[1], 'trkpt');
      if (points.length) sourceSegments.push(points);
    }
    if (!sourceSegments.length) {
      const routePoints = pointsFromXml(xml, 'rtept');
      if (routePoints.length) sourceSegments.push(routePoints);
    }
    if (!sourceSegments.length) throw new Error('El GPX no contiene puntos de recorrido.');

    const maxGapMs = Number(options.maxGapMs) > 0 ? Number(options.maxGapMs) : DEFAULT_MAX_GAP_MS;
    const segments = sourceSegments.flatMap(points => splitOnPauses(points, maxGapMs));
    if (!segments.length) throw new Error('El GPX no contiene al menos dos puntos consecutivos de recorrido.');
    const allPoints = segments.flat();
    const timedPoints = allPoints.filter(point => point.time);
    const observedDates = [...new Set(timedPoints.flatMap(point => {
      const utcDate = point.time.slice(0, 10);
      const localDate = localDateFromIso(point.time);
      return [utcDate, localDate].filter(Boolean);
    }))].sort();
    return {
      format: 'gpx',
      name: trackName,
      creator,
      provider: providerFrom(creator, trackName),
      segments,
      pointCount: allPoints.length,
      startTime: timedPoints[0] && timedPoints[0].time || '',
      endTime: timedPoints[timedPoints.length - 1] && timedPoints[timedPoints.length - 1].time || '',
      observedDates,
      missingTimeCount: allPoints.length - timedPoints.length,
      selectedDate: String(options.selectedDate || '')
    };
  }

  root.GpxTrackImport = Object.freeze({
    DEFAULT_MAX_GAP_MS,
    distanceMeters,
    parse
  });
})(typeof self !== 'undefined' ? self : globalThis);
