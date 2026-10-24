import * as React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Check, Download, FileKey2, KeyRound, LoaderCircle, LockKeyhole, Paperclip, Search, Send, ShieldCheck, Unlock, X } from 'lucide-react';
import { api, ApiError, onStoredTokensChange, type BackendUser } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { privateChatApi, type PrivateChatEnvelope, type PrivateChatPublicIdentity, type PrivateChatThread, type PrivateChatThreadDetail } from '@/lib/private-chat-api';
import { generateIdentity, unlockIdentity, lockIdentity, sealMessage, openMessage, validatePublicKey, parseIdentityBackup, MAX_PRIVATE_ATTACHMENT_BYTES, type IdentityBackup, type PrivateIdentity } from '@/lib/private-chat-crypto';
import { loadPrivateBackup, savePrivateBackup, isPrivatePeerVerified, verifyPrivatePeer, formatFingerprint } from '@/lib/private-chat-vault';
import '@/styles/private-messages.css';

type PlainPayload = { text: string; attachment?: { name: string; type: string; dataBase64: string } };
type DisplayMessage = { envelope: PrivateChatEnvelope; payload?: PlainPayload; failed?: boolean };
type PendingSend = { threadId: string; id: string; ciphertext: string };
const humanError = (error: unknown) => error instanceof ApiError ? error.message : 'That could not be completed. Your message has not been sent as readable text. Please try again.';
const publicName = (user: BackendUser) => user.fullName || user.username || 'Member';

