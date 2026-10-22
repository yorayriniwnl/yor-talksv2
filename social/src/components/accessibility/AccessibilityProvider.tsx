import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/api-client';

interface AccessibilityPreferences {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  captions: boolean;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
  captions: true,
};

function readPreferences(payload: Record<string, unknown> = {}): AccessibilityPreferences {
  return {
    largeText: payload.largeText === true,
    highContrast: payload.highContrast === true,
    reducedMotion: payload.reducedMotion === true,
    captions: payload.captions !== false,
  };
}

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => void;
  update: (key: keyof AccessibilityPreferences, value: boolean) => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ userId, enabled, children }: { userId: string | null; enabled: boolean; children: ReactNode }) {
  const [ownerId, setOwnerId] = useState(userId);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(enabled);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const savePending = useRef(false);

  // Reset before paint on logout/account changes without remounting the router.
  // Generation checks also discard completions from the previous session.
  useLayoutEffect(() => {
    generation.current++;
    setOwnerId(userId);
    setPreferences(DEFAULT_PREFERENCES);
    setLoaded(false);
    return () => { generation.current++; };
  }, [userId, enabled]);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    let active = true;
    setLoaded(false);
    setError(null);
    setLoading(enabled);
    setSaving(false);
    savePending.current = false;
    if (!enabled) {
      setPreferences(DEFAULT_PREFERENCES);
      return () => { active = false; generation.current++; };
    }
    api.getCreatorWorkspace('preference')
      .then((items) => {
        if (!active || requestGeneration !== generation.current) return;
        setPreferences(readPreferences(items.find((item) => item.kind === 'preference' && item.itemKey === 'accessibility')?.payload));
        setLoaded(true);
      })
      .catch(() => {
        if (active && requestGeneration === generation.current) setError('Your accessibility settings could not be loaded. Retry before changing them.');
      })
      .finally(() => {
        if (active && requestGeneration === generation.current) setLoading(false);
      });
    return () => { active = false; generation.current++; };
  }, [enabled, revision, userId]);

  const applied = enabled && ownerId === userId ? preferences : DEFAULT_PREFERENCES;
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('yor-accessibility-large-text', applied.largeText);
    document.documentElement.classList.toggle('yor-accessibility-high-contrast', applied.highContrast);
    document.documentElement.classList.toggle('yor-accessibility-reduced-motion', applied.reducedMotion);
    return () => {
      document.documentElement.classList.remove('yor-accessibility-large-text', 'yor-accessibility-high-contrast', 'yor-accessibility-reduced-motion');
    };
  }, [applied.largeText, applied.highContrast, applied.reducedMotion]);

  const reload = useCallback(() => { if (!savePending.current) setRevision((value) => value + 1); }, []);
  const update = async (key: keyof AccessibilityPreferences, value: boolean) => {
    if (!enabled || ownerId !== userId || !loaded || loading) throw new Error('Load your accessibility settings before changing them.');
    if (savePending.current) return;
    savePending.current = true;
    const requestGeneration = generation.current;
    const previous = preferences;
    const next = { ...previous, [key]: value };
    setPreferences(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveCreatorWorkspaceItem({ kind: 'preference', itemKey: 'accessibility', payload: { ...next } });
      if (requestGeneration === generation.current) setPreferences(readPreferences(saved.payload));
    } catch (cause) {
      if (requestGeneration !== generation.current) return;
      setPreferences(previous);
      throw cause;
    } finally {
      if (requestGeneration === generation.current) {
        savePending.current = false;
        setSaving(false);
      }
    }
  };

  return (
    <AccessibilityContext.Provider value={{ preferences: applied, loading: enabled && (ownerId !== userId || loading || !loaded && !error), saving, error, reload, update }}>
      <MotionConfig reducedMotion={applied.reducedMotion ? 'always' : 'user'}>{children}</MotionConfig>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityPreferences() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('Accessibility preferences require AccessibilityProvider');
  return context;
}

export function useAppReducedMotion() {
  const systemPreference = useReducedMotion();
  const context = useContext(AccessibilityContext);
  return Boolean(systemPreference || context?.preferences.reducedMotion);
}
