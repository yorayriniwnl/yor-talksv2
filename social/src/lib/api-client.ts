// HTTP boundary for the backend built in api-server/.
// Vite's dev server proxies /api to the backend (see social/vite.config.ts).
// A Vercel frontend can point at a separately hosted API with
// VITE_API_BASE_URL without changing application code.

import type { StoryTextStyle } from '@/lib/story-text-style';

export interface Tokens {
  accessToken: string;
  /** Refresh tokens are HttpOnly cookies and are never available to JS. */
  refreshToken?: string;
  expiresAt?: string;
}

export type AuthTokens = Tokens;
export interface PremiumPlan {
  key: string; name: string; priceMinor: number; currency: string; durationDays: number;
  features: string[]; termsVersion: string; refundPolicy: string;
}
export interface PremiumOrder {
  id: string; providerOrderId: string | null; amountMinor: number; currency: string;
  status: string; lastPaymentStatus: string | null; createdAt: string; paidAt: string | null; plan: PremiumPlan; keyId: string;
}
export interface PremiumBillingState {
  catalog: { available: boolean; plan: PremiumPlan | null; operationalFeatures: Record<string, boolean>;
    automaticRenewal: false; billingModel: 'prepaid_fixed_term'; testMode: boolean; supportEmail: string };
  subscription: { order_id: string; starts_at: string; ends_at: string; cancel_at_period_end: boolean; status: string } | null;
  orders: PremiumOrder[];
  enabledFeatures: Record<string, boolean>;
}
export type FeedMode = 'for_you' | 'following' | 'favorites';

export interface BackendAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  goal: number;
  xp: number;
}

export type TwoFactorChallenge = {
  requiresTwoFactor: true;
  challengeId: string;
  matchingNumber: number;
  expiresAt: string;
};
export type PendingTwoFactorChallenge = Omit<TwoFactorChallenge, 'requiresTwoFactor'>;
export type TwoFactorChallengeStatus = {
  challengeId: string;
  status: 'pending' | 'approved' | 'expired';
  expiresAt: string;
};
export type AuthLoginResult = { user: BackendUser; tokens: AuthTokens } | TwoFactorChallenge;

const TOKEN_STORAGE_KEY = 'yortalks-tokens';
const EXPLICIT_LOGOUT_KEY = 'yortalks-logged-out';
export type ContentRating = 'child_safe' | 'regular' | 'mature';
export type { ContentCategory } from './content-category';
import type { ContentCategory } from './content-category';
import { normalizeApiTimestamps } from './timestamps';
let memoryAccessToken: string | null = null;
let explicitLogoutIntent = false;
let sessionEpoch = 0;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
let tokenChangeListener: ((token: string | null) => void) | null = null;

export function getStoredTokens(): Tokens | null {
  if (memoryAccessToken) return { accessToken: memoryAccessToken };
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Partial<Tokens>;
    // Migrate legacy browser storage by retaining only the short-lived access
    // token. The refresh credential is now supplied by an HttpOnly cookie.
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (typeof legacy.accessToken !== 'string' || !legacy.accessToken) return null;
    memoryAccessToken = legacy.accessToken;
    return { accessToken: memoryAccessToken };
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: Tokens | null): void {
  if (tokens?.accessToken) clearExplicitLogoutIntent();
  // Login, account changes, and logout invalidate all previous in-flight data.
  // Token rotation within one session deliberately does not advance this epoch.
  sessionEpoch++;
  updateMemoryTokens(tokens);
}

function markExplicitLogoutIntent(): void {
  explicitLogoutIntent = true;
  try {
    localStorage.setItem(EXPLICIT_LOGOUT_KEY, '1');
  } catch {
    // Keep the marker in memory when browser storage is unavailable.
  }
}

function clearExplicitLogoutIntent(): void {
  explicitLogoutIntent = false;
  try {
    localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
  } catch {
    // A restricted storage context must not prevent a successful login.
  }
}

function hasExplicitLogoutIntent(): boolean {
  if (explicitLogoutIntent) return true;
  try {
    return localStorage.getItem(EXPLICIT_LOGOUT_KEY) === '1';
  } catch {
    return false;
  }
}

function updateMemoryTokens(tokens: Tokens | null): void {
  memoryAccessToken = tokens?.accessToken ?? null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // A restricted storage context must not prevent a memory-only logout.
  }
  tokenChangeListener?.(memoryAccessToken);
}

export function onStoredTokensChange(listener: (token: string | null) => void): () => void {
  tokenChangeListener = listener;
  return () => {
    if (tokenChangeListener === listener) tokenChangeListener = null;
  };
}

export interface PaginatedResponse<T> {
  data: T;
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
  meta: Record<string, unknown>;
}

type RefreshOutcome =
  | { kind: 'refreshed'; tokens: Tokens }
  | { kind: 'expired' }
  | { kind: 'unavailable' }
  | { kind: 'changed' };

let refreshInFlight: Promise<RefreshOutcome> | null = null;
let refreshEpoch = -1;
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired(): void {
  for (const listener of sessionExpiredListeners) listener();
}

