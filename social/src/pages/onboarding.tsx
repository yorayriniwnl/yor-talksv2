import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Loader2,
  MapPinned,
  Network,
  Radio,
  UserPlus,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

import { WorldPreferencesForm } from '@/components/worlds/WorldPreferencesForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, type BackendUser } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { type WorldPreferences } from '@/lib/world-preferences';
import '@/styles/operator-access.css';

const INTERESTS = [
  'Artificial Intelligence',
  'Web3',
  'Startups',
  'Venture Capital',
  'Design',
  'Engineering',
  'Gaming',
  'Productivity',
  'Investing',
  'Crypto',
  'SaaS',
  'Creator Economy',
];

const STEPS = [
  { number: '01', label: 'Locale', icon: MapPinned },
  { number: '02', label: 'Signal', icon: Radio },
  { number: '03', label: 'Network', icon: Network },
] as const;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const savedWorldPreferences = useAppStore((state) => state.worldPreferences);
  const [step, setStep] = useState(0);
  const [worldDraft, setWorldDraft] = useState<WorldPreferences>(savedWorldPreferences);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<BackendUser[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingCreators(true);
    void api.searchUsers('')
      .then((users) => {
        if (!active) return;
        setSuggestedCreators(users.filter((user) => user.id !== currentUser?.id).slice(0, 4));
      })
      .catch(() => {
        if (active) setSuggestedCreators([]);
      })
      .finally(() => {
        if (active) setLoadingCreators(false);
      });
    return () => { active = false; };
  }, [currentUser?.id]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const toggleFollow = (id: string) => {
    setFollowedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const finishOnboarding = async () => {
    if (!currentUser || submitting) return;
    setSubmitting(true);
    try {
      await api.saveCreatorWorkspaceItem({
        kind: 'preference',
        itemKey: 'world',
        payload: worldDraft as unknown as Record<string, unknown>,
      });
      await api.completeOnboarding({ interests: selectedInterests, followedCreatorIds: followedIds });

      useAppStore.setState((state) => {
        if (!state.currentUser) return { worldPreferences: worldDraft };
        const updatedUser = { ...state.currentUser, onboardingCompleted: true };
        return {
          currentUser: updatedUser,
          worldPreferences: worldDraft,
          users: {
            ...state.users,
            [updatedUser.id]: { ...(state.users[updatedUser.id] ?? updatedUser), onboardingCompleted: true },
          },
        };
      });
      toast.success('Setup complete. Your signal is ready.');
      setLocation('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setup could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="operator-onboarding-shell">
      <header className="operator-onboarding-topbar">
        <div className="operator-access-brand">
          <span className="operator-access-brand__mark" aria-hidden="true">Y</span>
          <span><strong>Yor Talks</strong><small>Initial setup</small></span>
        </div>
        <span className="operator-onboarding-user">@{currentUser?.username ?? 'operator'} <i /></span>
      </header>

      <div className="operator-onboarding-layout">
        <aside className="operator-onboarding-rail" aria-label="Setup progress">
          <p className="operator-kicker"><span /> Configure your feed</p>
          <h1>Build a signal worth opening.</h1>
          <p>Three short decisions set your language, topics, and first creator network. You can change all of them later.</p>

          <ol>
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.number} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''} aria-current={index === step ? 'step' : undefined}>
                  <span>{index < step ? <Check /> : item.number}</span>
                  <Icon />
                  <div><strong>{item.label}</strong><small>{index === 0 ? 'Place and language' : index === 1 ? 'Topics you value' : 'People to begin with'}</small></div>
                </li>
              );
            })}
          </ol>

          <div className="operator-onboarding-rail__note"><Compass /><span><strong>No algorithmic lock-in.</strong> Your choices tune the starting feed; following and filtering stay in your control.</span></div>
        </aside>

        <section className="operator-onboarding-panel">
          <div className="operator-onboarding-progress" aria-hidden="true"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

          {step > 0 && <button type="button" className="operator-onboarding-back" onClick={() => setStep((current) => current - 1)}><ArrowLeft /> Back</button>}

          {step === 0 && (
            <div className="operator-onboarding-step">
              <header>
                <p className="operator-step-index">Step 01 / 03</p>
                <h2>Where should Yor begin?</h2>
                <p>Choose how place, time, language, and media should behave for you.</p>
              </header>
              <div className="operator-world-form">
                <WorldPreferencesForm value={worldDraft} onChange={(patch) => setWorldDraft((current) => ({ ...current, ...patch }))} idPrefix="onboarding-world" compact />
              </div>
              <div className="operator-onboarding-actions">
                <span>Saved when setup is complete.</span>
                <Button onClick={() => setStep(1)}>Tune my signal <ArrowRight /></Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="operator-onboarding-step">
              <header>
                <p className="operator-step-index">Step 02 / 03</p>
                <h2>What earns your attention?</h2>
                <p>Select at least three topics. This creates your starting mix, not a permanent bubble.</p>
              </header>

              <div className="operator-interest-meta"><span><b>{selectedInterests.length}</b> selected</span><span>{selectedInterests.length < 3 ? `${3 - selectedInterests.length} more required` : 'Minimum reached'}</span></div>
              <div className="operator-interest-grid">
                {INTERESTS.map((interest, index) => {
                  const selected = selectedInterests.includes(interest);
                  return <button key={interest} type="button" className={selected ? 'is-selected' : ''} onClick={() => toggleInterest(interest)} aria-pressed={selected}><small>{String(index + 1).padStart(2, '0')}</small><span>{interest}</span><i>{selected ? <Check /> : '+'}</i></button>;
                })}
              </div>

              <div className="operator-onboarding-actions">
                <span>{selectedInterests.length < 3 ? 'Choose at least 3 topics.' : 'Your first signal mix is ready.'}</span>
                <Button onClick={() => setStep(2)} disabled={selectedInterests.length < 3}>Choose creators <ArrowRight /></Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="operator-onboarding-step">
              <header>
                <p className="operator-step-index">Step 03 / 03</p>
                <h2>Start with real people.</h2>
                <p>Follow anyone useful now, or enter with an empty graph and discover people yourself.</p>
              </header>

              <div className="operator-creator-list" aria-busy={loadingCreators}>
                {loadingCreators && <div className="operator-creator-empty"><Loader2 className="animate-spin" /><span>Finding creators in your world…</span></div>}
                {!loadingCreators && suggestedCreators.map((creator) => {
                  const followed = followedIds.includes(creator.id);
                  return (
                    <article key={creator.id} className={followed ? 'is-followed' : ''}>
                      <Avatar><AvatarImage src={creator.avatarUrl ?? undefined} /><AvatarFallback>{(creator.fullName || creator.username).charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      <div><strong>{creator.fullName || creator.username}</strong><span>@{creator.username}</span><p>{creator.bio || 'Building and sharing on Yor.'}</p></div>
                      <button type="button" onClick={() => toggleFollow(creator.id)} aria-pressed={followed}>{followed ? <Check /> : <UserPlus />}{followed ? 'Following' : 'Follow'}</button>
                    </article>
                  );
                })}
                {!loadingCreators && suggestedCreators.length === 0 && <div className="operator-creator-empty"><Network /><span>No creator suggestions yet. Enter Yor and build your network from Explore.</span></div>}
              </div>

              <div className="operator-onboarding-actions">
                <span>{followedIds.length > 0 ? `${followedIds.length} creator${followedIds.length === 1 ? '' : 's'} selected.` : 'Following creators is optional.'}</span>
                <Button onClick={finishOnboarding} disabled={submitting}>{submitting ? <><Loader2 className="animate-spin" /> Saving setup…</> : <>Enter Yor Talks <ArrowRight /></>}</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
