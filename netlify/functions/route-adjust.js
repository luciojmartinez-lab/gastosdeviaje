const ROUTING_ENDPOINT = 'https://valhalla1.openstreetmap.de/route';
const CLIENT_ID = 'gastosdeviaje2026.netlify.app';
const ALLOWED_COSTINGS = new Set(['auto', 'pedestrian', 'bicycle']);
const MAX_LOCATIONS = 16;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function validLocations(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_LOCATIONS) return null;
  const locations = value.map(location => ({
    lat: Number(location && (location.lat ?? location.latitude)),
    lon: Number(location && (location.lon ?? location.longitude)),
    type: 'break',
    exact: location && location.routingAnchor === true
  }));
  if (locations.some(location => !Number.isFinite(location.lat)
    || !Number.isFinite(location.lon)
    || location.lat < -90 || location.lat > 90
    || location.lon < -180 || location.lon > 180)) return null;
  return locations;
}

export function decodePolyline6(encoded) {
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < String(encoded || '').length) {
    const decode = () => {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index <= encoded.length);
      return result & 1 ? ~(result >> 1) : result >> 1;
    };
    latitude += decode();
    longitude += decode();
    points.push({ latitude: latitude / 1e6, longitude: longitude / 1e6 });
  }
  return points;
}

function samePoint(first, second) {
  return first && second
    && Math.abs(Number(first.latitude) - Number(second.latitude)) < 0.000001
    && Math.abs(Number(first.longitude) - Number(second.longitude)) < 0.000001;
}

export function routePointsWithExactAnchors(legs, locations) {
  const points = [];
  const append = point => {
    if (!point || !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) return;
    const normalized = { latitude: Number(point.latitude), longitude: Number(point.longitude) };
    if (!samePoint(points[points.length - 1], normalized)) points.push(normalized);
  };
  (Array.isArray(legs) ? legs : []).forEach((leg, index) => {
    const start = locations[index];
    const end = locations[index + 1];
    if (!index && start && start.exact) append({ latitude: start.lat, longitude: start.lon });
    decodePolyline6(leg && leg.shape || '').forEach(append);
    if (end && end.exact) append({ latitude: end.lat, longitude: end.lon });
  });
  return points;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const locations = validLocations(body && body.locations);
  const costing = String(body && body.costing || 'auto');
  if (!locations || !ALLOWED_COSTINGS.has(costing)) return json({ error: 'invalid_route_request' }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(ROUTING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${CLIENT_ID} personal travel journal`,
        'X-Client-Id': CLIENT_ID
      },
      body: JSON.stringify({
        locations: locations.map(({ lat, lon, type }) => ({ lat, lon, type })),
        costing,
        units: 'kilometers',
        language: 'es-ES',
        directions_type: 'none',
        shape_format: 'polyline6'
      }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({
        error: response.status === 429 ? 'rate_limited' : 'route_unavailable',
        detail: String(payload && (payload.error || payload.error_code || payload.status_message) || '')
      }, response.status === 429 ? 429 : 422);
    }
    const legs = Array.isArray(payload && payload.trip && payload.trip.legs) ? payload.trip.legs : [];
    const points = routePointsWithExactAnchors(legs, locations);
    if (points.length < 2) return json({ error: 'empty_route' }, 422);
    return json({
      points,
      costing,
      distanceKm: Number(payload.trip && payload.trip.summary && payload.trip.summary.length || 0),
      durationSeconds: Number(payload.trip && payload.trip.summary && payload.trip.summary.time || 0),
      provider: 'Valhalla / OpenStreetMap'
    });
  } catch (error) {
    return json({ error: error && error.name === 'AbortError' ? 'route_timeout' : 'route_service_error' }, 504);
  } finally {
    clearTimeout(timeout);
  }
}
