(function initializeGoogleTimelineImport(root) {
  'use strict';

  const MAX_POINTS_PER_DAY = 1500;
  const OVERNIGHT_START_MINUTE = 3 * 60;
  const OVERNIGHT_END_MINUTE = 6 * 60;
  const OVERNIGHT_STABLE_DISTANCE_METERS = 200;
  const OVERNIGHT_CLUSTER_RADIUS_METERS = 300;
  const PRECISE_LOCATION_ACCURACY_METERS = 30;
  const PRECISE_LOCATION_CLUSTER_METERS = 50;
  const STILL_ACTIVITY_CONFIDENCE = 0.8;
  const STILL_ACTIVITY_MAX_GAP_MS = 5 * 60 * 1000;
  const IMPLAUSIBLE_ACTIVITY_MIN_DURATION_MS = 24 * 60 * 60 * 1000;
  const IMPLAUSIBLE_ACTIVITY_MAX_DIRECT_METERS = 500;
  const IMPLAUSIBLE_ACTIVITY_MAX_SPEED_KMH = 0.5;

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function coordinateFrom(value) {
    if (!value) return null;
    if (typeof value === 'object') {
      if (value.latLng || value.LatLng || value.point) {
        return coordinateFrom(value.latLng || value.LatLng || value.point);
      }
      const latitude = finiteNumber(value.latitude ?? value.lat);
      const longitude = finiteNumber(value.longitude ?? value.lng ?? value.lon);
      if (latitude != null && longitude != null) return validCoordinate(latitude, longitude);
      const latitudeE7 = finiteNumber(value.latitudeE7);
      const longitudeE7 = finiteNumber(value.longitudeE7);
      if (latitudeE7 != null && longitudeE7 != null) return validCoordinate(latitudeE7 / 1e7, longitudeE7 / 1e7);
      return null;
    }
    const match = String(value).match(/(-?\d+(?:\.\d+)?)\s*°?\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*°?/);
    return match ? validCoordinate(Number(match[1]), Number(match[2])) : null;
  }

  function validCoordinate(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  }

  function localDate(timestamp) {
    const match = String(timestamp || '').match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  function localTime(timestamp) {
    const match = String(timestamp || '').match(/T(\d{2}:\d{2})(?::\d{2})?/);
    return match ? match[1] : '';
  }

  function addDays(date, amount) {
    const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(amount || 0)));
    return value.toISOString().slice(0, 10);
  }

  function localKey(timestamp) {
    const match = String(timestamp || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    return match ? `${match[1]}T${match[2]}:${match[3]}` : '';
  }

  function localMinute(timestamp) {
    const match = String(timestamp || '').match(/T(\d{2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function medianCoordinate(points) {
    const latitude = median(points.map(point => Number(point.latitude)));
    const longitude = median(points.map(point => Number(point.longitude)));
    return latitude == null || longitude == null ? null : validCoordinate(latitude, longitude);
  }

  function dateInRange(date, startDate, endDate) {
    return Boolean(date && date >= startDate && date <= endDate);
  }

  function distanceMeters(a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    const radians = value => value * Math.PI / 180;
    const latitude1 = radians(a.latitude);
    const latitude2 = radians(b.latitude);
    const deltaLatitude = latitude2 - latitude1;
    const deltaLongitude = radians(b.longitude - a.longitude);
    const h = Math.sin(deltaLatitude / 2) ** 2
      + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function cleanPoint(point) {
    return {
      latitude: Number(point.latitude.toFixed(6)),
      longitude: Number(point.longitude.toFixed(6)),
      time: point.time || '',
      kind: point.kind || 'path',
      activityType: point.activityType || ''
    };
  }

  function isImplausibleStationaryActivity(activity, startTime, endTime, start, end) {
    const startMs = Date.parse(startTime);
    const endMs = Date.parse(endTime);
    const durationMs = endMs - startMs;
    if (!Number.isFinite(durationMs) || durationMs < IMPLAUSIBLE_ACTIVITY_MIN_DURATION_MS) return false;
    const directMeters = start && end ? distanceMeters(start, end) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(directMeters) || directMeters > IMPLAUSIBLE_ACTIVITY_MAX_DIRECT_METERS) return false;
    const declaredMeters = finiteNumber(activity && activity.distanceMeters);
    const measuredMeters = declaredMeters == null ? directMeters : Math.max(directMeters, declaredMeters);
    const averageSpeedKmh = measuredMeters / 1000 / (durationMs / 3600000);
    return averageSpeedKmh <= IMPLAUSIBLE_ACTIVITY_MAX_SPEED_KMH;
  }

  function compactPoints(points) {
    const sorted = points
      .filter(point => validCoordinate(point.latitude, point.longitude) && point.time)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    const seen = new Set();
    const unique = [];
    sorted.forEach(point => {
      const key = `${point.time}|${Number(point.latitude).toFixed(6)}|${Number(point.longitude).toFixed(6)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const previous = unique[unique.length - 1];
      const nearPrevious = previous && distanceMeters(previous, point) < 3;
      const elapsed = previous ? Math.abs(Date.parse(point.time) - Date.parse(previous.time)) : Number.POSITIVE_INFINITY;
      if (nearPrevious && Number.isFinite(elapsed) && elapsed < 120000) return;
      unique.push(cleanPoint(point));
    });
    if (unique.length <= MAX_POINTS_PER_DAY) return unique;
    const sampled = [unique[0]];
    const step = (unique.length - 1) / (MAX_POINTS_PER_DAY - 1);
    for (let index = 1; index < MAX_POINTS_PER_DAY - 1; index += 1) {
      sampled.push(unique[Math.round(index * step)]);
    }
    sampled.push(unique[unique.length - 1]);
    return sampled;
  }

  function visitCovering(visits, targetKey) {
    return visits
      .filter(visit => visit.startKey && visit.endKey && visit.startKey <= targetKey && visit.endKey >= targetKey)
      .sort((a, b) => (Date.parse(b.endTime) - Date.parse(b.startTime)) - (Date.parse(a.endTime) - Date.parse(a.startTime)))[0] || null;
  }

  function coordinateNearLocalTime(date, minute, sourcePoints, visits) {
    const targetKey = `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    const coveringVisit = visitCovering(visits, targetKey);
    if (coveringVisit) return { ...coveringVisit.coordinate, time: `${targetKey}:00`, source: 'visit' };
    const candidate = sourcePoints
      .filter(point => localDate(point.time) === date && localMinute(point.time) != null)
      .map(point => ({ point, difference: Math.abs(localMinute(point.time) - minute) }))
      .filter(candidatePoint => candidatePoint.difference <= 120)
      .sort((a, b) => a.difference - b.difference)[0];
    return candidate ? { latitude: candidate.point.latitude, longitude: candidate.point.longitude, time: candidate.point.time, source: 'point' } : null;
  }

  function nearestStillConfidence(time, rawActivities) {
    const timestamp = Date.parse(time);
    if (!Number.isFinite(timestamp)) return 0;
    let low = 0;
    let high = rawActivities.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rawActivities[middle].timestamp < timestamp) low = middle + 1;
      else high = middle;
    }
    const nearest = [rawActivities[low - 1], rawActivities[low]]
      .filter(Boolean)
      .map(activity => ({ activity, gap: Math.abs(activity.timestamp - timestamp) }))
      .sort((a, b) => a.gap - b.gap)[0];
    return nearest && nearest.gap <= STILL_ACTIVITY_MAX_GAP_MS ? nearest.activity.stillConfidence : 0;
  }

  function precisePositionCluster(points) {
    const clusters = [];
    points.forEach(point => {
      const cluster = clusters.find(candidate => candidate.some(member => distanceMeters(member, point) <= PRECISE_LOCATION_CLUSTER_METERS));
      if (cluster) cluster.push(point);
      else clusters.push([point]);
    });
    const selected = clusters.sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      const accuracyA = Math.min(...a.map(point => point.accuracyMeters));
      const accuracyB = Math.min(...b.map(point => point.accuracyMeters));
      return accuracyA - accuracyB;
    })[0];
    return selected
      ? selected.slice().sort((a, b) => a.accuracyMeters - b.accuracyMeters || String(a.time).localeCompare(String(b.time)))[0]
      : null;
  }

  function preciseStationaryPositionDuringRest(date, rawPositions, rawActivities, sourceActivities) {
    const previousDate = addDays(date, -1);
    const anchorKey = `${date}T03:00`;
    const dayEndKey = `${date}T23:59`;
    const firstMovement = sourceActivities
      .filter(activity => activity.startKey >= anchorKey && activity.startKey <= dayEndKey)
      .sort((a, b) => a.startKey.localeCompare(b.startKey))[0] || null;
    const restEndKey = firstMovement ? firstMovement.startKey : dayEndKey;
    const lastMovement = sourceActivities
      .filter(activity => activity.endKey >= `${previousDate}T12:00` && activity.endKey <= restEndKey)
      .sort((a, b) => b.endKey.localeCompare(a.endKey))[0] || null;
    const restStartKey = lastMovement ? lastMovement.endKey : `${previousDate}T18:00`;
    const candidates = rawPositions
      .filter(point => {
        const key = localKey(point.time);
        return key && key >= restStartKey && key <= restEndKey;
      })
      .filter(point => point.accuracyMeters <= PRECISE_LOCATION_ACCURACY_METERS)
      .filter(point => nearestStillConfidence(point.time, rawActivities) >= STILL_ACTIVITY_CONFIDENCE)
      .filter(point => !sourceActivities.some(activity => {
        const key = localKey(point.time);
        return key >= activity.startKey && key <= activity.endKey;
      }));
    return precisePositionCluster(candidates);
  }

  function overnightTransition(date, sourcePoints, visits, rawPositions, rawActivities, sourceActivities) {
    const firstPrecise = preciseStationaryPositionDuringRest(date, rawPositions, rawActivities, sourceActivities);
    if (firstPrecise) {
      return {
        point: firstPrecise,
        mode: 'precise',
        radiusMeters: Math.round(firstPrecise.accuracyMeters)
      };
    }
    const startKey = `${date}T03:00`;
    const endKey = `${date}T06:00`;
    const stableVisit = visits.find(visit => visit.startKey <= startKey && visit.endKey >= endKey);
    if (stableVisit) {
      return {
        point: stableVisit.coordinate,
        mode: 'stable',
        radiusMeters: 0
      };
    }
    const start = coordinateNearLocalTime(date, OVERNIGHT_START_MINUTE, sourcePoints, visits);
    const end = coordinateNearLocalTime(date, OVERNIGHT_END_MINUTE, sourcePoints, visits);
    const windowPoints = sourcePoints.filter(point => {
      if (localDate(point.time) !== date) return false;
      const minute = localMinute(point.time);
      return minute != null && minute >= OVERNIGHT_START_MINUTE && minute <= OVERNIGHT_END_MINUTE;
    });
    if (start) windowPoints.push(start);
    if (end) windowPoints.push(end);
    const center = medianCoordinate(windowPoints);
    const radiusMeters = center && windowPoints.length
      ? Math.max(...windowPoints.map(point => distanceMeters(center, point)))
      : Number.POSITIVE_INFINITY;
    if (start && end
      && distanceMeters(start, end) <= OVERNIGHT_STABLE_DISTANCE_METERS
      && radiusMeters <= OVERNIGHT_CLUSTER_RADIUS_METERS) {
      return { point: center || start, mode: 'stable', radiusMeters: Math.round(radiusMeters) };
    }
    if (start && end) {
      const midnight = coordinateNearLocalTime(date, 0, sourcePoints, visits);
      if (midnight) return { point: midnight, mode: 'transit', radiusMeters: Math.round(radiusMeters) };
    }
    return null;
  }

  function applyAnchor(fallback, anchor, fallbackTime) {
    if (!anchor || !anchor.point) return fallback || null;
    return cleanPoint({
      latitude: anchor.point.latitude,
      longitude: anchor.point.longitude,
      time: anchor.mode === 'transit'
        ? anchor.point.time || fallbackTime
        : fallbackTime || fallback && fallback.time || anchor.point.time,
      kind: anchor.mode === 'precise'
        ? 'overnight-precise'
        : anchor.mode === 'stable'
        ? 'overnight'
        : 'overnight-transit',
      activityType: ''
    });
  }

  function importTrip(data, options = {}) {
    if (!data || !Array.isArray(data.semanticSegments)) {
      throw new Error('El archivo no parece una exportación válida de la Cronología de Maps.');
    }
    const startDate = localDate(options.startDate);
    const endDate = localDate(options.endDate) || startDate;
    if (!startDate || !endDate || endDate < startDate) {
      throw new Error('El viaje necesita fechas de inicio y final válidas antes de importar la Cronología de Maps.');
    }
    const extendedStartDate = addDays(startDate, -1);
    const extendedEndDate = addDays(endDate, 1);
    const extendedStartKey = `${extendedStartDate}T00:00`;
    const extendedEndKey = `${extendedEndDate}T23:59`;
    const sourcePoints = [];
    const sourceVisits = [];
    const rawPositions = [];
    const rawActivities = [];
    const sourceActivities = [];
    const byDay = new Map();
    const day = date => {
      if (!byDay.has(date)) byDay.set(date, { fecha: date, points: [], visits: [], activities: [] });
      return byDay.get(date);
    };
    const addPoint = (timestamp, coordinate, kind, activityType = '') => {
      const date = localDate(timestamp);
      if (!coordinate || !date) return;
      const point = { ...coordinate, time: timestamp, kind, activityType };
      if (dateInRange(date, extendedStartDate, extendedEndDate)) sourcePoints.push(point);
      if (dateInRange(date, startDate, endDate)) day(date).points.push(point);
    };

    (Array.isArray(data.rawSignals) ? data.rawSignals : []).forEach(signal => {
      const position = signal && signal.position;
      const time = String(position && position.timestamp || '');
      const coordinate = coordinateFrom(position);
      const accuracyMeters = finiteNumber(position && position.accuracyMeters);
      const date = localDate(time);
      if (!coordinate || accuracyMeters == null || !dateInRange(date, extendedStartDate, extendedEndDate)) return;
      rawPositions.push({
        ...coordinate,
        time,
        accuracyMeters,
        source: String(position.source || '')
      });
    });

    (Array.isArray(data.rawSignals) ? data.rawSignals : []).forEach(signal => {
      const activity = signal && signal.activityRecord;
      const time = String(activity && activity.timestamp || '');
      const timestamp = Date.parse(time);
      if (!Number.isFinite(timestamp) || !dateInRange(localDate(time), extendedStartDate, extendedEndDate)) return;
      const still = (Array.isArray(activity.probableActivities) ? activity.probableActivities : [])
        .find(candidate => String(candidate && (candidate.type || candidate.activityType) || '').toUpperCase() === 'STILL');
      const confidenceValue = finiteNumber(still && (still.confidence ?? still.probability));
      const stillConfidence = confidenceValue == null ? 0 : (confidenceValue > 1 ? confidenceValue / 100 : confidenceValue);
      rawActivities.push({ time, timestamp, stillConfidence });
    });
    rawActivities.sort((a, b) => a.timestamp - b.timestamp);

    data.semanticSegments.forEach(segment => {
      const startTime = String(segment && segment.startTime || '');
      const endTime = String(segment && segment.endTime || startTime);
      if (Array.isArray(segment && segment.timelinePath)) {
        segment.timelinePath.forEach(item => {
          addPoint(item && item.time || startTime, coordinateFrom(item && item.point), 'path');
        });
      }
      if (segment && segment.visit) {
        const candidate = segment.visit.topCandidate || {};
        const coordinate = coordinateFrom(candidate.placeLocation);
        const placeName = String(candidate.placeName || candidate.name || candidate.displayName || candidate.title || segment.visit.placeName || '').trim();
        addPoint(startTime, coordinate, 'visit');
        addPoint(endTime, coordinate, 'visit');
        const startKey = localKey(startTime);
        const endKey = localKey(endTime);
        if (coordinate && startKey && endKey && endKey >= extendedStartKey && startKey <= extendedEndKey) {
          sourceVisits.push({ coordinate, startTime, endTime, startKey, endKey, placeName });
        }
        const date = localDate(startTime);
        if (coordinate && dateInRange(date, startDate, endDate)) {
          day(date).visits.push({
            latitude: Number(coordinate.latitude.toFixed(6)),
            longitude: Number(coordinate.longitude.toFixed(6)),
            startTime,
            endTime,
            semanticType: String(candidate.semanticType || ''),
            placeName,
            probability: finiteNumber(candidate.probability ?? segment.visit.probability)
          });
        }
      }
      if (segment && segment.activity) {
        const activityType = String(segment.activity.topCandidate && segment.activity.topCandidate.type || '');
        const start = coordinateFrom(segment.activity.start);
        const end = coordinateFrom(segment.activity.end);
        const implausibleStationaryActivity = isImplausibleStationaryActivity(
          segment.activity,
          startTime,
          endTime,
          start,
          end
        );
        if (implausibleStationaryActivity) return;
        const startKey = localKey(startTime);
        const endKey = localKey(endTime);
        if (startKey && endKey && endKey >= extendedStartKey && startKey <= extendedEndKey) {
          sourceActivities.push({ startTime, endTime, startKey, endKey });
        }
        addPoint(startTime, start, 'activity', activityType);
        addPoint(endTime, end, 'activity', activityType);
        const date = localDate(startTime);
        if ((start || end) && dateInRange(date, startDate, endDate)) {
          day(date).activities.push({
            start: start ? cleanPoint({ ...start, time: startTime, kind: 'activity', activityType }) : null,
            end: end ? cleanPoint({ ...end, time: endTime, kind: 'activity', activityType }) : null,
            startTime,
            endTime,
            activityType,
            distanceMeters: finiteNumber(segment.activity.distanceMeters),
            probability: finiteNumber((segment.activity.topCandidate && segment.activity.topCandidate.probability) ?? segment.activity.probability)
          });
        }
      }
    });

    for (let date = startDate; date && date <= addDays(endDate, 1); date = addDays(date, 1)) {
      const transition = overnightTransition(date, sourcePoints, sourceVisits, rawPositions, rawActivities, sourceActivities);
      if (!transition) continue;
      if (dateInRange(date, startDate, endDate)) {
        const current = day(date);
        current.departureAnchor = transition;
        current.departureMode = transition.mode;
      }
      const previousDate = addDays(date, -1);
      if (dateInRange(previousDate, startDate, endDate)) {
        const previous = day(previousDate);
        previous.arrivalAnchor = transition;
        previous.arrivalMode = transition.mode;
      }
    }

    const days = [...byDay.values()].map(record => {
      const points = compactPoints(record.points);
      const activities = record.activities.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
      const departureActivity = activities.find(activity => activity.start);
      const arrivalActivity = activities.slice().reverse().find(activity => activity.end);
      const fallbackDeparture = departureActivity && departureActivity.start || points[0] || null;
      const fallbackArrival = arrivalActivity && arrivalActivity.end || points[points.length - 1] || null;
      const departure = applyAnchor(fallbackDeparture, record.departureAnchor, `${record.fecha}T03:00:00`);
      const arrival = applyAnchor(fallbackArrival, record.arrivalAnchor, `${record.fecha}T23:59:00`);
      return {
        fecha: record.fecha,
        points,
        visits: record.visits,
        activities: record.activities,
        departure,
        arrival,
        departureMode: record.departureMode || 'activity',
        arrivalMode: record.arrivalMode || 'activity'
      };
    }).filter(record => record.points.length || record.visits.length || record.activities.length)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      format: 'google-maps-timeline',
      range: { startDate, endDate },
      days,
      summary: {
        dayCount: days.length,
        pointCount: days.reduce((sum, record) => sum + record.points.length, 0),
        visitCount: days.reduce((sum, record) => sum + record.visits.length, 0),
        activityCount: days.reduce((sum, record) => sum + record.activities.length, 0),
        firstDate: days[0] ? days[0].fecha : '',
        lastDate: days.length ? days[days.length - 1].fecha : ''
      }
    };
  }

  root.GoogleTimelineImport = Object.freeze({ coordinateFrom, distanceMeters, importTrip, localDate, localTime });
})(typeof globalThis !== 'undefined' ? globalThis : self);
