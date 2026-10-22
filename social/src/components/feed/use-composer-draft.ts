import { useSyncExternalStore } from 'react';
import { useAppStore } from '@/lib/store';
import { CONTENT_CATEGORIES, type ContentCategory } from '@/lib/content-category';
import { CONTENT_RATING_OPTIONS, DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';

type DraftFields = {
  content: string;
  pollOpen: boolean;
  pollOptions: string[];
  contentCategory: ContentCategory | '';
  contentRating: ContentRating;
  audience: 'public' | 'followers' | 'close_friends';
  distributionMode: 'feed_and_profile' | 'profile_only';
};

type ComposerDraft = DraftFields & {
  attachments: Array<{ file: File; url: string }>;
  isPublishing: boolean;
  persisted: boolean;
};

const emptyDraft = (): ComposerDraft => ({
  content: '', pollOpen: false, pollOptions: ['', ''], contentCategory: '',
  contentRating: DEFAULT_CONTENT_RATING, audience: 'public', distributionMode: 'feed_and_profile',
  attachments: [], isPublishing: false, persisted: false,
});
const listeners = new Set<() => void>();
let ownerId: string | undefined;
let draft = emptyDraft();
let sessionRevision = 0;
let listeningForUnload = false;

function hasDraft(value: ComposerDraft) {
  return Boolean(value.content.trim() || value.pollOpen || value.contentCategory || value.attachments.length
    || value.audience !== 'public' || value.distributionMode !== 'feed_and_profile' || value.contentRating !== DEFAULT_CONTENT_RATING);
}

function beforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = '';
}

function notify() {
  // Attachment drafts survive route/dialog changes in this tab. Browsers cannot
  // restore File objects after a reload, so protect them until publication.
  const shouldWarn = draft.isPublishing || draft.attachments.length > 0 || (hasDraft(draft) && !draft.persisted);
  if (shouldWarn !== listeningForUnload && typeof window !== 'undefined') {
    window[shouldWarn ? 'addEventListener' : 'removeEventListener']('beforeunload', beforeUnload);
    listeningForUnload = shouldWarn;
  }
  listeners.forEach((listener) => listener());
}

function persist() {
  if (!ownerId) return;
  try {
    if (hasDraft(draft)) {
      const { attachments: _attachments, isPublishing: _busy, persisted: _persisted, ...fields } = draft;
      window.localStorage.setItem(`yor-composer-draft:${ownerId}`, JSON.stringify(fields));
      draft = { ...draft, persisted: true };
    } else {
      window.localStorage.removeItem(`yor-composer-draft:${ownerId}`);
      draft = { ...draft, persisted: false };
    }
  } catch {
    draft = { ...draft, persisted: false };
  }
  notify();
}

function selectOwner(nextOwnerId: string | undefined) {
  if (ownerId === nextOwnerId) return;
  draft.attachments.forEach(({ url }) => URL.revokeObjectURL(url));
  ownerId = nextOwnerId;
  sessionRevision++;
  draft = emptyDraft();
  if (ownerId) {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(`yor-composer-draft:${ownerId}`) || 'null');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const value = saved as Partial<DraftFields>;
        draft = {
          ...draft,
          content: typeof value.content === 'string' ? value.content : '',
          pollOpen: value.pollOpen === true,
          pollOptions: Array.isArray(value.pollOptions) && value.pollOptions.length >= 2 && value.pollOptions.every((option) => typeof option === 'string') ? value.pollOptions.slice(0, 4) : ['', ''],
          contentCategory: CONTENT_CATEGORIES.some(({ value: category }) => category === value.contentCategory) ? value.contentCategory! : '',
          contentRating: CONTENT_RATING_OPTIONS.some(({ value: rating }) => rating === value.contentRating) ? value.contentRating! : DEFAULT_CONTENT_RATING,
          audience: value.audience === 'followers' || value.audience === 'close_friends' ? value.audience : 'public',
          distributionMode: value.distributionMode === 'profile_only' ? 'profile_only' : 'feed_and_profile',
          persisted: true,
        };
      }
    } catch { /* A malformed or unavailable local draft must not block posting. */ }
  }
  notify();
}

// One owner per authenticated session, including when all composer views unmount.
// This also discards private in-memory attachments on sign-out/account switching.
selectOwner(useAppStore.getState().currentUser?.id);
useAppStore.subscribe((state) => selectOwner(state.currentUser?.id));
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => draft;

export function useComposerDraft() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const revision = sessionRevision;
  const isCurrent = () => revision === sessionRevision;
  return {
    draft: snapshot,
    hasDraft: hasDraft(snapshot),
    setField<K extends keyof DraftFields>(key: K, value: DraftFields[K] | ((previous: DraftFields[K]) => DraftFields[K])) {
      if (!isCurrent() || draft.isPublishing) return;
      draft = { ...draft, [key]: typeof value === 'function' ? value(draft[key]) : value };
      persist();
    },
    addAttachments(files: File[]) {
      if (!isCurrent() || draft.isPublishing) return;
      draft = { ...draft, attachments: [...draft.attachments, ...files.slice(0, 4 - draft.attachments.length).map((file) => ({ file, url: URL.createObjectURL(file) }))] };
      persist();
    },
    removeAttachment(url: string) {
      if (!isCurrent() || draft.isPublishing) return;
      URL.revokeObjectURL(url);
      draft = { ...draft, attachments: draft.attachments.filter((attachment) => attachment.url !== url) };
      persist();
    },
    beginPublishing() {
      if (!isCurrent() || draft.isPublishing || !ownerId) return false;
      draft = { ...draft, isPublishing: true };
      notify();
      return true;
    },
    finishPublishing(published: boolean) {
      if (!isCurrent()) return;
      if (published) {
        draft.attachments.forEach(({ url }) => URL.revokeObjectURL(url));
        draft = emptyDraft();
      } else {
        draft = { ...draft, isPublishing: false };
      }
      persist();
    },
    isCurrent,
  };
}
