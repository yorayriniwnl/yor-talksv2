type ActivityItem = { id: string; createdAt: string };
type ReadableActivity = ActivityItem & { read: boolean };

export function reconcileNotifications<T extends ReadableActivity>(before: T[], current: T[], incoming: T[]): T[] {
  const previousIds = new Set(before.map((item) => item.id));
  const currentById = new Map(current.map((item) => [item.id, item]));
  const merged = new Map(incoming.map((item) => [item.id, {
    ...item, read: item.read || currentById.get(item.id)?.read === true,
  }]));
  for (const item of current) {
    if (!previousIds.has(item.id) && !merged.has(item.id)) merged.set(item.id, item);
  }
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}

export function reconcileFollowRequests<T extends ActivityItem>(before: T[], current: T[], incoming: T[]): T[] {
  const previousIds = new Set(before.map((item) => item.id));
  const currentIds = new Set(current.map((item) => item.id));
  // An accept/decline may finish while this list request is still in flight.
  return incoming.filter((item) => !previousIds.has(item.id) || currentIds.has(item.id));
}