function downloadFile(contents: Blob, filename: string) {
  const url = URL.createObjectURL(contents);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadRecovery(backup: IdentityBackup) {
  downloadFile(new Blob([JSON.stringify(backup)], { type: 'application/json' }), 'yor-private-chat-recovery.json');
}
function saveAttachment(attachment: NonNullable<PlainPayload['attachment']>) {
  const raw = atob(attachment.dataBase64);
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  // Always download; never execute HTML/SVG or render a sender-controlled URL.
  const name = attachment.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '') || 'attachment';
  downloadFile(new Blob([bytes], { type: 'application/octet-stream' }), name);
}
async function readAttachment(file: File): Promise<NonNullable<PlainPayload['attachment']>> {
  if (!file.size) throw new Error('Choose a file that is not empty.');
  if (file.size > MAX_PRIVATE_ATTACHMENT_BYTES) throw new Error('Choose a file of 512 KB or less.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let raw = '';
  for (let index = 0; index < bytes.length; index += 8192) raw += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return { name: file.name.slice(0, 180), type: file.type || 'application/octet-stream', dataBase64: btoa(raw) };
}

export default function PrivateMessages() {
  const userId = useAppStore(state => state.currentUser?.id);
  // A different account must get a different component and local vault.
  return userId ? <PrivateInbox key={userId} userId={userId} /> : <div className="pc-page"><Link href="/auth">Sign in to open private chats</Link></div>;
}

function PrivateInbox({ userId }: { userId: string }) {
  const [registered, setRegistered] = React.useState<PrivateChatPublicIdentity | null | undefined>();
  const [backup, setBackup] = React.useState<IdentityBackup | null>(() => loadPrivateBackup(userId));
  const [identity, setIdentity] = React.useState<PrivateIdentity | null>(null);
  const [passphrase, setPassphrase] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [generated, setGenerated] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);
  const [savedRecovery, setSavedRecovery] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [threads, setThreads] = React.useState<PrivateChatThread[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<PrivateChatThreadDetail | null>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<BackendUser[]>([]);
  const [verified, setVerified] = React.useState(false);
  const [verifyInput, setVerifyInput] = React.useState('');
  const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
  const [draft, setDraft] = React.useState('');
  const [attachment, setAttachment] = React.useState<PlainPayload['attachment']>();
  const [pending, setPending] = React.useState<PendingSend | null>(null);
  const [sending, setSending] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);
  const identityRef = React.useRef<PrivateIdentity | null>(null);
  const alive = React.useRef(true);
  const operation = React.useRef(0);
  const sendLock = React.useRef(false);
  const selectedRef = React.useRef(selected);
  selectedRef.current = selected;
  const bottom = React.useRef<HTMLDivElement>(null);
  const peer = detail?.members.find(member => member.userId !== userId);

  const lock = React.useCallback(() => {
    operation.current++;
    if (identityRef.current) lockIdentity(identityRef.current);
    identityRef.current = null;
    setIdentity(null); setDetail(null); setSelected(null); setMessages([]);
    setDraft(''); setAttachment(undefined); setPending(null); setPassphrase(''); setConfirmation('');
    setBusy(false); setSending(false); sendLock.current = false;
    setVerified(false); setVerifyInput(''); setError('');
  }, []);

  React.useEffect(() => {
    alive.current = true;
    let backgroundTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onStoredTokensChange(token => { if (!token) lock(); });
    const onVisibility = () => {
      if (backgroundTimer) clearTimeout(backgroundTimer);
      if (document.hidden) backgroundTimer = setTimeout(lock, 60_000);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', lock);
    // Navigation, logout and prolonged backgrounding discard the unlocked key.
    return () => {
      alive.current = false; operation.current++; unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', lock);
      if (backgroundTimer) clearTimeout(backgroundTimer);
      if (identityRef.current) lockIdentity(identityRef.current);
      identityRef.current = null;
    };
  }, [lock]);

  React.useEffect(() => {
    let active = true;
    privateChatApi.identity().then(value => { if (active) setRegistered(value); })
      .catch(cause => { if (active) setError(humanError(cause)); });
    return () => { active = false; };
  }, [userId, refresh]);

  React.useEffect(() => {
    if (!identity) return;
    let active = true;
    const update = async () => {
      try {
        const response = await privateChatApi.threads();
        if (!active) return;
        setThreads(response.items);
        const ids = [...new Set(response.items.flatMap(item => item.participantIds))].filter(id => id !== userId);
        await Promise.allSettled(ids.map(async id => {
          const user = await api.getProfile(id);
          if (active) setNames(previous => ({ ...previous, [id]: publicName(user) }));
        }));
      } catch (cause) { if (active) setError(humanError(cause)); }
    };
    void update();
    return () => { active = false; };
  }, [identity, refresh, userId]);

  React.useEffect(() => {
    if (!identity || query.trim().length < 2) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      api.searchUsers(query.trim()).then(users => {
        if (active) setResults(users.filter(user => user.id !== userId));
      }).catch(() => { if (active) setNotice('People could not load. Try searching again.'); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, identity, userId]);

  React.useEffect(() => {
    if (!identity || !selected) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cursor: string | null = null;
    setDetail(null); setMessages([]); setVerified(false); setVerifyInput(''); setError('');
    const load = async () => {
      try {
        // Recheck current membership and identities at every poll.
        const current = await privateChatApi.thread(selected);
        await Promise.all(current.members.map(member => validatePublicKey(member)));
        const self = current.members.find(member => member.userId === userId);
        const other = current.members.find(member => member.userId !== userId);
        if (!self || !other || current.members.length !== 2 || self.fingerprint !== identity.fingerprint) throw new Error('Identity mismatch');
        if (!active) return;
        setDetail(current);
        const trusted = isPrivatePeerVerified(userId, other.userId, other.fingerprint);
        setVerified(trusted);
        // A valid signature only proves the directory key signed the message.
        // Independently verify that key before attributing incoming text to a person.
        if (!trusted) { cursor = null; setMessages([]); return; }
        let pageCount = 0;
        do {
          const page = await privateChatApi.messages(selected, cursor);
          const decoded = await Promise.all(page.items.map(async envelope => {
            try {
              const sender = current.members.find(member => member.userId === envelope.senderId);
              if (!sender || envelope.threadId !== selected) throw new Error('Unexpected sender');
              const payload = await openMessage(identity, {
                id: envelope.id, threadId: selected, senderId: envelope.senderId,
                recipientIds: [...current.thread.participantIds].sort(),
              }, sender, envelope.ciphertext);
              return { envelope, payload };
            } catch { return { envelope, failed: true }; }
          }));
          if (!active) return;
          setMessages(previous => {
            const values = new Map(previous.map(message => [message.envelope.id, message]));
            decoded.forEach(message => values.set(message.envelope.id, message));
            return [...values.values()].sort((a, b) => a.envelope.createdAt.localeCompare(b.envelope.createdAt) || a.envelope.id.localeCompare(b.envelope.id));
          });
          if (!page.items.length || !page.nextCursor || page.nextCursor === cursor) break;
          cursor = page.nextCursor;
          if (!page.hasMore) break;
          pageCount++;
        } while (active && pageCount < 10);
      } catch (cause) {
        if (!active) return;
        setError(humanError(cause));
        if (!(cause instanceof ApiError) || [401, 403, 404, 409].includes(cause.status)) {
          cursor = null;
          setMessages([]); setDetail(null); setVerified(false);
        }
      } finally {
        if (active) timer = setTimeout(() => {
          if (document.hidden || !navigator.onLine) timer = setTimeout(load, 5000);
          else void load();
        }, 5000);
      }
    };
    void load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [identity, selected, userId, refresh]);

  React.useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

  async function makeKey() {
    if (busy) return;
    if (passphrase !== confirmation) { setError('The recovery passphrases do not match.'); return; }
    if (passphrase.length < 16 || new Set(passphrase).size < 8) { setError('Use at least 16 characters with 8 different characters. Several random words work well.'); return; }
    const version = operation.current;
    setBusy(true); setError('');
    try {
      const created = await generateIdentity(userId, passphrase);
      if (!alive.current || version !== operation.current) return;
      setBackup(created); setGenerated(true); setDownloaded(false); setSavedRecovery(false);
      setNotice('Your recovery key was created on this device. Save its protected file before activating private chats.');
    } catch { if (alive.current) setError('Your key could not be created. Please use a secure, supported browser and try again.'); }
    finally { if (alive.current && version === operation.current) setBusy(false); }
  }

  async function unlock() {
    if (busy || !backup) return;
    if (generated && (!downloaded || !savedRecovery)) { setError('Download your recovery file and confirm that you saved it first.'); return; }
    const version = operation.current;
    setBusy(true); setError('');
    let opened: PrivateIdentity | null = null;
    try {
      opened = await unlockIdentity(userId, backup, passphrase);
      const current = await privateChatApi.identity();
      if (current && current.fingerprint !== opened.fingerprint) throw new Error('This recovery key does not match the account.');
      if (!alive.current || version !== operation.current) { lockIdentity(opened); return; }
      const enrolled = current ?? await privateChatApi.enroll(opened.publicKey, opened.fingerprint);
      if (!alive.current || version !== operation.current) { lockIdentity(opened); return; }
      if (enrolled.fingerprint !== opened.fingerprint || enrolled.publicKey !== opened.publicKey) throw new Error('The public key could not be confirmed.');
      setRegistered(enrolled); identityRef.current = opened; setIdentity(opened);
      const stored = savePrivateBackup(backup);
      setPassphrase(''); setConfirmation(''); setGenerated(false);
      setNotice(stored ? 'Unlocked on this tab. Your private key and passphrase stay on your device.' : 'Unlocked for this tab. Browser storage is unavailable; keep your recovery file to unlock again.');
    } catch {
      if (opened) lockIdentity(opened);
      if (alive.current && version === operation.current) setError('Could not unlock. Check your passphrase and use the recovery file originally created for this account.');
    } finally { if (alive.current && version === operation.current) setBusy(false); }
  }

  async function importRecovery(file?: File) {
    if (!file) return;
    setError('');
    try {
      if (file.size > 150_000) throw new Error('Too large');
      const value = parseIdentityBackup(await file.text());
      if (value?.userId !== userId || value?.version !== 1) throw new Error('Wrong account');
      if (!alive.current) return;
      setBackup(value); setGenerated(false); setPassphrase('');
      setNotice('Recovery file loaded locally. Enter its passphrase to unlock.');
    } catch { setError('Choose a valid Yor recovery file for this account.'); }
  }

  async function startThread(user: BackendUser) {
    if (busy || pending || sendLock.current) return;
    setBusy(true); setError('');
    const version = operation.current;
    try {
      const created = await privateChatApi.createThread(user.id);
      if (!alive.current || version !== operation.current) return;
      setNames(previous => ({ ...previous, [user.id]: publicName(user) }));
      setThreads(previous => [created.thread, ...previous.filter(item => item.id !== created.thread.id)]);
      setQuery(''); setResults([]); setDraft(''); setAttachment(undefined); setSelected(created.thread.id);
    } catch (cause) { if (alive.current) setError(humanError(cause)); }
    finally { if (alive.current) setBusy(false); }
  }

  function confirmFingerprint() {
    if (!peer) return;
    const entered = verifyInput.replace(/\s/g, '').toLowerCase();
    if (entered !== peer.fingerprint) { setError('The fingerprint does not match. Check it directly with the other person.'); return; }
    if (!verifyPrivatePeer(userId, peer.userId, peer.fingerprint)) { setError('This browser cannot save verification. Enable local storage before sending.'); return; }
    setVerified(true); setVerifyInput(''); setError(''); setNotice('Fingerprint verified on this device.');
    setRefresh(value => value + 1);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!identity || !detail || !peer || !verified || sendLock.current || (!draft.trim() && !attachment && !pending)) return;
    sendLock.current = true; setSending(true); setError('');
    const version = operation.current;
    try {
      let sealed = pending;
      if (!sealed) {
        const current = await privateChatApi.thread(detail.thread.id);
        if (current.members.length !== 2 || current.members.some(member =>
          !detail.members.some(known => known.userId === member.userId && known.fingerprint === member.fingerprint && known.publicKey === member.publicKey))) throw new Error('The conversation keys changed.');
        const id = crypto.randomUUID();
        const ciphertext = await sealMessage(identity, {
          id, threadId: detail.thread.id, senderId: userId, recipientIds: [...detail.thread.participantIds].sort(),
        }, detail.members, { text: draft.trim(), ...(attachment ? { attachment } : {}) });
        sealed = { id, threadId: detail.thread.id, ciphertext };
        if (!alive.current || version !== operation.current) return;
        setPending(sealed);
      }
      await privateChatApi.send(sealed.threadId, { id: sealed.id, ciphertext: sealed.ciphertext });
      if (!alive.current || version !== operation.current) return;
      setPending(null); setDraft(''); setAttachment(undefined);
      setRefresh(value => value + 1); setNotice('Encrypted message sent.');
    } catch (cause) { if (alive.current && version === operation.current) setError(humanError(cause)); }
    finally { if (alive.current && version === operation.current) { sendLock.current = false; setSending(false); } }
  }

  return <section className="pc-page" aria-labelledby="pc-title">
    <header className="pc-header">
      <div><p className="pc-eyebrow"><ShieldCheck size={15} /> DEVICE-TO-DEVICE ENCRYPTION</p><h1 id="pc-title">Private chats</h1><p>A conversation for the two of you.</p></div>
      <div className="pc-header-actions"><Link href="/messages"><ArrowLeft size={16} /> Standard messages</Link>{identity && <button onClick={lock}><LockKeyhole size={16} /> Lock this tab</button>}</div>
    </header>
    <p className="pc-scope">Private chats are separate from standard messages and previous history. Text and attached files are encrypted on your device. Yor still sees account and delivery information.</p>
    {error && <div className="pc-error" role="alert">{error}{registered === undefined && <button onClick={() => setRefresh(value => value + 1)}>Retry connection</button>}</div>}
    <p className="pc-notice" role="status">{notice}</p>
    {!identity ? <div className="pc-setup">
      <div className="pc-key-story"><div className="pc-key-art"><KeyRound size={66} strokeWidth={1.2} /></div><h2>Your key.<br />Your conversation.</h2><p>Your recovery file holds a passphrase-protected private key. Only its public counterpart is registered with Yor Talks.</p><ul><li><Check size={15} /> Keep the recovery file somewhere safe.</li><li><Check size={15} /> Remember its separate passphrase.</li><li><Check size={15} /> Import both to use another device.</li></ul><p className="pc-note">Yor cannot recover a lost private key or passphrase. Account password resets do not unlock private-chat history.</p></div>
      <div className="pc-key-form">
        <h2>{registered === undefined ? 'Connecting securely…' : backup ? 'Unlock your conversations' : registered ? 'Restore your key' : 'Set up private chats'}</h2>
        {registered !== undefined && <>
          {(!registered || backup) && <>
            <label htmlFor="pc-passphrase">Recovery passphrase</label><input id="pc-passphrase" type="password" autoComplete="off" maxLength={1024} value={passphrase} onChange={event => setPassphrase(event.target.value)} disabled={busy} />
            {!backup && !registered && <><label htmlFor="pc-confirm">Confirm your recovery passphrase</label><input id="pc-confirm" type="password" autoComplete="off" value={confirmation} maxLength={1024} onChange={event => setConfirmation(event.target.value)} disabled={busy} /><p className="pc-note">At least 16 characters and 8 different characters. Use several random words, separate from your account password.</p></>}
          </>}
          {generated && backup && <div className="pc-recovery-save"><button onClick={() => { downloadRecovery(backup); setDownloaded(true); }}><Download size={16} /> Download recovery file</button><label><input type="checkbox" checked={savedRecovery} onChange={event => setSavedRecovery(event.target.checked)} /> I saved this file and can remember its passphrase.</label></div>}
          {backup ? <button className="pc-primary" onClick={() => void unlock()} disabled={busy || !passphrase || (generated && (!downloaded || !savedRecovery))}>{busy ? <LoaderCircle className="pc-spin" size={17} /> : <Unlock size={17} />}{generated ? 'Activate private chats' : 'Unlock this tab'}</button> : !registered && <button className="pc-primary" onClick={() => void makeKey()} disabled={busy}>{busy ? <LoaderCircle className="pc-spin" size={17} /> : <KeyRound size={17} />} Create my protected key</button>}
          <label className="pc-file-button"><FileKey2 size={17} /> Import a recovery file<input type="file" accept=".json,application/json" onChange={event => { void importRecovery(event.target.files?.[0]); event.target.value = ''; }} disabled={busy} /></label>
        </>}
      </div>
    </div> : <div className={`pc-inbox${selected ? ' pc-inbox--selected' : ''}`}>
      <aside className="pc-sidebar">
        <h2>Your private conversations</h2>
        <label className="pc-search"><Search size={16} /><input aria-label="Find someone for a private chat" placeholder="Find someone you know" value={query} onChange={event => setQuery(event.target.value)} disabled={busy || !!pending || sending} /></label>
        <p className="pc-note">Both people need a key and an accepted contact connection.</p>
        {results.length > 0 && <div className="pc-search-results" aria-label="People found">{results.map(user => <button key={user.id} onClick={() => void startThread(user)} disabled={busy || !!pending || sending}><span>{publicName(user)}</span><small>@{user.username}</small><LockKeyhole size={15} /></button>)}</div>}
        <div className="pc-thread-list">{threads.map(thread => {
          const otherId = thread.participantIds.find(id => id !== userId)!;
          return <button key={thread.id} className={selected === thread.id ? 'is-active' : ''} disabled={!!pending || sending} onClick={() => { setDraft(''); setAttachment(undefined); setSelected(thread.id); }}><span className="pc-avatar">{(names[otherId] || 'P')[0].toUpperCase()}</span><span><strong>{names[otherId] || 'Private conversation'}</strong><small>Encrypted on your devices</small></span><LockKeyhole size={15} /></button>;
        })}{!threads.length && <p className="pc-empty-note">Your first private conversation starts with someone you trust.</p>}</div>
        <details className="pc-my-key"><summary>Your fingerprint &amp; recovery</summary><p>Share this fingerprint directly with the other person so they can verify your key.</p><code>{formatFingerprint(identity.fingerprint)}</code><button onClick={() => void navigator.clipboard.writeText(formatFingerprint(identity.fingerprint)).then(() => setNotice('Your fingerprint was copied.')).catch(() => setNotice('Select the displayed fingerprint to copy it.'))}>Copy my fingerprint</button>{backup && <button onClick={() => downloadRecovery(backup)}><Download size={15} /> Download recovery file</button>}</details>
      </aside>
      <div className="pc-thread">
        {!selected ? <div className="pc-thread-empty"><LockKeyhole size={45} strokeWidth={1.3} /><h2>Just between you.</h2><p>Choose a conversation or find a contact. Messages are signed and encrypted before leaving this device.</p></div> : <>
          <header className="pc-thread-header"><button className="pc-back-inbox" aria-label="Back to private conversations" disabled={!!pending || sending} onClick={() => setSelected(null)}><ArrowLeft size={18} /></button><div><h2>{peer ? names[peer.userId] || 'Private conversation' : 'Opening conversation…'}</h2><p><LockKeyhole size={12} /> {verified ? 'Fingerprint verified on this device' : 'Verify the other person to read and send'}</p></div></header>
          {peer && !verified && <div className="pc-verification"><h3>Check who is on the other side.</h3><p>Ask this person for their key fingerprint through a trusted channel or in person. Enter the fingerprint they provide. It must match the key registered for this conversation.</p><label htmlFor="pc-peer-fingerprint">Fingerprint received directly from them</label><input id="pc-peer-fingerprint" value={verifyInput} onChange={event => setVerifyInput(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Groups of letters and numbers" /><button onClick={confirmFingerprint}>Verify fingerprint <ShieldCheck size={16} /></button></div>}
          <div className="pc-messages" aria-label="Private message history">{messages.map(message => <article key={message.envelope.id} className={`pc-message ${message.envelope.senderId === userId ? 'pc-message--mine' : ''}`}><span className="pc-message-author">{message.envelope.senderId === userId ? 'You' : peer ? names[peer.userId] || 'Your contact' : 'Your contact'}</span>{message.failed ? <p className="pc-unverified">This message could not be verified and decrypted. Its content is hidden.</p> : <>{message.payload?.text && <p>{message.payload.text}</p>}{message.payload?.attachment && <button className="pc-attachment" onClick={() => saveAttachment(message.payload!.attachment!)}><Download size={16} />{message.payload.attachment.name}</button>}</>}<time dateTime={message.envelope.createdAt}>{new Date(message.envelope.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></article>)}<div ref={bottom} /></div>
          {selected && <form className="pc-composer" onSubmit={send}>
            {attachment && <div className="pc-selected-file"><Paperclip size={14} />{attachment.name}<button type="button" aria-label="Remove attached file" onClick={() => setAttachment(undefined)} disabled={!!pending || sending}><X size={16} /></button></div>}
            {pending && <div className="pc-pending"><p className="pc-note">Delivery is awaiting confirmation. Retry sends the same encrypted message, so it won’t create a duplicate.</p><button type="button" disabled={sending} onClick={() => {
              setPending(null); setDraft(''); setAttachment(undefined);
              setNotice('Pending delivery dismissed. It may already have arrived. Check with the recipient before sending it again.');
            }}>Dismiss pending delivery</button></div>}
            <label htmlFor="pc-draft" className="pc-visually-hidden">Private message</label><textarea id="pc-draft" placeholder={verified ? 'Write something just for them…' : 'Verify their fingerprint to read and send'} maxLength={4000} value={draft} onChange={event => setDraft(event.target.value)} disabled={!verified || !!pending || sending} />
            <div><label className={`pc-attach${!verified || !!pending || sending ? ' pc-disabled' : ''}`}><Paperclip size={18} /><span>File · up to 512 KB</span><input type="file" aria-label="Attach an encrypted file" disabled={!verified || !!pending || sending} onChange={event => {
              const file = event.target.files?.[0]; event.target.value = '';
              const threadAtSelection = selected, version = operation.current;
              if (file) void readAttachment(file).then(value => {
                if (alive.current && version === operation.current && threadAtSelection === selectedRef.current && !sendLock.current) setAttachment(value);
              }).catch(cause => { if (alive.current && version === operation.current) setError(cause.message); });
            }} /></label><button className="pc-primary" type="submit" disabled={!verified || !detail || sending || (!draft.trim() && !attachment && !pending)}>{sending ? <LoaderCircle className="pc-spin" size={17} /> : <Send size={17} />}{pending ? 'Retry encrypted delivery' : 'Send privately'}</button></div>
          </form>}
        </>}
      </div>
    </div>}
    <details className="pc-explanation"><summary>How private chats protect your messages</summary><p>Private chats use signed OpenPGP encryption for one-to-one text and files up to 512 KB. Your private key is unlocked only in this browser tab. The server stores encrypted envelopes and public keys; it still knows the accounts involved, message timing and sizes.</p><p>This mode does not upgrade standard chat history, group chats or calls. It does not currently offer forward secrecy, automatic key rotation, or provider-assisted recovery. An unlocked or compromised device can expose content. Verify fingerprints independently; the first public-key lookup alone does not prove a person’s identity.</p><p>Saving a file or sharing a message for a report discloses that content to the recipient you choose. <Link href="/grievance">Contact support or report a concern</Link>.</p></details>
  </section>;
}
