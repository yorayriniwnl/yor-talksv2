export function mark(name: string) {
  try {
    performance?.mark?.(name);
  } catch (e) {
    // no-op
  }
}

export function measure(name: string, startMark: string, endMark: string) {
  try {
    performance?.measure?.(name, startMark, endMark);
  } catch (e) {
    // no-op
  }
}

export function clearMarks(name?: string) {
  try {
    if (name) performance?.clearMarks?.(name);
    else performance?.clearMarks?.();
  } catch (e) {
    // no-op
  }
}

export default { mark, measure, clearMarks };
