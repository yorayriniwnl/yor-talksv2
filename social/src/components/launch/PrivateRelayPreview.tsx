import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCheck, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import './private-relay-preview.css';

const JOURNEY = [
  {
    label: 'On your device',
    title: 'Your words start with you.',
    description: 'Start with a message on your device. It is encrypted here before it leaves.',
    action: 'Seal the message',
  },
  {
    label: 'Sealed in transit',
    title: 'We carry the connection.',
    description: 'Yor routes the sealed message. It sees delivery details, but the contents stay encrypted.',
    action: 'Open on their device',
  },
  {
    label: 'With your person',
    title: 'Their eyes. Your conversation.',
    description: 'Their device opens the message with their key. Readable text belongs at the two ends of the connection.',
    action: 'Replay',
  },
] as const;

export default function PrivateRelayPreview() {
  const [step, setStep] = useState(0);
  const current = JOURNEY[step];

  return (
    <div className="yr-preview" data-step={step} role="region" aria-label="How private delivery works">
      <div className="yr-preview-eyebrow">
        <span><span className="yr-live-dot" aria-hidden="true" />PRIVATE DELIVERY</span>
        <span className="yr-concept-tag">ILLUSTRATED EXAMPLE</span>
      </div>

      <div className="yr-scene" aria-hidden="true">
        <div className="yr-scene-halo" />
        <div className="yr-scene-grid" />
        <svg className="yr-orbit" viewBox="0 0 620 400" fill="none" preserveAspectRatio="none">
          <ellipse cx="310" cy="205" rx="254" ry="134" transform="rotate(-19 310 205)" />
          <ellipse className="yr-orbit-inner" cx="310" cy="205" rx="215" ry="102" transform="rotate(-19 310 205)" />
          <path className="yr-delivery-path" d="M 160 160 C 230 130 250 166 310 200 S 410 250 470 225" />
        </svg>
        <span className="yr-orbit-spark yr-orbit-spark--one" />
        <span className="yr-orbit-spark yr-orbit-spark--two" />

        <div className="yr-device yr-device--sender">
          <div className="yr-device-topline"><span className="yr-device-camera" /><span>yor talks</span><LockKeyhole size={12} /></div>
          <div className="yr-device-person">
            <div className="yr-person-mark yr-person-mark--sender">Y<span /></div>
            <strong>You</strong>
            <span>Your side of the conversation</span>
          </div>
          <div className="yr-message yr-message--sent">
            <span>Coffee at 6?</span>
            <small>{step === 0 ? 'Your draft' : 'Sent'} {step > 0 && <CheckCheck size={12} />}</small>
          </div>
          <div className="yr-device-footer"><LockKeyhole size={12} /><span>Your copy stays with you.</span></div>
        </div>

        <div className="yr-relay">
          <div className="yr-relay-orbit" />
          <div className="yr-relay-core"><span>yor<span className="yr-relay-star">✳</span></span></div>
          <span className="yr-relay-label">{step === 1 ? 'Sealed content only' : 'Delivery service'}</span>
        </div>
        <div className="yr-sealed-packet" hidden={step !== 1}><LockKeyhole size={13} /><span>Sealed</span></div>

        <div className="yr-device yr-device--recipient">
          <div className="yr-device-topline"><span className="yr-device-camera" /><span>yor talks</span><LockKeyhole size={12} /></div>
          <div className="yr-device-person">
            <div className="yr-person-mark yr-person-mark--recipient">P<span /></div>
            <strong>Your person</strong>
            <span>The other side of a good day</span>
          </div>
          <div className="yr-recipient-content">
            {step === 2 ? <>
              <div className="yr-message yr-message--received"><span>Coffee at 6?</span><small>Opened here <CheckCheck size={12} /></small></div>
              <div className="yr-message yr-message--reply"><span>Always. <span className="yr-message-heart">♡</span></span></div>
            </> : <div className="yr-message-waiting"><LockKeyhole size={17} /><span>{step === 0 ? 'No message yet' : 'Waiting to open'}</span><i /><i /></div>}
          </div>
          <div className="yr-device-footer"><ShieldCheck size={12} /><span>{step === 2 ? 'Opened on this device.' : 'Their key stays here.'}</span></div>
        </div>
        <span className="yr-endpoint yr-endpoint--sender">YOU</span>
        <span className="yr-endpoint yr-endpoint--recipient">YOUR PEOPLE <ArrowUpRight size={12} /></span>
      </div>

      <div className="yr-journey">
        <ol className="yr-journey-steps" aria-label="Message journey">
          {JOURNEY.map((item, index) => (
            <li key={item.label} className={index === step ? 'is-current' : index < step ? 'is-complete' : undefined} aria-current={index === step ? 'step' : undefined}>
              <span className="yr-step-number">{index < step ? <Check size={11} aria-hidden="true" /> : index + 1}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ol>
        <div className="yr-journey-detail">
          <div className="yr-journey-copy" aria-live="polite" aria-atomic="true">
            <strong>{current.title}</strong>
            <p>{current.description}</p>
          </div>
          <button
            className="yr-follow-button"
            type="button"
            onClick={() => setStep(value => (value + 1) % JOURNEY.length)}
            aria-label={step === 2 ? 'Replay the message journey' : current.action}
          >
            <span>{current.action}</span>
            {step === 2 ? <RotateCcw size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <p className="yr-preview-note">An interactive explanation using a sample conversation. Nothing is encrypted or sent by this preview.</p>
    </div>
  );
}
