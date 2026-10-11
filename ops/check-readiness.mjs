export function assertReadiness(report, { syntheticProviders = false } = {}) {
  if (report?.status !== 'healthy') throw new Error('API readiness must be healthy');
  for (const service of ['database', 'redis', 'worker', 'lifecycle']) {
    if (report.services?.[service] !== 'up') throw new Error(`${service} must be up`);
  }
  if (report.details?.lifecycle?.ready !== true) throw new Error('Lifecycle progress is a required release gate');
  if (report.details?.media?.decoder !== true) throw new Error('Media decoder readiness is a required release gate');
  if (syntheticProviders) {
    if (report.details.media.ready !== false) throw new Error('Synthetic CI smoke must explicitly report unavailable providers');
  } else if (report.details.media.ready !== true) {
    throw new Error('Core media provider readiness is a required release gate');
  }
}
