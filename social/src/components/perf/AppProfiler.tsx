import React from 'react';
import { sendTelemetry } from '@/lib/telemetry';
import { mark, measure } from '@/lib/perf';

type ProfilerProps = {
  children: React.ReactNode;
};

export function AppProfiler({ children }: ProfilerProps) {
  const onRender: React.ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  ) => {
    try {
      const payload = { id, phase, actualDuration, baseDuration, startTime, commitTime };
      // lightweight perf marks
      const markName = `profiler:${id}:${phase}`;
      mark(markName);
      measure(`measure:${id}:${phase}`, markName, 'profiler:commit');

      sendTelemetry({ type: 'react:profiler', payload });
      // eslint-disable-next-line no-console
      console.debug('[profiler]', id, phase, actualDuration.toFixed(2));
    } catch (e) {
      // swallow
    }
  };

  // mark commit point for measurements
  React.useEffect(() => {
    try {
      mark('profiler:commit');
    } catch (e) {
      // noop
    }
  });

  return <React.Profiler id="App" onRender={onRender}>{children}</React.Profiler>;
}

export default AppProfiler;
