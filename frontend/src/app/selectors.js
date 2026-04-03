export function selectResolvedValidations(validations = []) {
  return validations.filter((v) => v.status === 'CORRECT' || v.status === 'INCORRECT');
}

export function selectValidationAccuracy(validations = []) {
  const resolved = selectResolvedValidations(validations);
  const correct = resolved.filter((v) => v.status === 'CORRECT').length;
  return {
    resolvedCount: resolved.length,
    correctCount: correct,
    accuracyPct: resolved.length ? Math.round((correct / resolved.length) * 100) : 0,
  };
}

export function selectEventsLast24h(events = []) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return events.filter((evt) => {
    const t = Date.parse(evt.timestamp || evt.ingested_at || evt.created_at || '');
    return Number.isFinite(t) && t >= cutoff;
  }).length;
}

export function selectRecentEvents(events = [], limit = 20) {
  return events.slice(0, limit);
}

export function selectEventTimestampMs(event) {
  const ts = Date.parse(event?.timestamp || event?.ingested_at || event?.created_at || '');
  return Number.isFinite(ts) ? ts : null;
}

export function selectEventTimeAgo(event) {
  const ts = selectEventTimestampMs(event);
  if (!ts) {
    return 'Unknown time';
  }
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toSignedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function selectPredictionRows(events = []) {
  const rows = [];
  events.forEach((evt) => {
    const assets = Array.isArray(evt.affected_assets) ? evt.affected_assets : [];
    assets.forEach((asset, idx) => {
      rows.push({
        id: `${evt.event_id || 'event'}-${asset.ticker || idx}`,
        eventId: evt.event_id,
        headline: evt.headline || 'Untitled event',
        asset: asset.ticker || 'N/A',
        sector: asset.sector || 'Uncategorized',
        prediction: asset.prediction || 'NEUTRAL',
        confidence: Math.round(Number(asset.confidence || 0) * 100),
        status: asset.validation_status ? 'VALIDATED' : 'ACTIVE',
        validationStatus: asset.validation_status || null,
        severity: evt.severity || 'MEDIUM',
        timeLabel: asset.validation_status ? 'Validated' : 'Pending',
        pnl: toSignedPercent(asset.actual_move_24h ?? asset.actual_move_pct),
      });
    });
  });
  return rows;
}

export function selectTrendingTopics(events = []) {
  const byTopic = new Map();
  const now = Date.now();
  const recentCutoff = now - 24 * 60 * 60 * 1000;

  events.forEach((evt) => {
    const label = evt.event_type || evt.market_pressure || 'Unknown';
    const regionList = Array.isArray(evt.regions)
      ? evt.regions
      : evt.region
        ? [evt.region]
        : [];
    const row = byTopic.get(label) || {
      label,
      category: evt.market_pressure || 'General',
      events: 0,
      recent: 0,
      older: 0,
      confidenceSum: 0,
      severity: 'MEDIUM',
      regions: new Set(),
      description: evt.headline || 'No description available',
    };

    row.events += 1;
    row.confidenceSum += Number(evt.confidence || 0);
    if ((selectEventTimestampMs(evt) || 0) >= recentCutoff) {
      row.recent += 1;
    } else {
      row.older += 1;
    }
    regionList.forEach((r) => row.regions.add(String(r).toUpperCase()));
    if (evt.severity === 'CRITICAL') row.severity = 'CRITICAL';
    else if (evt.severity === 'HIGH' && row.severity !== 'CRITICAL') row.severity = 'HIGH';

    byTopic.set(label, row);
  });

  return Array.from(byTopic.values())
    .sort((a, b) => b.events - a.events || b.confidenceSum - a.confidenceSum)
    .map((topic) => {
      const baseline = Math.max(1, topic.older);
      const delta = Math.round(((topic.recent - baseline) / baseline) * 100);
      return {
        ...topic,
        change: `${delta >= 0 ? '+' : ''}${delta}%`,
        regions: Array.from(topic.regions).slice(0, 3),
      };
    });
}

export function selectInterestRows(events = [], validations = []) {
  const sectorMap = new Map();
  const tickerToSector = new Map();

  events.forEach((evt) => {
    const assets = Array.isArray(evt.affected_assets) ? evt.affected_assets : [];
    assets.forEach((asset) => {
      const sector = asset.sector || 'Uncategorized';
      const ticker = asset.ticker || null;
      const row = sectorMap.get(sector) || {
        tag: sector,
        events: 0,
        predictions: 0,
        resolved: 0,
        correct: 0,
      };
      row.events += 1;
      if (!asset.validation_status) {
        row.predictions += 1;
      }
      if (asset.validation_status === 'CORRECT' || asset.validation_status === 'INCORRECT') {
        row.resolved += 1;
        if (asset.validation_status === 'CORRECT') {
          row.correct += 1;
        }
      }
      sectorMap.set(sector, row);
      if (ticker) {
        tickerToSector.set(ticker, sector);
      }
    });
  });

  validations.forEach((v) => {
    const ticker = v.predicted_ticker;
    const sector = tickerToSector.get(ticker);
    if (!sector) return;
    if (v.status !== 'CORRECT' && v.status !== 'INCORRECT') return;
    const row = sectorMap.get(sector);
    if (!row) return;
    row.resolved += 1;
    if (v.status === 'CORRECT') row.correct += 1;
  });

  const rows = Array.from(sectorMap.values()).sort((a, b) => b.events - a.events);
  const maxEvents = Math.max(...rows.map((r) => r.events), 1);
  return rows.slice(0, 8).map((row, idx) => ({
    ...row,
    weight: Math.round((row.events / maxEvents) * 100),
    notifications: idx % 2 === 0,
    accuracy: row.resolved ? Math.round((row.correct / row.resolved) * 100) : 0,
  }));
}

export function selectDashboardStats(events = [], validations = []) {
  const predictionRows = selectPredictionRows(events);
  const activePredictionRows = predictionRows.filter((p) => p.status === 'ACTIVE');
  const resolvedValidations = selectResolvedValidations(validations);
  const correctCount = resolvedValidations.filter((v) => v.status === 'CORRECT').length;
  const avgMove = resolvedValidations.length
    ? resolvedValidations.reduce((sum, v) => sum + Number(v.actual_change_percent || 0), 0) / resolvedValidations.length
    : 0;

  return {
    predictionRows,
    activePredictionRows,
    stats: {
      totalEvents: events.length,
      predictionsAccuracy: resolvedValidations.length ? Math.round((correctCount / resolvedValidations.length) * 100) : 0,
      activePredictions: activePredictionRows.length,
      highSeverityAlerts: events.filter((evt) => evt.severity === 'HIGH' || evt.severity === 'CRITICAL').length,
      portfolioChange: `${avgMove >= 0 ? '+' : ''}${avgMove.toFixed(1)}%`,
      weeklyPredictions: predictionRows.length,
      successRate: `${correctCount}/${resolvedValidations.length || 0}`,
    },
  };
}

export function selectRecentActivity(events = [], limit = 5) {
  return events.slice(0, limit).map((evt) => ({
    id: evt.event_id,
    title: evt.headline || 'Untitled event',
    type: evt.severity === 'CRITICAL' || evt.severity === 'HIGH' ? 'alert' : 'info',
    time: selectEventTimeAgo(evt),
    detail: `${evt.event_type || 'General'} • ${Math.round(Number(evt.confidence || 0) * 100)}%`,
  }));
}
