(function initializeGoogleTimelineImport(root) {
  'use strict';

  const MAX_POINTS_PER_DAY = 1500;

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

  function importTrip(data, options = {}) {
    if (!data || !Array.isArray(data.semanticSegments)) {
      throw new Error('El archivo no parece una exportación válida de la Cronología de Google Maps.');
    }
    const startDate = localDate(options.startDate);
    const endDate = localDate(options.endDate) || startDate;
    if (!startDate || !endDate || endDate < startDate) {
      throw new Error('El viaje necesita fechas de inicio y final válidas antes de importar la Cronología.');
    }
    const byDay = new Map();
    const day = date => {
      if (!byDay.has(date)) byDay.set(date, { fecha: date, points: [], visits: [], activities: [] });
      return byDay.get(date);
    };
    const addPoint = (timestamp, coordinate, kind, activityType = '') => {
      const date = localDate(timestamp);
      if (!coordinate || !dateInRange(date, startDate, endDate)) return;
      day(date).points.push({ ...coordinate, time: timestamp, kind, activityType });
    };

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
        addPoint(startTime, coordinate, 'visit');
        addPoint(endTime, coordinate, 'visit');
        const date = localDate(startTime);
        if (coordinate && dateInRange(date, startDate, endDate)) {
          day(date).visits.push({
            latitude: Number(coordinate.latitude.toFixed(6)),
            longitude: Number(coordinate.longitude.toFixed(6)),
            startTime,
            endTime,
            semanticType: String(candidate.semanticType || ''),
            probability: finiteNumber(candidate.probability ?? segment.visit.probability)
          });
        }
      }
      if (segment && segment.activity) {
        const activityType = String(segment.activity.topCandidate && segment.activity.topCandidate.type || '');
        const start = coordinateFrom(segment.activity.start);
        const end = coordinateFrom(segment.activity.end);
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

    const days = [...byDay.values()].map(record => {
      const points = compactPoints(record.points);
      const activities = record.activities.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
      const departureActivity = activities.find(activity => activity.start);
      const arrivalActivity = activities.slice().reverse().find(activity => activity.end);
      const departure = departureActivity && departureActivity.start || points[0] || null;
      const arrival = arrivalActivity && arrivalActivity.end || points[points.length - 1] || null;
      return {
        fecha: record.fecha,
        points,
        visits: record.visits,
        activities: record.activities,
        departure,
        arrival
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