async function tryRefresh(): Promise<RefreshOutcome> {
  // Coalesce concurrent refreshes (e.g. several components hitting a 401 at once)
  // into a single request instead of racing multiple refresh calls.
  const epoch = sessionEpoch;
  if (!refreshInFlight || refreshEpoch !== epoch) {
    refreshEpoch = epoch;
    const rotate = async (): Promise<RefreshOutcome> => {
      try {
        if (epoch !== sessionEpoch || hasExplicitLogoutIntent()) return { kind: 'changed' };
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return res.status === 401 ? { kind: 'expired' } : { kind: 'unavailable' };
        const json = (await res.json()) as ApiEnvelope<Tokens>;
        if (epoch !== sessionEpoch) return { kind: 'changed' };
        return json.success && typeof json.data?.accessToken === 'string' && json.data.accessToken
          ? { kind: 'refreshed', tokens: json.data }
          : { kind: 'unavailable' };
      } catch {
        return { kind: 'unavailable' };
      }
    };
    // HttpOnly cookies are shared across tabs. Serialize rotation across this
    // origin so every request uses the cookie installed by its predecessor.
    refreshInFlight = (typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('yor-session-refresh', { signal: AbortSignal.timeout(25_000) }, rotate)
      : rotate()).catch((): RefreshOutcome => ({ kind: 'unavailable' })).finally(() => {
        if (refreshEpoch === epoch) refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function refreshSessionOutcome(): Promise<RefreshOutcome> {
  if (hasExplicitLogoutIntent()) {
    if (getStoredTokens()) {
      setStoredTokens(null);
      notifySessionExpired();
    }
    return { kind: 'expired' };
  }
  const epoch = sessionEpoch;
  const outcome = await tryRefresh();
  if (epoch !== sessionEpoch || outcome.kind === 'changed') return { kind: 'changed' };
  if (outcome.kind === 'refreshed') {
    updateMemoryTokens(outcome.tokens);
    return outcome;
  }
  if (outcome.kind === 'expired') {
    setStoredTokens(null);
    notifySessionExpired();
  }
  return outcome;
}

async function refreshSession(): Promise<Tokens | null> {
  const outcome = await refreshSessionOutcome();
  return outcome.kind === 'refreshed' ? outcome.tokens : null;
}

function isCredentialEstablishment(path: string, method?: string): boolean {
  const pathname = path.split('?')[0];
  const verb = (method ?? 'GET').toUpperCase();
  const publicEndpoints = new Set([
    'POST /auth/register',
    'POST /auth/login',
    'POST /auth/google',
    'POST /auth/email-otp/send',
    'POST /auth/email-otp/verify',
    'POST /auth/otp/send',
    'POST /auth/otp/verify',
    'POST /auth/reset-password',
    'POST /auth/reset-password/confirm',
    'POST /auth/verify-email/resend-public',
  ]);
  return publicEndpoints.has(`${verb} ${pathname}`)
    || (verb === 'GET' && pathname.startsWith('/auth/verify-email/'))
    || (verb === 'GET' && /^\/auth\/2fa\/challenges\/[^/]+$/.test(pathname))
    || (verb === 'POST' && /^\/auth\/2fa\/challenges\/[^/]+\/complete$/.test(pathname));
}

async function requestEnvelope<T>(path: string, options: RequestInit = {}, isRetry = false, epoch = sessionEpoch, includeAuthorization = true): Promise<ApiEnvelope<T>> {
  const assertSession = () => {
    if (epoch !== sessionEpoch) throw new ApiError('Your session changed. Please try again.', 409);
  };
  assertSession();
  const tokens = getStoredTokens();
  if (tokens && hasExplicitLogoutIntent()) {
    setStoredTokens(null);
    notifySessionExpired();
    throw new ApiError('Your session expired. Please sign in again.', 401);
  }
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (tokens && includeAuthorization) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options, headers, credentials: 'include', signal: options.signal ?? AbortSignal.timeout(20_000),
  });
  assertSession();

  // A rejected sign-in must never authenticate through an unrelated cookie.
  if (res.status === 401 && !isRetry && tokens && includeAuthorization && !isCredentialEstablishment(path, options.method)) {
    const outcome = await refreshSessionOutcome();
    if (outcome.kind === 'refreshed') {
      assertSession();
      return requestEnvelope<T>(path, options, true, epoch, includeAuthorization);
    }
    if (outcome.kind === 'expired') throw new ApiError('Your session expired. Please sign in again.', 401);
    if (outcome.kind === 'changed') {
      assertSession();
      throw new ApiError('Your session changed. Please try again.', 409);
    }
    throw new ApiError('Could not verify your session. Check your connection and try again.', 503);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }
  assertSession();

  if (!res.ok || !json?.success) {
    const detail = json?.errors?.[0];
    const message = detail && !/^[a-z][a-z0-9_]+$/.test(detail) ? detail : json?.message;
    const retryAfter = Number(res.headers.get('Retry-After'));
    throw new ApiError(res.status === 429 && retryAfter > 0
      ? `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minute${retryAfter > 60 ? 's' : ''}.`
      : message || `Request failed (${res.status})`, res.status, detail && /^[a-z][a-z0-9_]+$/.test(detail) ? detail : undefined);
  }
  return normalizeApiTimestamps(json);
}

async function request<T>(path: string, options: RequestInit = {}, includeAuthorization = true): Promise<T> {
  return (await requestEnvelope<T>(path, options, false, sessionEpoch, includeAuthorization)).data;
}

// Billing schemas are needed when a billing response arrives, rather than when
// the feed boots. Keep validation mandatory and reject a response whose session
// changes while its validator chunk is loading.
async function validateDeferredResponse<T>(value: unknown, loadParser: () => Promise<(value: unknown) => T>): Promise<T> {
  const epoch = sessionEpoch;
  let parse: (value: unknown) => T;
  try {
    parse = await loadParser();
  } catch {
    if (epoch !== sessionEpoch) throw new ApiError('Your session changed. Please try again.', 409);
    throw new ApiError('Billing details could not be loaded. Reload this page and try again.', 503);
  }
  if (epoch !== sessionEpoch) throw new ApiError('Your session changed. Please try again.', 409);
  return parse(value);
}

const parsePremiumBilling = (value: unknown) => validateDeferredResponse(value,
  () => import('./premium-billing-contract').then(module => module.parsePremiumBilling));
const parsePremiumOrder = (value: unknown) => validateDeferredResponse(value,
  () => import('./premium-billing-contract').then(module => module.parsePremiumOrder));
const parseCheckoutHistory = (value: unknown) => validateDeferredResponse(value,
  () => import('./checkout-contract').then(module => module.parseCheckoutHistory));

export interface PaginatedResult<T> {
  data: T;
  nextCursor?: string;
  hasMore?: boolean;
}

async function requestPaginated<T>(path: string, options: RequestInit = {}): Promise<PaginatedResult<T>> {
  const json = await requestEnvelope<any>(path, options);

  const data = (Array.isArray(json.data) ? json.data : json.data?.items ?? json.data ?? []) as T;
  const nextCursor = json.meta?.nextCursor ?? json.data?.nextCursor ?? null;
  const hasMore = Boolean(json.meta?.hasMore ?? json.data?.hasMore ?? nextCursor);

  return { data, nextCursor, hasMore };
}

export type MediaPurpose = 'avatar' | 'post' | 'comment' | 'video_comment' | 'story' | 'message' | 'video' | 'product' | 'article' | 'event' | 'live_stream' | 'broadcast_channel' | 'highlight' | 'showcase' | 'business' | 'community';
export type MediaUploadPhase = 'preparing' | 'uploading' | 'checking';
export interface UploadedMedia {
  id: string;
  mediaId: string;
  status: 'approved';
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  duration?: number;
}
interface MediaUploadGrant {
  id: string;
  mediaId: string;
  status: 'pending';
  mode: 'direct' | 'server';
  uploadUrl: string;
  fields?: Record<string, string>;
  maxFileSize: number;
  purpose: MediaPurpose;
  mimeType: string;
}
type MediaCompletion = Omit<UploadedMedia, 'status' | 'url'> & { status: string; url?: string };
type UploadAttempt = { epoch: number; grant?: MediaUploadGrant; uploaded: boolean; directUploadAttempted?: boolean; approved?: UploadedMedia; approvedAt?: number; inFlight?: Promise<UploadedMedia>; rejected?: ApiError };
const uploadAttempts = new WeakMap<File, Map<MediaPurpose, UploadAttempt>>();
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const videoMimeTypes = ['video/mp4', 'video/webm'];
const audioMimeTypes = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'];
export function mediaMaxBytes(purpose: MediaPurpose, mimeType: string): number {
  if (purpose === 'avatar') return 2 * 1024 * 1024;
  if (mimeType.startsWith('image/')) return (['post', 'comment', 'video_comment', 'message', 'story', 'video'].includes(purpose) ? 5 : 2) * 1024 * 1024;
  return (mimeType.startsWith('audio/') && purpose !== 'story' ? 5 : 10) * 1024 * 1024;
}
function canonicalMediaMime(file: File): string {
  const mime = file.type.split(';')[0].trim().toLowerCase();
  return mime === 'audio/x-wav' ? 'audio/wav' : mime === 'audio/mp3' ? 'audio/mpeg' : mime;
}
function mediaMimeAllowed(mime: string, purpose: MediaPurpose): boolean {
  const allowed = purpose === 'video' ? [...imageMimeTypes, ...videoMimeTypes]
    : purpose === 'story' ? [...imageMimeTypes, ...videoMimeTypes, ...audioMimeTypes]
    : purpose === 'comment' || purpose === 'video_comment' || purpose === 'message' ? [...imageMimeTypes, ...audioMimeTypes]
    : imageMimeTypes;
  return allowed.includes(mime);
}
async function uploadMediaFile(file: File, purpose: MediaPurpose, onPhase?: (phase: MediaUploadPhase) => void): Promise<UploadedMedia> {
  const mimeType = canonicalMediaMime(file);
  if (!mediaMimeAllowed(mimeType, purpose)) throw new ApiError('This file type is not supported for this attachment.', 415);
  const limit = mediaMaxBytes(purpose, mimeType);
  if (file.size > limit) throw new ApiError(`This media must be ${limit / 1024 / 1024} MB or smaller.`, 413);
  if (file.size === 0) throw new ApiError('Choose a file containing media before uploading.', 400);
  const epoch = sessionEpoch;
  const assertSession = () => { if (epoch !== sessionEpoch) throw new ApiError('Your session changed. Please try again.', 409); };
  let attempts = uploadAttempts.get(file);
  if (!attempts) { attempts = new Map(); uploadAttempts.set(file, attempts); }
  let attempt = attempts.get(purpose);
  if (!attempt || attempt.epoch !== epoch) { attempt = { epoch, uploaded: false }; attempts.set(purpose, attempt); }
  const current = attempt;
  if (current.rejected) throw current.rejected;
  if (current.approved && Date.now() - (current.approvedAt ?? 0) < 15_000) return current.approved;
  if (current.inFlight) return current.inFlight;
  current.inFlight = (async () => {
    if (!current.grant) {
      onPhase?.('preparing');
      const grant = await request<MediaUploadGrant>('/media/presign', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType, size: file.size, purpose }) });
      assertSession();
      if (!grant || !grant.id || grant.mediaId !== grant.id || grant.status !== 'pending' || grant.purpose !== purpose || grant.mimeType !== mimeType || !Number.isSafeInteger(grant.maxFileSize) || grant.maxFileSize <= 0 || grant.maxFileSize > limit || file.size > grant.maxFileSize) {
        throw new ApiError('The upload could not be prepared safely. Please try again.', 502);
      }
      current.grant = grant;
    }
    const grant = current.grant;
    const finalize = async (): Promise<UploadedMedia> => {
      onPhase?.('checking');
      for (let check = 0; check < 3; check++) {
        assertSession();
        const result = await request<MediaCompletion>(`/media/${encodeURIComponent(grant.id)}/finalize`, { method: 'POST', body: '{}', signal: AbortSignal.timeout(90_000) });
        assertSession();
        if (result?.status === 'approved') {
          const resolveDelivery = (value: string | undefined): string | undefined => {
            if (!value) return undefined;
            const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
            const url = new URL(value, apiOrigin);
            if (![apiOrigin, window.location.origin].includes(url.origin) || url.pathname !== `/api/media/${grant.id}/content` || !url.searchParams.get('token') || url.username || url.password || url.hash) return undefined;
            return url.href;
          };
          const deliveryUrl = resolveDelivery(result.url), posterUrl = resolveDelivery(result.thumbnailUrl);
          if (result.id !== grant.id || result.mediaId !== grant.id || !deliveryUrl
            || result.mimeType !== mimeType || !Number.isSafeInteger(result.size) || result.size !== file.size
            || (result.mimeType?.startsWith('video/') && (!posterUrl || posterUrl === deliveryUrl))) {
            throw new ApiError('Approved media delivery could not be verified. Please retry.', 502);
          }
          current.uploaded = true;
          current.approved = { ...result, url: deliveryUrl, thumbnailUrl: posterUrl } as UploadedMedia;
          current.approvedAt = Date.now();
          return current.approved;
        }
        if (result?.status === 'rejected') {
          current.rejected = new ApiError('This media could not be approved. Choose another file.', 422);
          throw current.rejected;
        }
        if (!['pending', 'uploaded', 'verifying'].includes(result?.status)) throw new ApiError('Media checks could not finish. Your file is still selected. Please retry.', 503);
        if (check < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      throw new ApiError('Your media is still being checked. Your file is still selected. Please retry.', 503);
    };
    if (!current.uploaded && grant.mode === 'direct' && current.directUploadAttempted) {
      // The provider may have stored the exact object before its response was
      // lost. Recheck ownership, bytes and moderation before repeating a write
      // to the overwrite=false reservation. Only a confirmed missing provider
      // object permits another write with the same file and reserved identity.
      try { return await finalize(); }
      catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'media_upload_not_found') throw error;
      }
    }
    if (!current.uploaded) {
      assertSession();
      onPhase?.('uploading');
      const form = new FormData();
      form.append('file', file.type === mimeType ? file : new File([file], file.name, { type: mimeType, lastModified: file.lastModified }));
      if (grant.mode === 'direct') {
        const url = new URL(grant.uploadUrl);
        if (url.protocol !== 'https:' || url.hostname !== 'api.cloudinary.com' || url.port || url.username || url.password || !/^\/v1_1\/[^/]+\/(?:image|video)\/upload$/.test(url.pathname) || url.search || url.hash
          || !grant.fields || grant.fields.type !== 'authenticated' || grant.fields.overwrite !== 'false' || !grant.fields.public_id || !grant.fields.upload_preset || !grant.fields.signature || !grant.fields.api_key || !grant.fields.timestamp) {
          throw new ApiError('The upload provider settings are unavailable. Your file is still selected.', 503);
        }
        for (const [name, value] of Object.entries(grant.fields)) {
          if (name === 'file' || typeof value !== 'string') throw new ApiError('The upload provider settings are invalid.', 502);
          form.append(name, value);
        }
        current.directUploadAttempted = true;
        const response = await fetch(grant.uploadUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(90_000) });
        assertSession();
        // Provider URLs and metadata are untrusted. Only server completion can
        // establish ownership, actual bytes, moderation and delivery identity.
        await response.body?.cancel();
        if (!response.ok) throw new ApiError('The media provider could not accept the upload. Your file is still selected. Please retry.', response.status === 413 ? 413 : 502);
      } else if (grant.mode === 'server') {
        const uploadPath = `/media/${encodeURIComponent(grant.id)}/upload`;
        if (grant.uploadUrl !== uploadPath && grant.uploadUrl !== `/api${uploadPath}` && grant.uploadUrl !== `${API_BASE_URL}${uploadPath}`) throw new ApiError('The upload route is invalid.', 502);
        await request<unknown>(uploadPath, { method: 'POST', body: form, signal: AbortSignal.timeout(90_000) });
      } else {
        throw new ApiError('Media uploads are unavailable. Your file is still selected.', 503);
      }
      assertSession();
      current.uploaded = true;
    }
    return finalize();
  })().finally(() => { current.inFlight = undefined; });
  return current.inFlight;
}

