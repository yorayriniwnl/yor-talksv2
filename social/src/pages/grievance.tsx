import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, FileText, CheckCircle2, Clock, 
  Search, Mail, Building, Scale, ArrowRight, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { publicBetaConfig } from '@/lib/public-beta-config';

type GrievanceField = 'reporterName' | 'reporterEmail' | 'reportedUrl' | 'description';
type GrievanceErrors = Partial<Record<GrievanceField, string>>;

export default function GrievancePortal() {
  const [activeTab, setActiveTab] = useState<'file' | 'track'>('file');
  
  // Form State
  const [category, setCategory] = useState<'copyright' | 'hate_speech' | 'harassment' | 'impersonation' | 'privacy_violation' | 'other'>('harassment');
  const [reportedUrl, setReportedUrl] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<GrievanceErrors>({});
  const [formError, setFormError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Track State
  const [trackTicketId, setTrackTicketId] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState<any>(null);
  const [trackError, setTrackError] = useState('');

  const clearFieldError = (field: GrievanceField) => {
    setFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError('');
  };

  const handleFileGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: GrievanceErrors = {};
    if (!reporterName.trim()) nextErrors.reporterName = 'Enter the name a reviewer can use to contact you.';
    if (!reporterEmail.trim()) nextErrors.reporterEmail = 'Add an email address for ticket updates.';
    else if (!/^\S+@\S+\.\S+$/.test(reporterEmail.trim())) nextErrors.reporterEmail = 'Check the email format and try again.';
    if (!reportedUrl.trim()) nextErrors.reportedUrl = 'Add the post, Reel, profile, or username you are reporting.';
    if (!description.trim()) nextErrors.description = 'Add a short explanation and any useful evidence.';
    else if (description.trim().length < 20) nextErrors.description = 'Give the reviewer a little more context (at least 20 characters).';

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setFormError('A few details need attention. Everything you entered is still here.');
      toast.error('Check the highlighted fields before submitting.');
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setSubmitting(true);
    setFormErrors({});
    setFormError('');
    sounds.playPop();

    try {
      const res = await api.request<any>('/reports/grievance', {
        method: 'POST',
        body: JSON.stringify({ category, reportedUrl, reporterName, reporterEmail, description }),
      });
      const ticket = res;

      setSubmittedTicket(ticket);
      sounds.playChime();
      triggerConfetti();
      toast.success(`Grievance ticket ${ticket.ticketId} received.`);
    } catch (err: any) {
      const message = err instanceof Error && err.message ? err.message : 'We could not submit this report right now.';
      setFormError(`${message} Your draft is still here, so you can retry safely.`);
      toast.error('We could not submit this report. Your draft is still here.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTicketId.trim()) {
      setTrackError('Enter the ticket ID from your acknowledgement email.');
      toast.error('Add a ticket ID to begin tracking.');
      return;
    }

    setTrackingLoading(true);
    setTrackError('');
    setTrackedTicket(null);
    sounds.playPop();

    try {
      const ticket = await api.request<any>(`/reports/grievance/${encodeURIComponent(trackTicketId.trim())}`);
      setTrackedTicket(ticket);
    } catch (error) {
      setTrackError('We could not find that ticket right now. Check the ID or try again in a moment.');
      toast.error('Ticket lookup needs another try.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="operator-grievance-page w-full max-w-5xl mx-auto p-4 lg:p-8 font-sans">
      {/* Header */}
      <div className="operator-grievance__header text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-1 border border-primary/30 text-primary text-xs font-mono font-bold mb-3">
          <Scale className="w-3.5 h-3.5" /> Trust, safety & grievance intake
        </div>
        <h1 className="font-display font-black text-3xl lg:text-4xl text-foreground tracking-tight">
          <span id="grievance-title">Grievance Redressal & Trust Portal 🇮🇳</span>
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-2">
          Submit a report to the Yor Talks trust queue. You will receive a ticket ID, status updates, and a human-review path.
        </p>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2 mt-6">
          <Button
            variant={activeTab === 'file' ? 'default' : 'outline'}
            onClick={() => setActiveTab('file')}
            aria-pressed={activeTab === 'file'}
            className="w-full sm:w-auto rounded-2xl text-xs font-bold px-6 h-10 cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1.5" /> File a Grievance
          </Button>
          <Button
            variant={activeTab === 'track' ? 'default' : 'outline'}
            onClick={() => setActiveTab('track')}
            aria-pressed={activeTab === 'track'}
            className="w-full sm:w-auto rounded-2xl text-xs font-bold px-6 h-10 cursor-pointer"
          >
            <Search className="w-4 h-4 mr-1.5" /> Track Existing Ticket
          </Button>
        </div>
      </div>

      {activeTab === 'file' ? (
        submittedTicket ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            role="status"
            className="operator-grievance-success max-w-xl mx-auto p-6 rounded-3xl glass-heavy border border-emerald-500/40 text-center space-y-4 shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display font-black text-2xl text-foreground">Grievance Ticket Acknowledged</h3>
            <p className="text-xs text-muted-foreground">
              Your report has been logged in the Yor Talks trust queue. Keep this ticket ID for status tracking.
            </p>

            <div className="surface-1 p-4 rounded-2xl border border-border/40 text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket ID:</span>
                <span className="font-bold text-primary">{submittedTicket.ticketId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{submittedTicket.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statutory SLA Deadline:</span>
                <span className="text-foreground">{new Date(submittedTicket.slaDeadline).toLocaleDateString()}</span>
              </div>
            </div>

            <Button
              onClick={() => { setSubmittedTicket(null); setReportedUrl(''); setDescription(''); setFormErrors({}); setFormError(''); }}
              className="rounded-xl text-xs font-bold"
            >
              Submit Another Report
            </Button>
          </motion.div>
        ) : (
          <form ref={formRef} noValidate onSubmit={handleFileGrievance} className="operator-grievance-form max-w-2xl mx-auto p-6 rounded-3xl glass-heavy border border-border/50 shadow-xl space-y-4">
            {formError && (
              <div role="alert" className="operator-grievance-alert">
                <AlertTriangle aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="operator-grievance-field space-y-1">
                <label htmlFor="reporterName" className="text-xs font-mono font-bold text-muted-foreground uppercase">Your Full Name *</label>
                <Input
                  id="reporterName"
                  required
                  autoComplete="name"
                  value={reporterName}
                  onChange={(e) => { setReporterName(e.target.value); clearFieldError('reporterName'); }}
                  aria-invalid={Boolean(formErrors.reporterName)}
                  aria-describedby={formErrors.reporterName ? 'reporterName-error' : undefined}
                  maxLength={120}
                  placeholder="e.g. Ayush Roy"
                  className="rounded-xl surface-2 border-border/40 text-xs h-10"
                />
                {formErrors.reporterName && <p id="reporterName-error" className="operator-grievance-field__error">{formErrors.reporterName}</p>}
              </div>

              <div className="operator-grievance-field space-y-1">
                <label htmlFor="reporterEmail" className="text-xs font-mono font-bold text-muted-foreground uppercase">Email Address *</label>
                <Input
                  id="reporterEmail"
                  type="email"
                  required
                  autoComplete="email"
                  value={reporterEmail}
                  onChange={(e) => { setReporterEmail(e.target.value); clearFieldError('reporterEmail'); }}
                  aria-invalid={Boolean(formErrors.reporterEmail)}
                  aria-describedby={formErrors.reporterEmail ? 'reporterEmail-error' : undefined}
                  maxLength={254}
                  placeholder="name@example.com"
                  className="rounded-xl surface-2 border-border/40 text-xs h-10"
                />
                {formErrors.reporterEmail && <p id="reporterEmail-error" className="operator-grievance-field__error">{formErrors.reporterEmail}</p>}
              </div>
            </div>

            <div className="operator-grievance-field space-y-1">
              <label htmlFor="category" className="text-xs font-mono font-bold text-muted-foreground uppercase">Violation Category *</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 rounded-xl surface-2 border border-border/40 px-3 text-xs text-foreground outline-none"
              >
                <option value="harassment">Harassment / Cyberbullying</option>
                <option value="hate_speech">Hate Speech & Discriminatory Content</option>
                <option value="impersonation">Identity Impersonation / Fake Profile</option>
                <option value="copyright">Copyright & Intellectual Property Infringement</option>
                <option value="privacy_violation">Privacy Violation / Non-Consensual Media</option>
                <option value="other">Other Statutory Violation</option>
              </select>
            </div>

            <div className="operator-grievance-field space-y-1">
              <label htmlFor="reportedUrl" className="text-xs font-mono font-bold text-muted-foreground uppercase">Reported Post / Reel / Profile URL *</label>
              <Input
                id="reportedUrl"
                required
                value={reportedUrl}
                onChange={(e) => { setReportedUrl(e.target.value); clearFieldError('reportedUrl'); }}
                aria-invalid={Boolean(formErrors.reportedUrl)}
                aria-describedby={formErrors.reportedUrl ? 'reportedUrl-error' : undefined}
                maxLength={2048}
                placeholder="https://yortalks.in/p/... or @username"
                className="rounded-xl surface-2 border-border/40 text-xs h-10"
              />
              {formErrors.reportedUrl && <p id="reportedUrl-error" className="operator-grievance-field__error">{formErrors.reportedUrl}</p>}
            </div>

            <div className="operator-grievance-field space-y-1">
              <label htmlFor="description" className="text-xs font-mono font-bold text-muted-foreground uppercase">Detailed Description & Evidence *</label>
              <textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); clearFieldError('description'); }}
                aria-invalid={Boolean(formErrors.description)}
                aria-describedby={formErrors.description ? 'description-error' : undefined}
                maxLength={5000}
                placeholder="Please describe the grievance in detail with specific timestamps or contextual evidence..."
                className="w-full rounded-xl surface-2 border border-border/40 p-3 text-xs text-foreground outline-none resize-none"
              />
              <div className="operator-grievance-field__meta"><span>{formErrors.description ? <span id="description-error" className="operator-grievance-field__error">{formErrors.description}</span> : 'Include context, timestamps, and evidence where possible.'}</span><span>{description.length}/5000</span></div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full rounded-2xl font-display font-extrabold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Grievance to Redressal Officer <ArrowRight className="w-4 h-4 ml-1.5" /></>}
            </Button>
          </form>
        )
      ) : (
        /* Track Existing Ticket */
        <div className="operator-grievance-track max-w-xl mx-auto space-y-4">
          <form onSubmit={handleTrackTicket} className="operator-grievance-track-form">
            <label htmlFor="trackTicketId" className="text-xs font-mono font-bold text-muted-foreground uppercase">Ticket ID</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="trackTicketId"
                value={trackTicketId}
                onChange={(e) => { setTrackTicketId(e.target.value); setTrackError(''); }}
                aria-invalid={Boolean(trackError)}
                aria-describedby={trackError ? 'trackTicketId-error' : undefined}
                autoComplete="off"
                placeholder="e.g. YT-GRV-849201"
                className="min-w-0 flex-1 rounded-2xl surface-2 border-border/50 text-xs h-11"
              />
              <Button
                type="submit"
                disabled={trackingLoading}
                aria-busy={trackingLoading}
                className="w-full sm:w-auto rounded-2xl text-xs font-bold px-6 h-11 bg-primary text-primary-foreground shrink-0 cursor-pointer"
              >
                {trackingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track ticket'}
              </Button>
            </div>
            {trackError && <p id="trackTicketId-error" role="alert" className="operator-grievance-field__error">{trackError}</p>}
          </form>

          {trackedTicket && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl glass-heavy border border-primary/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">{trackedTicket.ticketId}</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[0.68rem] font-bold uppercase">
                  {trackedTicket.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{trackedTicket.officerNote || 'A reviewer has not added a note yet. Your ticket remains in the trust queue.'}</p>
              <div className="text-[0.68rem] font-mono text-muted-foreground pt-2 border-t border-border/30 flex justify-between">
                <span>Received: {new Date(trackedTicket.createdAt).toLocaleDateString()}</span>
                <span>Resolution SLA: {new Date(trackedTicket.slaDeadline).toLocaleDateString()}</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Statutory Disclosures */}
      <div className="mt-12 p-6 rounded-3xl surface-1 border border-border/30 text-xs text-muted-foreground space-y-2">
        <h4 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
          <Building className="w-4 h-4 text-primary" /> Statutory Grievance Redressal Officer
        </h4>
        <p><strong>Officer:</strong> {publicBetaConfig.grievanceOfficerName || 'Development operator (not for public release)'}</p>
        <p><strong>Contact:</strong> {publicBetaConfig.grievanceContactEmail || 'Use the local development support channel.'}</p>
        <p><strong>Support:</strong> {publicBetaConfig.supportEmail || 'Not configured in this development build.'}</p>
        <p><strong>Handling:</strong> Tickets are persisted, assigned for review, and can be tracked with the ticket ID. Do not submit emergencies through Yor.</p>
      </div>
    </div>
  );
}
