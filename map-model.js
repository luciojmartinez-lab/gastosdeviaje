(function initializeTripMapModel(root) {
  'use strict';

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function locationKey(record, index, precision = 4) {
    const cityId = Number(record && (record.cityId ?? record.ciudadId));
    if (cityId) return `city-${cityId}`;
    const latitude = finiteNumber(record && (record.latitude ?? record.lat));
    const longitude = finiteNumber(record && (record.longitude ?? record.lng));
    if (latitude != null && longitude != null) {
      return `point-${latitude.toFixed(precision)}-${longitude.toFixed(precision)}`;
    }
    return `record-${index}`;
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function createDaily(records = [], options = {}) {
    const getCityName = options.getCityName || (record => record.cityName || record.descripcion || 'Punto');
    const getTime = options.getTime || (record => record.hora || '--:--');
    const usableRecords = records.filter(Boolean);
    const route = [];
    const cityKeys = new Set();
    let previousKey = '';

    usableRecords.forEach((record, index) => {
      const key = locationKey(record, index);
      cityKeys.add(key);
      if (key === previousKey) {
        if (record.kind === 'city') route[route.length - 1] = record;
        return;
      }
      route.push(record);
      previousKey = key;
    });
    const visibleRoute = cityKeys.size > 1 ? route : [];
    const hasRoute = visibleRoute.length > 1;
    const cityMarkers = usableRecords.filter(record => record.kind === 'city');
    const routeMarkers = cityMarkers.length
      ? cityMarkers
      : (visibleRoute.length ? visibleRoute : usableRecords.filter(record => record.kind !== 'photo'));

    const photoGroups = new Map();
    usableRecords.filter(record => record.kind === 'photo').forEach((record, index) => {
      const cityId = Number(record.ciudadId);
      const key = cityId ? `city-${cityId}` : `${locationKey(record, index)}-${index}`;
      if (!photoGroups.has(key)) photoGroups.set(key, []);
      photoGroups.get(key).push(record);
    });

    const marker = record => ({
      record,
      numberText: record.kind === 'point' ? '•' : '+',
      labelLines: hasRoute ? [getCityName(record), getTime(record)] : [getTime(record)]
    });
    const destinationMarkers = cityMarkers
      .map(record => ({ record, routeNumber: finiteNumber(record.routeNumber) }))
      .filter(markerModel => markerModel.routeNumber > 0)
      .map(markerModel => ({
        record: markerModel.record,
        numberText: String(markerModel.routeNumber)
      }));

    return {
      records: usableRecords,
      route: visibleRoute,
      hasRoute,
      routeMarkers,
      markers: routeMarkers.map(marker),
      destinationMarkers,
      recordMarkers: usableRecords.map(marker),
      exactPoints: usableRecords.filter(record => record.kind === 'point'),
      photoGroups: [...photoGroups.values()].map(group => ({
        records: group,
        count: group.length,
        latitude: group.reduce((sum, record) => sum + Number(record.latitude), 0) / group.length,
        longitude: group.reduce((sum, record) => sum + Number(record.longitude), 0) / group.length
      }))
    };
  }

  function createTrip(stops = [], options = {}) {
    const getName = options.getName || (stop => stop.name || (stop.city && stop.city.nombre) || 'Punto');
    const formatDate = options.formatDate || (value => String(value || ''));
    const normalized = stops.filter(Boolean).map((stop, index) => ({
      ...stop,
      _mapIndex: index,
      number: stop.number == null ? index + 1 : stop.number,
      route: stop.route !== false
    }));
    const routeStops = normalized.filter(stop => stop.route);
    const groups = new Map();
    normalized.forEach((stop, index) => {
      const key = stop.route ? `route-${locationKey(stop, index, 5)}` : `item-${index}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(stop);
    });
    const markerGroups = [...groups.values()].map(entries => {
      const primary = entries[0];
      const routeEntries = entries.filter(entry => entry.route);
      const dates = unique(routeEntries.map(entry => entry.arrivalDate).map(formatDate));
      return {
        entries,
        primary,
        routeEntries,
        numberText: routeEntries.map(entry => entry.number).join('-'),
        labelLines: [getName(primary), ...dates]
      };
    });
    return { stops: normalized, routeStops, markerGroups };
  }

  function createOverviewPrintLayout(options = {}) {
    const sourceWidth = Math.max(1, finiteNumber(options.sourceWidth) || 920);
    const sourceHeight = Math.max(1, finiteNumber(options.sourceHeight) || 564);
    const mapTop = Math.max(0, finiteNumber(options.mapTop) || 0);
    const mapHeight = Math.max(1, finiteNumber(options.mapHeight) || 460);
    return {
      frameAspectRatio: `${sourceWidth} / ${mapHeight}`,
      imageOffsetPercent: Math.min(100, (mapTop / sourceHeight) * 100),
      mapTop,
      mapHeight,
      sourceWidth,
      sourceHeight
    };
  }

  root.TripMapModel = Object.freeze({ createDaily, createTrip, createOverviewPrintLayout, locationKey });
})(typeof globalThis !== 'undefined' ? globalThis : window);