// ---- Auth ----
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  bioStyleId?: string;
  messageFontId?: string;
  storyFontId?: string;
  appIconId?: string;
  avatarUrl: string | null;
  role: string;
  followers?: string[];
  following?: string[];
  pendingFollowIds?: string[];
  favoriteCreatorIds?: string[];
  followerCount?: number;
  followingCount?: number;
  emailVerified: boolean;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  ageConfirmedAt?: string | null;
  createdAt: string;
  blockedUsers?: string[];
  mutedUsers?: string[];
  twoFactorEnabled?: boolean;
  settings?: {
    notificationsEnabled?: boolean;
    privateAccount?: boolean;
    theme?: 'light' | 'dark';
    contentFilter?: ContentRating;
    storyViewMode?: 'identified' | 'private';
    onboardingCompleted?: boolean;
  };
  privacy?: { profileVisibility: 'public' | 'private' | 'followers'; messageRequests: boolean; allowDmFromStrangers: boolean };
}

export interface BackendFollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  requester: BackendUser;
}

export interface BackendSubscriptionTier {
  id: 'chai' | 'elite' | 'vip';
  name: string;
  priceMinor: number;
  currency: 'INR';
  badge: string;
  perks: string[];
}

export interface CheckoutState {
  checkoutId: string; product: 'tip' | 'membership' | 'marketplace'; providerOrderId: string | null;
  status: string; providerState: string; lastPaymentStatus: string | null; amountMinor: number; currency: string; createdAt: string;
  subscriptionId?: string | null; keyId: string;
}
export interface PaymentOperations {
  jobs: Array<{id:string;kind:string;status:string;attempts:number;last_error:string|null}>;
  disputes: Array<{id:string;product:string;status:string;amount_minor:number;amount_deducted:number;currency:string;respond_by:string|null;checked_at:string|null}>;
  checkouts: Array<{id:string;product:string;status:string;amount_minor:number;currency:string}>;
  events: Array<{event_id:string;event_type:string;status:string;last_error:string|null}>;
  exposure: Array<{order_id:string;product:string;excess_minor:number|string}>;
}

export interface BackendSubscription {
  id: string;
  subscriberId: string;
  creatorId: string;
  tier: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'refunded' | 'refund_required' | 'disputed' | 'chargeback';
  cancelAtPeriodEnd: boolean;
  priceMinor: number;
  currency: string;
  startedAt: string;
  expiresAt: string | null;
}

