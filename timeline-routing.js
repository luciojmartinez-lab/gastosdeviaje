(function initTimelineRouting(root) {
  const EARTH_RADIUS_METERS = 6371008.8;
  const ROUTING_MODES = new Set(['automatic', 'driving', 'walking']);

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    return ROUTING_MODES.has(mode) ? mode : 'automatic';
  }

  function distanceMeters(first, second) {
    const lat1 = finiteNumber(first && first.latitude);
    const lon1 = finiteNumber(first && first.longitude);
    const lat2 = finiteNumber(second && second.latitude);
    const lon2 = finiteNumber(second && second.longitude);
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Number.POSITIVE_INFINITY;
    const radians = value => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function pathDurationHours(path) {
    const first = path && path[0];
    const last = path && path[path.length - 1];
    const start = Date.parse(first && first.time || path && path.startTime || '');
    const end = Date.parse(last && last.time || path && path.endTime || '');
    return Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 3600000 : null;
  }

  function pathDistanceMeters(path) {
    if (!Array.isArray(path)) return 0;
    return path.slice(1).reduce((sum, point, index) => {
      const distance = distanceMeters(path[index], point);
      return sum + (Number.isFinite(distance) ? distance : 0);
    }, 0);
  }

  function costingForPath(path, preferredMode = 'automatic') {
    const mode = normalizeMode(preferredMode);
    if (mode === 'driving') return 'auto';
    if (mode === 'walking') return 'pedestrian';
    const activityType = String(path && path.activityType || '').toUpperCase();
    if (/(WALK|FOOT|HIK|RUN)/.test(activityType)) return 'pedestrian';
    if (/(BICYCLE|CYCL|BIKE)/.test(activityType)) return 'bicycle';
    if (/(VEHICLE|CAR|MOTOR|BUS|TAXI|TRAM|TRAIN|SUBWAY|FERRY)/.test(activityType)) return 'auto';
    const durationHours = pathDurationHours(path);
    const travelledMeters = pathDistanceMeters(path);
    if (durationHours && travelledMeters / 1000 / durationHours <= 9) return 'pedestrian';
    const endpoints = Array.isArray(path) && path.length > 1 ? distanceMeters(path[0], path[path.length - 1]) : 0;
    return endpoints <= 1600 && travelledMeters <= 5000 ? 'pedestrian' : 'auto';
  }

  function cleanPoints(path) {
    return (Array.isArray(path) ? path : [])
      .map(point => ({
        latitude: finiteNumber(point && point.latitude),
        longitude: finiteNumber(point && point.longitude),
        time: String(point && point.time || ''),
        routingAnchor: point && point.routingAnchor === true
      }))
      .filter(point => point.latitude != null && point.longitude != null)
      .filter((point, index, points) => !index || distanceMeters(points[index - 1], point) > 2);
  }

  function evenlySelect(points, count) {
    if (points.length <= count) return points;
    const selected = [];
    for (let index = 0; index < count; index += 1) {
      selected.push(points[Math.round(index * (points.length - 1) / (count - 1))]);
    }
    return selected.filter((point, index, candidates) => !index || distanceMeters(candidates[index - 1], point) > 2);
  }

  function selectWithAnchors(points, count) {
    if (points.length <= count) return points;
    const requiredIndexes = points
      .map((point, index) => ({ point, index }))
      .filter(({ point, index }) => index === 0 || index === points.length - 1 || point.routingAnchor)
      .map(({ index }) => index);
    if (requiredIndexes.length >= count) {
      return evenlySelect(requiredIndexes.map(index => points[index]), count);
    }
    const required = new Set(requiredIndexes);
    const optionalIndexes = points
      .map((point, index) => index)
      .filter(index => !required.has(index));
    const selectedOptional = evenlySelect(optionalIndexes, count - requiredIndexes.length);
    return [...requiredIndexes, ...selectedOptional]
      .sort((a, b) => a - b)
      .map(index => points[index]);
  }

  function averageDistanceToPath(source, target) {
    const sourcePoints = cleanPoints(source);
    const targetPoints = cleanPoints(target);
    if (!sourcePoints.length || !targetPoints.length) return Number.POSITIVE_INFINITY;
    return sourcePoints.reduce((sum, point) => {
      const nearest = targetPoints.reduce((best, candidate) => Math.min(best, distanceMeters(point, candidate)), Number.POSITIVE_INFINITY);
      return sum + nearest;
    }, 0) / sourcePoints.length;
  }

  function reversedEndpointsMatch(first, second) {
    const firstPoints = cleanPoints(first);
    const secondPoints = cleanPoints(second);
    if (firstPoints.length < 2 || secondPoints.length < 2) return false;
    const directDistance = distanceMeters(firstPoints[0], firstPoints[firstPoints.length - 1]);
    if (!Number.isFinite(directDistance) || directDistance < 500) return false;
    const endpointTolerance = Math.min(1500, Math.max(250, directDistance * 0.12));
    return distanceMeters(firstPoints[0], secondPoints[secondPoints.length - 1]) <= endpointTolerance
      && distanceMeters(firstPoints[firstPoints.length - 1], secondPoints[0]) <= endpointTolerance;
  }

  function unifyLikelyRoundTrips(sourcePaths, adjustedPaths) {
    const sources = Array.isArray(sourcePaths) ? sourcePaths : [];
    const adjusted = (Array.isArray(adjustedPaths) ? adjustedPaths : []).map(path => ({
      ...path,
      points: (Array.isArray(path && path.points) ? path.points : []).map(point => ({ ...point }))
    }));
    const used = new Set();
    for (let firstIndex = 0; firstIndex < Math.min(sources.length, adjusted.length); firstIndex += 1) {
      if (used.has(firstIndex) || sources[firstIndex].some(point => point.routingAnchor)) continue;
      const firstAdjusted = adjusted[firstIndex];
      if (!firstAdjusted || firstAdjusted.adjusted === false || firstAdjusted.points.length < 2) continue;
      for (let secondIndex = firstIndex + 1; secondIndex < Math.min(sources.length, adjusted.length); secondIndex += 1) {
        if (used.has(secondIndex) || sources[secondIndex].some(point => point.routingAnchor)) continue;
        const secondAdjusted = adjusted[secondIndex];
        if (!secondAdjusted || secondAdjusted.adjusted === false || secondAdjusted.points.length < 2) continue;
        if (String(firstAdjusted.costing || '') !== String(secondAdjusted.costing || '')) continue;
        if (!reversedEndpointsMatch(sources[firstIndex], sources[secondIndex])) continue;

        const firstSource = cleanPoints(sources[firstIndex]);
        const secondSource = cleanPoints(sources[secondIndex]);
        const directDistance = distanceMeters(firstSource[0], firstSource[firstSource.length - 1]);
        const corridorTolerance = Math.min(1400, Math.max(400, directDistance * 0.12));
        const firstCandidate = firstAdjusted.points;
        const secondCandidate = secondAdjusted.points.slice().reverse();
        const firstScore = Math.max(
          averageDistanceToPath(firstSource, firstCandidate),
          averageDistanceToPath(secondSource, firstCandidate.slice().reverse())
        );
        const secondScore = Math.max(
          averageDistanceToPath(firstSource, secondCandidate),
          averageDistanceToPath(secondSource, secondCandidate.slice().reverse())
        );
        const canonical = firstScore <= secondScore ? firstCandidate : secondCandidate;
        if (Math.min(firstScore, secondScore) > corridorTolerance) continue;

        adjusted[firstIndex] = {
          ...firstAdjusted,
          points: canonical.map(point => ({ ...point })),
          sharedRoundTrip: true
        };
        adjusted[secondIndex] = {
          ...secondAdjusted,
          points: canonical.slice().reverse().map(point => ({ ...point })),
          sharedRoundTrip: true
        };
        used.add(firstIndex);
        used.add(secondIndex);
        break;
      }
    }
    return adjusted;
  }

  function waypointsForPath(path, costing, limit = 12) {
    const points = cleanPoints(path);
    if (points.length < 2) return [];
    const safeLimit = Math.max(2, Math.min(16, Number(limit) || 12));
    if (costing === 'pedestrian' || costing === 'bicycle') return selectWithAnchors(points, safeLimit);
    const first = points[0];
    const last = points[points.length - 1];
    if (distanceMeters(first, last) >= 30) return selectWithAnchors(points, safeLimit);
    const farthest = points.slice(1, -1)
      .map(point => ({ point, distance: distanceMeters(first, point) }))
      .sort((a, b) => b.distance - a.distance)[0];
    return farthest && farthest.distance >= 30 ? selectWithAnchors(points, safeLimit) : [];
  }

  root.TimelineRouting = Object.freeze({
    costingForPath,
    distanceMeters,
    averageDistanceToPath,
    normalizeMode,
    pathDistanceMeters,
    unifyLikelyRoundTrips,
    waypointsForPath
  });
})(typeof globalThis !== 'undefined' ? globalThis : self);
