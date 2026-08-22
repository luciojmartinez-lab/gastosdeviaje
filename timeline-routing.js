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

  function matchingEndpointOrientation(first, second) {
    const firstPoints = cleanPoints(first);
    const secondPoints = cleanPoints(second);
    if (firstPoints.length < 2 || secondPoints.length < 2) return '';
    const directDistance = distanceMeters(firstPoints[0], firstPoints[firstPoints.length - 1]);
    if (!Number.isFinite(directDistance) || directDistance < 500) return '';
    const endpointTolerance = Math.min(1800, Math.max(300, directDistance * 0.15));
    const reversedError = Math.max(
      distanceMeters(firstPoints[0], secondPoints[secondPoints.length - 1]),
      distanceMeters(firstPoints[firstPoints.length - 1], secondPoints[0])
    );
    const sameError = Math.max(
      distanceMeters(firstPoints[0], secondPoints[0]),
      distanceMeters(firstPoints[firstPoints.length - 1], secondPoints[secondPoints.length - 1])
    );
    if (reversedError > endpointTolerance && sameError > endpointTolerance) return '';
    return reversedError <= sameError ? 'reversed' : 'same';
  }

  function routeCorridorDistance(first, second, orientation = 'reversed') {
    const firstPoints = cleanPoints(first);
    const secondPoints = cleanPoints(second);
    if (firstPoints.length < 2 || secondPoints.length < 2) return Number.POSITIVE_INFINITY;
    const alignedSecond = orientation === 'reversed' ? secondPoints.slice().reverse() : secondPoints;
    return Math.max(
      averageDistanceToPath(firstPoints, alignedSecond),
      averageDistanceToPath(alignedSecond, firstPoints)
    );
  }

  function splitLikelyInternalRoundTrip(path) {
    const points = cleanPoints(path);
    if (points.length < 3) return null;
    const start = points[0];
    const farthest = points.slice(1, -1)
      .map((point, index) => ({ point, index: index + 1, distance: distanceMeters(start, point) }))
      .sort((a, b) => b.distance - a.distance)[0];
    if (!farthest || farthest.distance < 500) return null;
    const closureTolerance = Math.min(1200, Math.max(180, farthest.distance * 0.12));
    if (distanceMeters(start, points[points.length - 1]) > closureTolerance) return null;
    return {
      outbound: points.slice(0, farthest.index + 1),
      inbound: points.slice(farthest.index),
      turnaround: farthest.point,
      excursionDistance: farthest.distance
    };
  }

  function unifyInternalRoundTrip(source, adjustedPath) {
    if (!adjustedPath || adjustedPath.adjusted === false) return null;
    const sourceSplit = splitLikelyInternalRoundTrip(source);
    const adjustedPoints = cleanPoints(adjustedPath.points);
    if (!sourceSplit || adjustedPoints.length < 5) return null;
    const firstAllowed = Math.max(1, Math.floor(adjustedPoints.length * 0.05));
    const lastAllowed = Math.min(adjustedPoints.length - 2, Math.ceil(adjustedPoints.length * 0.95));
    let turnaroundIndex = -1;
    let turnaroundDistance = Number.POSITIVE_INFINITY;
    for (let index = firstAllowed; index <= lastAllowed; index += 1) {
      const distance = distanceMeters(adjustedPoints[index], sourceSplit.turnaround);
      if (distance < turnaroundDistance) {
        turnaroundDistance = distance;
        turnaroundIndex = index;
      }
    }
    if (turnaroundIndex <= 0 || turnaroundIndex >= adjustedPoints.length - 1) return null;
    const outbound = adjustedPoints.slice(0, turnaroundIndex + 1);
    const inbound = adjustedPoints.slice(turnaroundIndex);
    const corridorTolerance = Math.min(1600, Math.max(450, sourceSplit.excursionDistance * 0.14));
    if (routeCorridorDistance(outbound, inbound, 'reversed') > corridorTolerance) return null;
    const inboundReversed = inbound.slice().reverse();
    const outboundScore = Math.max(
      averageDistanceToPath(sourceSplit.outbound, outbound),
      averageDistanceToPath(sourceSplit.inbound, outbound.slice().reverse())
    );
    const inboundScore = Math.max(
      averageDistanceToPath(sourceSplit.outbound, inboundReversed),
      averageDistanceToPath(sourceSplit.inbound, inbound)
    );
    const canonical = outboundScore <= inboundScore ? outbound : inboundReversed;
    return {
      ...adjustedPath,
      points: [
        ...canonical.map(point => ({ ...point })),
        ...canonical.slice(0, -1).reverse().map(point => ({ ...point }))
      ],
      sharedRoundTrip: true,
      internalRoundTrip: true
    };
  }

  function comparableSourcePath(source, adjustedPath) {
    if (!adjustedPath || adjustedPath.internalRoundTrip !== true) return cleanPoints(source);
    const split = splitLikelyInternalRoundTrip(source);
    return split ? split.outbound : cleanPoints(source);
  }

  function comparableAdjustedPath(adjustedPath) {
    const points = cleanPoints(adjustedPath && adjustedPath.points);
    if (!adjustedPath || adjustedPath.internalRoundTrip !== true) return points;
    return points.slice(0, Math.floor(points.length / 2) + 1);
  }

  function adjustedPathWithCanonical(adjustedPath, canonical) {
    const points = canonical.map(point => ({ ...point }));
    if (!adjustedPath || adjustedPath.internalRoundTrip !== true) {
      return { ...adjustedPath, points, sharedRoundTrip: true };
    }
    return {
      ...adjustedPath,
      points: [...points, ...points.slice(0, -1).reverse().map(point => ({ ...point }))],
      sharedRoundTrip: true,
      internalRoundTrip: true
    };
  }

  function sharedRouteRelation(firstNode, secondNode) {
    const sourceOrientation = matchingEndpointOrientation(firstNode.source, secondNode.source);
    const adjustedOrientation = matchingEndpointOrientation(firstNode.candidate, secondNode.candidate);
    const orientation = adjustedOrientation || sourceOrientation;
    if (!orientation) return null;

    const directDistance = Math.max(
      distanceMeters(firstNode.source[0], firstNode.source[firstNode.source.length - 1]),
      distanceMeters(firstNode.candidate[0], firstNode.candidate[firstNode.candidate.length - 1])
    );
    const corridorTolerance = Math.min(1600, Math.max(450, directDistance * 0.14));
    const corridorDistance = routeCorridorDistance(firstNode.candidate, secondNode.candidate, orientation);
    if (corridorDistance > corridorTolerance) return null;
    return { reversed: orientation === 'reversed' };
  }

  function unifyLikelyRoundTrips(sourcePaths, adjustedPaths) {
    const sources = Array.isArray(sourcePaths) ? sourcePaths : [];
    const adjusted = (Array.isArray(adjustedPaths) ? adjustedPaths : []).map(path => ({
      ...path,
      points: (Array.isArray(path && path.points) ? path.points : []).map(point => ({ ...point }))
    }));
    for (let index = 0; index < Math.min(sources.length, adjusted.length); index += 1) {
      if (!Array.isArray(sources[index]) || sources[index].some(point => point.routingAnchor)) continue;
      const internal = unifyInternalRoundTrip(sources[index], adjusted[index]);
      if (!internal) continue;
      adjusted[index] = internal;
    }

    const limit = Math.min(sources.length, adjusted.length);
    const nodes = Array.from({ length: limit }, (_, index) => {
      if (!Array.isArray(sources[index]) || sources[index].some(point => point.routingAnchor)) return null;
      const adjustedPath = adjusted[index];
      if (!adjustedPath || adjustedPath.adjusted === false || adjustedPath.points.length < 2) return null;
      const source = comparableSourcePath(sources[index], adjustedPath);
      const candidate = comparableAdjustedPath(adjustedPath);
      return source.length > 1 && candidate.length > 1 ? { index, source, candidate } : null;
    });
    const graph = Array.from({ length: limit }, () => []);
    for (let firstIndex = 0; firstIndex < limit; firstIndex += 1) {
      const firstNode = nodes[firstIndex];
      if (!firstNode) continue;
      for (let secondIndex = firstIndex + 1; secondIndex < limit; secondIndex += 1) {
        const secondNode = nodes[secondIndex];
        if (!secondNode) continue;
        const relation = sharedRouteRelation(firstNode, secondNode);
        if (!relation) continue;
        graph[firstIndex].push({ index: secondIndex, reversed: relation.reversed });
        graph[secondIndex].push({ index: firstIndex, reversed: relation.reversed });
      }
    }

    const visited = new Set();
    for (let rootIndex = 0; rootIndex < limit; rootIndex += 1) {
      if (!nodes[rootIndex] || visited.has(rootIndex)) continue;
      const orientation = new Map([[rootIndex, false]]);
      const queue = [rootIndex];
      const component = [];
      visited.add(rootIndex);
      while (queue.length) {
        const currentIndex = queue.shift();
        component.push(currentIndex);
        graph[currentIndex].forEach(edge => {
          if (visited.has(edge.index)) return;
          orientation.set(edge.index, orientation.get(currentIndex) !== edge.reversed);
          visited.add(edge.index);
          queue.push(edge.index);
        });
      }
      if (component.length < 2) continue;

      const alignedSources = component.map(index => orientation.get(index)
        ? nodes[index].source.slice().reverse()
        : nodes[index].source);
      const candidates = component.map(index => orientation.get(index)
        ? nodes[index].candidate.slice().reverse()
        : nodes[index].candidate);
      const canonical = candidates
        .map(candidate => ({
          candidate,
          score: Math.max(...alignedSources.map(source => averageDistanceToPath(source, candidate)))
        }))
        .sort((first, second) => first.score - second.score)[0].candidate;

      component.forEach(index => {
        const ownCanonical = orientation.get(index) ? canonical.slice().reverse() : canonical;
        adjusted[index] = adjustedPathWithCanonical(adjusted[index], ownCanonical);
      });
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
    adjustedPathWithCanonical,
    comparableAdjustedPath,
    comparableSourcePath,
    matchingEndpointOrientation,
    normalizeMode,
    pathDistanceMeters,
    routeCorridorDistance,
    sharedRouteRelation,
    splitLikelyInternalRoundTrip,
    unifyInternalRoundTrip,
    unifyLikelyRoundTrips,
    waypointsForPath
  });
})(typeof globalThis !== 'undefined' ? globalThis : self);