export interface BackendProfileComment {
  id: string;
  targetUserId: string;
  author: BackendUser;
  content: string;
  createdAt: string;
}

export interface BackendShowcase {
  id: string;
  userId: string;
  type: 'achievement' | 'post' | 'custom';
  title: string;
  contentId?: string | null;
  customText?: string | null;
  customImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumProfileSelection {
  bioStyleId: string;
  messageFontId: string;
  storyFontId: string;
  appIconId: string;
}

export interface PremiumProfileOption {
  id: string;
  label: string;
  cssFamily?: string;
  platforms?: string[];
}

export interface PremiumProfileOptions {
  selection: PremiumProfileSelection;
  options: {
    bioStyles: PremiumProfileOption[];
    messageStyles: PremiumProfileOption[];
    storyStyles: PremiumProfileOption[];
    appIcons: PremiumProfileOption[];
  };
  enabledFeatures: Record<string, boolean>;
}

export type CreatorWorkspaceKind = 'draft' | 'scheduled' | 'collection' | 'collaboration' | 'quest' | 'preference';

export interface CreatorWorkspaceItem {
  id: string;
  ownerId: string;
  kind: CreatorWorkspaceKind;
  itemKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorAnalyticsDaily {
  id: string;
  creatorId: string;
  date: string;
  profileViews: number;
  newFollowers: number;
  totalPostViews: number;
  totalReelViews: number;
  totalEngagement: number;
  estimatedEarnings: number;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  entityType: 'post' | 'user' | 'comment' | 'message';
  entityId: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ContactShield {
  id: string;
  type: 'email' | 'phone';
  createdAt: string;
}

export interface BackendProject {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  visibility: 'public' | 'private';
  lookingForCollaborators: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  request: <T>(path: string, options: RequestInit = {}) => request<T>(path, options),
  refreshSession,
  checkReadiness: async (): Promise<{ ok: boolean; status: number }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/readyz`, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, status: 0 };
    }
  },
  register: (payload: { username: string; email: string; password: string; fullName: string; acceptedTerms: boolean; confirmedAge: boolean }) =>
    request<{ user: BackendUser; verificationRequired: boolean; devVerificationToken?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  acceptCurrentTerms: () => request<{ user: BackendUser }>('/users/me/consent', { method: 'POST', body: JSON.stringify({ acceptedTerms: true, confirmedAge: true }) }),

  login: (payload: { identifier: string; password: string; totpCode?: string; challengeId?: string }) =>
    request<AuthLoginResult>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  loginWithGoogle: (payload: { credential: string; totpCode?: string; challengeId?: string }) =>
    request<AuthLoginResult>('/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
  requestEmailOtp: (email: string) =>
    request<null>('/auth/email-otp/send', { method: 'POST', body: JSON.stringify({ email }) }),
  loginWithEmailOtp: (payload: { email: string; code: string; totpCode?: string; challengeId?: string }) =>
    request<AuthLoginResult>('/auth/email-otp/verify', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => {
    markExplicitLogoutIntent();
    setStoredTokens(null);
    notifySessionExpired();
    return request<null>('/auth/logout', { method: 'POST' }, false);
  },

  requestPasswordReset: (email: string) =>
    request<{ devResetToken?: string } | null>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    request<null>('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  setupTwoFactor: () => request<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
  confirmTwoFactor: (code: string) => request<null>('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  disableTwoFactor: (code: string) => request<null>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
  listTwoFactorChallenges: () => request<PendingTwoFactorChallenge[]>('/auth/2fa/challenges'),
  getTwoFactorChallengeStatus: (challengeId: string) =>
    request<TwoFactorChallengeStatus>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}`),
  approveTwoFactorChallenge: (challengeId: string, matchingNumber: number) =>
    request<null>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ matchingNumber }),
    }),
  denyTwoFactorChallenge: (challengeId: string) =>
    request<null>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}/deny`, { method: 'POST' }),
  completeTwoFactorLogin: (challengeId: string) =>
    request<{ user: BackendUser; tokens: AuthTokens }>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}/complete`, { method: 'POST' }),

  resendVerificationEmail: () => request<{ devVerificationToken?: string } | null>('/auth/verify-email/resend', { method: 'POST' }),
  resendPublicVerificationEmail: (email: string) => request<null>('/auth/verify-email/resend-public', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyEmail: (token: string) => request<{ user: BackendUser }>(`/auth/verify-email/${encodeURIComponent(token)}`),
  completeOnboarding: (payload: { interests: string[]; followedCreatorIds: string[] }) =>
    request<null>('/onboarding/complete', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- Users ----
  getCurrentUser: () => request<BackendUser>('/users/me'),
  exportMyData: () => request<Record<string, unknown>>('/users/me/export'),
  deleteAccount: (password: string) => request<null>('/users/me', { method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE', password }) }),
  getProfile: (userId: string) => request<BackendUser>(`/users/${userId}`),
  getProfileByUsername: (username: string) => request<BackendUser>(`/users/by-username/${encodeURIComponent(username)}`),
  updateProfile: (payload: { fullName?: string; bio?: string; avatarMediaId?: string }) =>
    request<BackendUser>('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
  getPremiumProfileOptions: () => request<PremiumProfileOptions>('/users/me/premium-profile'),
  getPremiumBilling: () => request<PremiumBillingState>('/premium/me').then(parsePremiumBilling),
  createPremiumOrder: (payload: { idempotencyKey: string; acceptedTermsVersion: string; acceptedPriceMinor: number }) =>
    request<PremiumOrder>('/premium/orders', { method: 'POST', body: JSON.stringify(payload) }).then(parsePremiumOrder),
  verifyPremiumOrder: (id: string, payload: { paymentId: string; signature: string }) =>
    request<PremiumBillingState>(`/premium/orders/${encodeURIComponent(id)}/verify`, { method: 'POST', body: JSON.stringify(payload) }).then(parsePremiumBilling),
  recoverPremiumOrder: (id: string) => request<PremiumBillingState>(`/premium/orders/${encodeURIComponent(id)}/recover`, { method: 'POST' }).then(parsePremiumBilling),
  cancelPremiumOrder: (id: string) => request<PremiumBillingState>(`/premium/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' }).then(parsePremiumBilling),
  updatePremiumProfile: (payload: Partial<PremiumProfileSelection>) =>
    request<BackendUser>('/users/me/premium-profile', { method: 'PUT', body: JSON.stringify(payload) }),
  uploadAvatar: async (file: File) => {
    const approved = await uploadMediaFile(file, 'avatar');
    return request<BackendUser>('/users/me', { method: 'PUT', body: JSON.stringify({ avatarMediaId: approved.mediaId }) });
  },
  searchUsers: (q: string) => request<BackendUser[]>(`/users/search?q=${encodeURIComponent(q)}`),
  followUser: (userId: string) => request<{ follower: BackendUser; target: BackendUser; status: 'accepted' | 'pending' }>(`/users/${userId}/follow`, { method: 'POST' }),
  unfollowUser: (userId: string) => request<{ follower: BackendUser; target: BackendUser }>(`/users/${userId}/unfollow`, { method: 'POST' }),
  getFollowers: (userId: string) => request<BackendUser[]>(`/users/${userId}/followers`),
  getAchievements: () => request<BackendAchievement[]>('/achievements/me'),
  getFollowing: (userId: string) => request<BackendUser[]>(`/users/${userId}/following`),
  getFavoriteCreatorIds: () => request<string[]>('/users/me/favorites/creators'),
  getCloseFriends: () => request<BackendUser[]>('/users/me/close-friends'),
  addCloseFriend: (userId: string) => request<{ friendId: string; closeFriend: true }>(`/users/${encodeURIComponent(userId)}/close-friend`, { method: 'POST' }),
  removeCloseFriend: (userId: string) => request<{ friendId: string; closeFriend: false }>(`/users/${encodeURIComponent(userId)}/close-friend`, { method: 'DELETE' }),
  favoriteCreator: (userId: string) => request<{ creatorId: string; favorite: true }>(`/users/${encodeURIComponent(userId)}/favorite`, { method: 'POST' }),
  unfavoriteCreator: (userId: string) => request<{ creatorId: string; favorite: false }>(`/users/${encodeURIComponent(userId)}/favorite`, { method: 'DELETE' }),
  getFollowRequests: () => request<BackendFollowRequest[]>('/users/me/follow-requests'),
  acceptFollowRequest: (requestId: string) => request<{ request: BackendFollowRequest; follower: BackendUser; target: BackendUser }>(`/users/me/follow-requests/${encodeURIComponent(requestId)}/accept`, { method: 'POST' }),
  rejectFollowRequest: (requestId: string) => request<BackendFollowRequest>(`/users/me/follow-requests/${encodeURIComponent(requestId)}/reject`, { method: 'POST' }),
  getProfileComments: (userId: string) => request<BackendProfileComment[]>(`/users/${encodeURIComponent(userId)}/profile-comments`),
  createProfileComment: (userId: string, content: string) => request<BackendProfileComment>(`/users/${encodeURIComponent(userId)}/profile-comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteProfileComment: (userId: string, commentId: string) => request<null>(`/users/${encodeURIComponent(userId)}/profile-comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }),
  getProfileShowcases: (userId: string) => request<BackendShowcase[]>(`/users/${encodeURIComponent(userId)}/showcases`),
  createProfileShowcase: (userId: string, payload: { type: 'achievement' | 'post' | 'custom'; title: string; contentId?: string; customText?: string; customImageMediaId?: string }) => request<BackendShowcase>(`/users/${encodeURIComponent(userId)}/showcases`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteProfileShowcase: (userId: string, showcaseId: string) => request<null>(`/users/${encodeURIComponent(userId)}/showcases/${encodeURIComponent(showcaseId)}`, { method: 'DELETE' }),
  updateSettings: (payload: { theme?: 'light' | 'dark'; notificationsEnabled?: boolean; privateAccount?: boolean; contentFilter?: ContentRating; storyViewMode?: 'identified' | 'private' }) =>
    request<NonNullable<BackendUser['settings']>>('/users/me/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  updatePrivacy: (payload: { profileVisibility?: 'public' | 'private' | 'followers'; messageRequests?: boolean; allowDmFromStrangers?: boolean }) =>
    request<{ profileVisibility: 'public' | 'private' | 'followers'; messageRequests: boolean; allowDmFromStrangers: boolean }>('/users/me/privacy', { method: 'PUT', body: JSON.stringify(payload) }),
  submitReport: (payload: { entityType: 'post' | 'user' | 'comment' | 'message'; entityId: string; reason: 'spam' | 'harassment' | 'nsfw' | 'illegal' | 'hate_speech' | 'privacy_violation' | 'copyright' | 'other'; details?: string }) =>
    request<null>('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  blockUser: (userId: string) => request<{ blockedUsers: string[] }>(`/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId: string) => request<{ blockedUsers: string[] }>(`/users/${userId}/unblock`, { method: 'POST' }),
  muteUser: (userId: string) => request<{ mutedUsers: string[] }>(`/users/${userId}/mute`, { method: 'POST' }),
  unmuteUser: (userId: string) => request<{ mutedUsers: string[] }>(`/users/${userId}/unmute`, { method: 'POST' }),
  getContactShields: () => request<ContactShield[]>('/users/me/contact-shields'),
  addContactShields: (contacts: Array<{ type: 'email' | 'phone'; value: string }>) =>
    request<ContactShield[]>('/users/me/contact-shields', { method: 'POST', body: JSON.stringify({ contacts }) }),
  removeContactShield: (shieldId: string) =>
    request<null>(`/users/me/contact-shields/${shieldId}`, { method: 'DELETE' }),

  // ---- Creator workspace ----
  getCreatorWorkspace: (kind?: CreatorWorkspaceKind) =>
    request<CreatorWorkspaceItem[]>(`/creator/workspace${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`),
  saveCreatorWorkspaceItem: (payload: { kind: CreatorWorkspaceKind; itemKey: string; payload: Record<string, unknown> }) =>
    request<CreatorWorkspaceItem>('/creator/workspace', { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCreatorWorkspaceItem: (kind: CreatorWorkspaceKind, itemKey: string) =>
    request<null>(`/creator/workspace/${encodeURIComponent(kind)}/${encodeURIComponent(itemKey)}`, { method: 'DELETE' }),
  getCreatorAnalytics: () => request<CreatorAnalyticsDaily[]>('/economy/analytics'),
  getModerationQueue: () => request<ModerationReport[]>('/reports/queue'),
  updateReportStatus: (reportId: string, status: ModerationReport['status']) =>
    request<ModerationReport>(`/reports/${encodeURIComponent(reportId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ---- Posts / feed ----
  getFeed: (mode?: FeedMode, cursor?: string, limit = 20) => requestPaginated<BackendPost[]>(`/feed?limit=${limit}${mode ? `&mode=${mode}` : ''}${cursor ? `&cursor=${cursor}` : ''}`),
  getSavedPosts: (limit = 50) => requestPaginated<BackendPost[]>(`/posts/saved?limit=${limit}`),
  getLikedPosts: (limit = 100) => requestPaginated<BackendPost[]>(`/posts/liked?limit=${limit}`),
  getTrendingFeed: (_page = 1, pageSize = 20) => request<BackendPost[]>(`/feed/trending?limit=${pageSize}`),
  getUserFeed: (userId: string, _page = 1, pageSize = 20) => request<BackendPost[]>(`/users/${userId}/feed?limit=${pageSize}`),
  createPost: (payload: { content: string; mediaIds?: string[]; audience?: 'followers' | 'close_friends' | 'public'; distributionMode?: 'feed_and_profile' | 'profile_only'; contentCategory: ContentCategory; contentRating?: ContentRating; poll?: { question: string; options: Array<{ text: string }> } }) => request<BackendPost>('/posts', { method: 'POST', body: JSON.stringify(payload) }),
  getPost: (postId: string) => request<BackendPost>(`/posts/${postId}`),
  editPost: (postId: string, content: string, contentCategory?: ContentCategory, contentRating?: ContentRating) => request<BackendPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content, ...(contentCategory ? { contentCategory } : {}), ...(contentRating ? { contentRating } : {}) }) }),
  deletePost: (postId: string) => request<null>(`/posts/${postId}`, { method: 'DELETE' }),
  likePost: (postId: string) => request<BackendPost>(`/posts/${postId}/like`, { method: 'POST' }),
  unlikePost: (postId: string) => request<BackendPost>(`/posts/${postId}/unlike`, { method: 'POST' }),
  bookmarkPost: (postId: string) => request<BackendPost>(`/posts/${postId}/bookmark`, { method: 'POST' }),
  sharePost: (postId: string) => request<BackendPost>(`/posts/${postId}/share`, { method: 'POST' }),
  pinPost: (postId: string) => request<BackendPost>(`/posts/${encodeURIComponent(postId)}/pin`, { method: 'POST' }),
  unpinPost: (postId: string) => request<BackendPost>(`/posts/${encodeURIComponent(postId)}/pin`, { method: 'DELETE' }),
  repostPost: (postId: string, note?: string) => request<BackendPost>(`/posts/${postId}/repost`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) }),
  unrepostPost: (postId: string) => request<BackendPost>(`/posts/${postId}/repost`, { method: 'DELETE' }),
  votePostPoll: (postId: string, optionId: string) => request<BackendPost>(`/posts/${postId}/poll/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),
  commentOnPost: (postId: string, payload: { content?: string; mediaId?: string; mediaType?: 'image' | 'gif' | 'audio'; mediaDuration?: number }) => request<{ post: BackendPost; comment: BackendComment }>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  getPostComments: (postId: string) => request<BackendComment[]>(`/posts/${postId}/comments`),
  likePostComment: (postId: string, commentId: string) => request<BackendComment>(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' }),
  replyToPostComment: (postId: string, commentId: string, content: string) => request<{ post: BackendPost; reply: BackendComment }>(`/posts/${postId}/comments/${commentId}/replies`, { method: 'POST', body: JSON.stringify({ content }) }),
  uploadPostImage: (file: File, onPhase?: (phase: MediaUploadPhase) => void) => uploadMediaFile(file, 'post', onPhase),
  uploadMedia: (file: File, purpose: MediaPurpose, onPhase?: (phase: MediaUploadPhase) => void) => uploadMediaFile(file, purpose, onPhase),

  // ---- Communities ----
  getCommunities: () => request<BackendCommunity[]>('/communities'),
  getCommunity: (idOrSlug: string) => request<BackendCommunity>(`/communities/${idOrSlug}`),
  createCommunity: (payload: { name: string; slug: string; description?: string; contentRating: ContentRating; coverMediaId?: string }) =>
    request<BackendCommunity>('/communities', { method: 'POST', body: JSON.stringify(payload) }),
  joinCommunity: (id: string) => request<BackendCommunity>(`/communities/${id}/join`, { method: 'POST' }),
  leaveCommunity: (id: string) => request<BackendCommunity>(`/communities/${id}/leave`, { method: 'POST' }),
  getCommunityDiscussions: (id: string) => request<BackendCommunityDiscussion[]>(`/communities/${encodeURIComponent(id)}/discussions`),
  createCommunityDiscussion: (id: string, payload: { title: string; content?: string; tag: string; contentRating: ContentRating }) =>
    request<BackendCommunityDiscussion>(`/communities/${encodeURIComponent(id)}/discussions`, { method: 'POST', body: JSON.stringify(payload) }),
  likeCommunityDiscussion: (communityId: string, discussionId: string) =>
    request<BackendCommunityDiscussion>(`/communities/${encodeURIComponent(communityId)}/discussions/${encodeURIComponent(discussionId)}/like`, { method: 'POST' }),

  // ---- Projects / dreams ----
  getProjects: () => request<{ projects: BackendProject[] }>('/projects').then((result) => result.projects),
  createProject: (payload: { title: string; description?: string; visibility?: 'public' | 'private'; lookingForCollaborators?: boolean }) =>
    request<BackendProject>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  inviteProjectCollaborator: (projectId: string, userId: string, role?: 'collaborator' | 'advisor') =>
    request<null>(`/projects/${projectId}/collaborators`, { method: 'POST', body: JSON.stringify({ userId, role }) }),

  // ---- Stories ----
  getHighlights: () => request<BackendHighlight[]>('/highlights'),
  createHighlight: (payload: { title: string; coverMediaId?: string }) => request<BackendHighlight>('/highlights', { method: 'POST', body: JSON.stringify(payload) }),
  getStories: () => request<BackendStory[]>('/stories'),
  createStory: (payload: { mediaId?: string; type: string; textContent?: string; backgroundGradient?: string; storyFontId?: 'default' | 'cinematic' | 'mono'; storyTextStyle?: StoryTextStyle; isHighlight?: boolean; highlightTitle?: string; highlightId?: string; publishMode?: 'active' | 'highlight_only'; durationHours?: number; priority?: boolean; audience?: 'followers' | 'close_friends' | 'public' | 'selected_people' | 'everyone_except' | 'custom'; audienceMemberIds?: string[]; audienceExclusionIds?: string[]; contentCategory: ContentCategory; contentRating?: ContentRating; poll?: { question: string; options: Array<{ text: string }> } }) =>
    request<BackendStory>('/stories', { method: 'POST', body: JSON.stringify(payload) }),
  viewStory: (id: string) => request<BackendStory>(`/stories/${id}/view`, { method: 'POST' }),
  reactToStory: (id: string, emoji: string, reactionType?: 'NORMAL_HEART' | 'SUPER_HEART' | 'CUSTOM') => request<BackendStory>(`/stories/${id}/react`, { method: 'POST', body: JSON.stringify({ emoji, ...(reactionType ? { reactionType } : {}) }) }),
  getStoryAnalytics: (id: string) => request<BackendStoryAnalytics>(`/stories/${encodeURIComponent(id)}/analytics`),
  getStoryViewers: (id: string, query = '', cursor?: string) => request<BackendStoryViewers>(`/stories/${encodeURIComponent(id)}/viewers?${new URLSearchParams({ ...(query.trim() ? { q: query.trim() } : {}), ...(cursor ? { cursor } : {}) }).toString()}`),
  voteStoryPoll: (id: string, optionId: string) => request<BackendStory>(`/stories/${id}/poll/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),

  // ---- Broadcast channels ----
  getBroadcastChannels: () => request<BackendBroadcastChannel[]>('/broadcast-channels'),
  createBroadcastChannel: (payload: { name: string; description?: string; coverMediaId?: string; contentCategory?: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendBroadcastChannel>('/broadcast-channels', { method: 'POST', body: JSON.stringify(payload) }),
  joinBroadcastChannel: (id: string) => request<BackendBroadcastChannel>(`/broadcast-channels/${encodeURIComponent(id)}/join`, { method: 'POST' }),
  leaveBroadcastChannel: (id: string) => request<BackendBroadcastChannel>(`/broadcast-channels/${encodeURIComponent(id)}/join`, { method: 'DELETE' }),
  setBroadcastChannelNotifications: (id: string, enabled: boolean) => request<BackendBroadcastChannel>(`/broadcast-channels/${encodeURIComponent(id)}/notifications`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  getBroadcastChannelMessages: (id: string) => request<BackendBroadcastChannelMessage[]>(`/broadcast-channels/${encodeURIComponent(id)}/messages`),
  publishBroadcastChannelMessage: (id: string, payload: { content: string; contentCategory?: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendBroadcastChannelMessage>(`/broadcast-channels/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
  reactToBroadcastChannelMessage: (channelId: string, messageId: string, reaction: string) =>
    request<BackendBroadcastChannelMessage>(`/broadcast-channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/react`, { method: 'POST', body: JSON.stringify({ reaction }) }),

  // ---- Ephemeral Notes ----
  getNotes: () => request<BackendNote[]>('/notes'),
  createNote: (payload: { content: string; audience: 'followers' | 'close_friends' | 'public'; contentCategory: ContentCategory; contentRating: ContentRating }) =>
    request<BackendNote>('/notes', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNote: (id: string) => request<null>(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // ---- Economy ----
  getCheckouts: () => request<CheckoutState[]>('/billing/checkouts').then(parseCheckoutHistory),
  getPaymentOperations: () => request<PaymentOperations>('/operations/payments'),
  retryPaymentJob: (id:string,reason:string) => request<PaymentOperations>(`/operations/payments/jobs/${encodeURIComponent(id)}/retry`, {method:'POST',body:JSON.stringify({reason})}),
  reconcilePaymentDispute: (id:string,reason:string) => request<PaymentOperations>(`/operations/payments/disputes/${encodeURIComponent(id)}/reconcile`, {method:'POST',body:JSON.stringify({reason})}),
  recoverCheckout: (id: string) => request<CheckoutState[]>(`/billing/checkouts/${encodeURIComponent(id)}/recover`, { method: 'POST' }).then(parseCheckoutHistory),
  cancelCheckout: (id: string) => request<CheckoutState[]>(`/billing/checkouts/${encodeURIComponent(id)}/cancel`, { method: 'POST' }).then(parseCheckoutHistory),
  getCreatorWallet: () => request<{ balanceMinor: number; currency: string }>('/economy/wallet'),
  createTipOrder: (payload: { idempotencyKey: string; creatorId: string; streamId?: string; amountMinor: number; message?: string }) =>
    request<CheckoutState & { orderId: string | null }>('/economy/orders', { method: 'POST', body: JSON.stringify(payload) }),
  verifyTipPayment: (orderId: string, payload: { paymentId: string; signature: string }) =>
    request<{ transactionId: string; status: string }>(`/economy/orders/${encodeURIComponent(orderId)}/verify`, { method: 'POST', body: JSON.stringify(payload) }),
  sendSuperchat: (payload: { idempotencyKey: string; streamId: string; creatorId: string; amountMinor: number; message: string }) =>
    request<CheckoutState & { orderId: string | null }>('/economy/superchat', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- Creator memberships ----
  getSubscriptionTiers: (creatorId: string) => request<BackendSubscriptionTier[]>(`/subscriptions/tiers/${encodeURIComponent(creatorId)}`),
  createSubscriptionOrder: (payload: { idempotencyKey: string; creatorId: string; tier: BackendSubscriptionTier['id'] }) =>
    request<CheckoutState & { subscriptionId: string; orderId: string | null; tier: string }>('/subscriptions/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  verifySubscriptionPayment: (subscriptionId: string, payload: { orderId: string; paymentId: string; signature: string }) =>
    request<{ subscriptionId: string; status: string; expiresAt: string | null }>(`/subscriptions/${encodeURIComponent(subscriptionId)}/verify`, { method: 'POST', body: JSON.stringify(payload) }),
  getMySubscriptions: () => request<BackendSubscription[]>('/subscriptions/my-subscriptions'),
  cancelSubscription: (subscriptionId: string) => request<BackendSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: 'DELETE' }),

  // ---- Messages ----
  sendMessage: (recipientId: string, content: string, replyToId?: string, textStyleId?: 'default' | 'mono' | 'rounded', idempotencyKey?: string, attachment?: { mediaId: string }) => request<BackendMessage>('/messages', { method: 'POST', body: JSON.stringify({ recipientId, content, ...(replyToId ? { replyToId } : {}), ...(textStyleId ? { textStyleId } : {}), ...(idempotencyKey ? { idempotencyKey } : {}), ...(attachment ? { mediaId: attachment.mediaId } : {}) }) }),
  sendMessageToConversation: (conversationId: string, content: string, replyToId?: string, textStyleId?: 'default' | 'mono' | 'rounded', idempotencyKey?: string, attachment?: { mediaId: string }) => request<BackendMessage>('/messages', { method: 'POST', body: JSON.stringify({ conversationId, content, ...(replyToId ? { replyToId } : {}), ...(textStyleId ? { textStyleId } : {}), ...(idempotencyKey ? { idempotencyKey } : {}), ...(attachment ? { mediaId: attachment.mediaId } : {}) }) }),
  createGroupChat: (payload: { memberIds: string[]; title: string }) => request<BackendConversation>('/conversations/group', { method: 'POST', body: JSON.stringify(payload) }),
  setConversationVanishMode: (conversationId: string, enabled: boolean) => request<BackendConversation>(`/conversations/${encodeURIComponent(conversationId)}/vanish`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  getConversations: () => request<{ conversation: BackendConversation; lastMessage: BackendMessage | null }[]>('/conversations'),
  getConversationMessages: (conversationId: string, options: { direction?: 'latest' | 'older' | 'newer'; cursorAt?: string; cursorId?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const suffix = query.size ? `?${query.toString()}` : '';
    return request<BackendMessage[]>(`/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`);
  },
  previewMessage: (messageId: string) => request<BackendMessage>(`/messages/${encodeURIComponent(messageId)}/preview`, { method: 'POST' }),
  markMessageSeen: (messageId: string) => request<BackendMessage>(`/messages/${encodeURIComponent(messageId)}/seen`, { method: 'POST' }),
  editMessage: (messageId: string, content: string) => request<BackendMessage>(`/messages/${encodeURIComponent(messageId)}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deleteMessage: (messageId: string) => request<BackendMessage>(`/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' }),
  reactToMessage: (messageId: string, reaction: string) => request<BackendMessage>(`/messages/${encodeURIComponent(messageId)}/reactions`, { method: 'POST', body: JSON.stringify({ reaction }) }),
  pinMessage: (messageId: string) => request<BackendMessage>(`/messages/${encodeURIComponent(messageId)}/pin`, { method: 'POST' }),

  // ---- Notifications ----
  getNotifications: () => request<BackendNotification[]>('/notifications'),
  markNotificationRead: (notificationId: string) => request<BackendNotification>(`/notifications/${notificationId}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<null>('/notifications/read-all', { method: 'POST' }),
  getPushPublicKey: () => request<{ publicKey: string }>('/notifications/push/public-key'),
  savePushSubscription: (subscription: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) =>
    request<{ id: string }>('/notifications/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  removePushSubscription: (endpoint: string) =>
    request<null>('/notifications/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),

  // ---- Search ----
  search: (q: string) => request<{ users: BackendUser[]; posts: BackendPost[] }>(`/search?q=${encodeURIComponent(q)}`),

  // ---- Events ----
  getEvents: () => request<BackendEvent[]>('/events'),
  getEvent: (id: string) => request<BackendEvent>(`/events/${id}`),
  createEvent: (payload: { title: string; description?: string; coverMediaId?: string; category: string; startsAt: string; location: string; isOnline?: boolean; contentRating: ContentRating }) =>
    request<BackendEvent>('/events', { method: 'POST', body: JSON.stringify(payload) }),
  rsvpEvent: (id: string, status: 'going' | 'interested' | null) =>
    request<BackendEvent>(`/events/${id}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) }),
  deleteEvent: (id: string) => request<null>(`/events/${id}`, { method: 'DELETE' }),

  // ---- Products ----
  getProducts: () => request<BackendProduct[]>('/products'),
  getProduct: (id: string) => request<BackendProduct>(`/products/${id}`),
  createProduct: (payload: { title: string; description: string; price: number; mediaIds: string[]; category: string; condition: 'new' | 'like-new' | 'used'; contentRating: ContentRating }) =>
    request<BackendProduct>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  saveProduct: (id: string) => request<BackendProduct>(`/products/${id}/save`, { method: 'POST' }),
  deleteProduct: (id: string) => request<null>(`/products/${id}`, { method: 'DELETE' }),
  createMarketplaceOrder: (productId: string, payload: { idempotencyKey: string; shippingName: string; shippingAddress: string; shippingPhone?: string }) =>
    request<CheckoutState & { orderId: string }>(`/products/${encodeURIComponent(productId)}/order`, { method: 'POST', body: JSON.stringify(payload) }),
  verifyMarketplacePayment: (providerOrderId: string, payload: { paymentId: string; signature: string }) =>
    request<BackendMarketplaceOrder>(`/products/orders/${encodeURIComponent(providerOrderId)}/verify`, { method: 'POST', body: JSON.stringify(payload) }),
  getMarketplaceOrders: () => request<BackendMarketplaceOrder[]>('/products/orders'),
  cancelMarketplaceOrder: (orderId: string) => request<BackendMarketplaceOrder>(`/products/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' }),
  fulfillMarketplaceOrder: (orderId: string) => request<BackendMarketplaceOrder>(`/products/orders/${encodeURIComponent(orderId)}/fulfill`, { method: 'POST' }),

  // ---- Articles ----
  getArticles: () => request<BackendArticle[]>('/articles'),
  getArticle: (id: string) => request<BackendArticle>(`/articles/${id}`),
  createArticle: (payload: { title: string; excerpt: string; content: string; coverMediaId?: string; readTime?: number; collection?: string; contentCategory: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendArticle>('/articles', { method: 'POST', body: JSON.stringify(payload) }),
  clapArticle: (id: string, count = 1) => request<BackendArticle>(`/articles/${id}/clap`, { method: 'POST', body: JSON.stringify({ count }) }),

  // ---- Videos ----
  getVideos: () => request<BackendVideo[]>('/videos'),
  getSavedVideos: () => request<BackendVideo[]>('/videos/saved'),
  getVideo: (id: string) => request<BackendVideo>(`/videos/${id}`),
  createVideo: (payload: { title: string; mediaId?: string; externalVideoUrl?: string; thumbnailMediaId?: string; type: 'short' | 'standard'; contentCategory: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendVideo>('/videos', { method: 'POST', body: JSON.stringify(payload) }),
  likeVideo: (id: string) => request<BackendVideo>(`/videos/${id}/like`, { method: 'POST' }),
  bookmarkVideo: (id: string) => request<BackendVideo>(`/videos/${id}/bookmark`, { method: 'POST' }),
  getVideoComments: (id: string) => request<BackendComment[]>(`/videos/${id}/comments`),
  commentOnVideo: (id: string, payload: { content?: string; mediaId?: string; mediaType?: 'image' | 'gif' | 'audio'; mediaDuration?: number }) =>
    request<{ video: BackendVideo; comment: BackendComment }>(`/videos/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  likeVideoComment: (videoId: string, commentId: string) => request<BackendComment>(`/videos/${videoId}/comments/${commentId}/like`, { method: 'POST' }),

  // ---- Live streams ----
  getStreams: () => request<BackendLiveStream[]>('/streams'),
  getStream: (id: string) => request<BackendLiveStream>(`/streams/${id}`),
  getStreamToken: (id: string) => request<{ token: string; wsUrl: string; roomName: string }>(`/streams/${id}/token`),
  createStream: (payload: { title: string; coverMediaId?: string; kind: 'video' | 'audio'; startsAt: string; category: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendLiveStream>('/streams', { method: 'POST', body: JSON.stringify(payload) }),
  setStreamStatus: (id: string, status: 'scheduled' | 'live' | 'ended') =>
    request<BackendLiveStream>(`/streams/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export interface BackendStory {
  id: string;
  authorId: string;
  mediaUrl: string;
  type: string;
  textContent: string | null;
  backgroundGradient: string | null;
  storyFontId?: 'default' | 'cinematic' | 'mono';
  storyTextStyle?: StoryTextStyle | null;
  createdAt: string;
  expiresAt: string;
  viewerIds: string[];
  reactions: { userId: string; emoji: string }[];
  isHighlight: boolean;
  highlightTitle: string | null;
  highlightId?: string | null;
  publishMode?: 'active' | 'highlight_only';
  audience?: 'followers' | 'close_friends' | 'public' | 'selected_people' | 'everyone_except' | 'custom';
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
  poll?: {
    id: string;
    question: string;
    options: { id: string; text: string; position: number; votes: number }[];
    totalVotes: number;
    votedOptionId?: string;
  };
}

export interface BackendHighlight {
  id: string;
  ownerId: string;
  title: string;
  coverUrl?: string | null;
  storyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendStoryAnalytics {
  totalViews: number;
  uniqueViewers: number;
  rewatches: number;
  rewatchRate: number;
  identifiedViews: number;
  privateViews: number;
  reactionCounts: {
    normalHeart: number;
    superHeart: number;
    custom: number;
    total: number;
  };
}

export interface BackendStoryViewer {
  viewerId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: string;
}

export interface BackendStoryViewers {
  viewers: BackendStoryViewer[];
  nextCursor: string | null;
}

export interface BackendNote {
  id: string;
  authorId: string;
  content: string;
  audience: 'followers' | 'close_friends' | 'public';
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
  createdAt: string;
  expiresAt: string;
}

export interface BackendBroadcastChannel {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  coverUrl?: string | null;
  contentCategory: ContentCategory;
  contentRating: ContentRating;
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackendBroadcastChannelMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  contentCategory: ContentCategory;
  contentRating: ContentRating;
  reactions?: Record<string, number>;
  createdAt: string;
}

export interface BackendPost {
  id: string;
  authorId: string;
  content: string;
  images: string[];
  audience?: 'followers' | 'close_friends' | 'public';
  distributionMode?: 'feed_and_profile' | 'profile_only';
  pinnedPosition?: number | null;
  createdAt: string;
  likedBy?: string[];
  comments?: { id: string; authorId: string; content: string; createdAt: string }[];
  bookmarkedBy?: string[];
  likesCount?: number;
  commentsCount?: number;
  bookmarksCount?: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  shareCount: number;
  repostCount?: number;
  repostedByMe?: boolean;
  poll?: {
    id: string;
    question: string;
    options: { id: string; text: string; position: number; votes: number }[];
    totalVotes: number;
    votedOptionId?: string;
  };
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
}

export interface BackendComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'gif' | 'audio' | null;
  mediaDuration?: number | null;
  likes?: number;
  likedByMe?: boolean;
  repliesCount?: number;
  parentId?: string | null;
  replies?: Array<{ id: string; authorId: string; content: string; createdAt: string }>;
  author?: { id: string; username: string; fullName: string; avatarUrl: string | null };
}

export interface BackendCommunity {
  coverUrl?: string | null;
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  moderators: string[];
  memberIds: string[];
  memberCount?: number;
  isMember?: boolean;
  createdAt: string;
  genre?: string | null;
  visibility?: 'public' | 'private' | 'invite-only';
  contentRating?: ContentRating;
}

export interface BackendCommunityDiscussion {
  id: string;
  title: string;
  content: string;
  tag: string;
  repliesCount: number;
  likes: number;
  createdAt: string;
  likedByMe?: boolean;
  author: { id: string; username: string; fullName: string; avatarUrl: string | null };
  contentRating?: ContentRating;
}

export interface BackendEvent {
  id: string;
  hostId: string;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  startsAt: string;
  location: string;
  isOnline: boolean;
  attendeeIds: string[];
  interestedIds: string[];
  attendeeCount?: number;
  interestedCount?: number;
  contentRating?: ContentRating;
}

export interface BackendProduct {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: string;
  createdAt: string;
  savedByMe?: boolean;
  availability?: 'active' | 'reserved' | 'sold';
  contentRating?: ContentRating;
}

export interface BackendMarketplaceOrder {
  id: string;
  productId: string | null;
  productSnapshot?: { id?: string; title?: string };
  buyerId: string | null;
  sellerId: string | null;
  providerOrderId: string;
  amountMinor: number;
  refundedAmountMinor?: number;
  currency: string;
  status: 'provider_pending' | 'created' | 'paid' | 'fulfilled' | 'refund_required' | 'refunded' | 'cancelled' | 'failed';
  shippingName: string;
  shippingAddress: string;
  shippingPhone?: string | null;
  createdAt: string;
  paidAt?: string | null;
  fulfilledAt?: string | null;
}

export interface BackendArticle {
  id: string;
  authorId: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  readTime: number;
  claps: number;
  createdAt: string;
  contentCategory?: ContentCategory;
  collection?: string | null;
  contentRating?: ContentRating;
}

export interface BackendVideo {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  views: number;
  likes: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  createdAt: string;
  type: string;
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
}

export interface BackendLiveStream {
  id: string;
  hostId: string;
  title: string;
  coverUrl: string;
  kind: string;
  status: string;
  viewers: number;
  startsAt: string;
  category: string;
  guestIds: string[];
  contentRating?: ContentRating;
}

export interface BackendConversation {
  id: string;
  participantA: string;
  participantB: string;
  participantIds: string[];
  isGroup: boolean;
  title: string | null;
  vanishMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | null;
  mediaDuration?: number | null;
  mediaLegacy?: boolean;
  textStyleId?: 'default' | 'mono' | 'rounded';
  createdAt: string;
  seenAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  expiresAt: string | null;
  replyToId?: string | null;
  reactions?: Record<string, string[]> | null;
  pinned?: boolean | null;
  messageState?: 'MESSAGE_DELIVERED' | 'MESSAGE_PREVIEWED' | 'MESSAGE_OPENED' | 'MESSAGE_READ';
  previewedAt?: string | null;
}

export interface BackendNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  createdAt: string;
  readAt: string | null;
  metadata?: { actorId?: string };
}
