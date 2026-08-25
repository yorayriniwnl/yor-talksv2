import { useState } from 'react';
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

  // Track State
  const [trackTicketId, setTrackTicketId] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState<any>(null);

  const handleFileGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedUrl.trim() || !reporterName.trim() || !reporterEmail.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
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
      toast.error(err.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTicketId.trim()) return;

    setTrackingLoading(true);
    sounds.playPop();

    try {
      const ticket = await api.request<any>(`/reports/grievance/${encodeURIComponent(trackTicketId.trim())}`);
      setTrackedTicket(ticket);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ticket not found');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 lg:p-8 font-sans">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-1 border border-primary/30 text-primary text-xs font-mono font-bold mb-3">
          <Scale className="w-3.5 h-3.5" /> Trust, safety & grievance intake
        </div>
        <h1 className="font-display font-black text-3xl lg:text-4xl text-foreground tracking-tight">
          Grievance Redressal & Trust Portal 🇮🇳
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-2">
          Submit a report to the Yor Talks trust queue. Formal statutory officer details and legal policy publication are launch prerequisites and are shown only after appointment.
        </p>

        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant={activeTab === 'file' ? 'default' : 'outline'}
            onClick={() => setActiveTab('file')}
            className="rounded-2xl text-xs font-bold px-6 h-10 cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1.5" /> File a Grievance
          </Button>
          <Button
            variant={activeTab === 'track' ? 'default' : 'outline'}
            onClick={() => setActiveTab('track')}
            className="rounded-2xl text-xs font-bold px-6 h-10 cursor-pointer"
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
            className="max-w-xl mx-auto p-6 rounded-3xl glass-heavy border border-emerald-500/40 text-center space-y-4 shadow-2xl"
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
              onClick={() => { setSubmittedTicket(null); setReportedUrl(''); setDescription(''); }}
              className="rounded-xl text-xs font-bold"
            >
              Submit Another Report
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleFileGrievance} className="max-w-2xl mx-auto p-6 rounded-3xl glass-heavy border border-border/50 shadow-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase">Your Full Name *</label>
                <Input
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g. Ayush Roy"
                  className="rounded-xl surface-2 border-border/40 text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase">Email Address *</label>
                <Input
                  type="email"
                  required
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="rounded-xl surface-2 border-border/40 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-muted-foreground uppercase">Violation Category *</label>
              <select
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

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-muted-foreground uppercase">Reported Post / Reel / Profile URL *</label>
              <Input
                required
                value={reportedUrl}
                onChange={(e) => setReportedUrl(e.target.value)}
                placeholder="https://yortalks.in/p/... or @username"
                className="rounded-xl surface-2 border-border/40 text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-muted-foreground uppercase">Detailed Description & Evidence *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the grievance in detail with specific timestamps or contextual evidence..."
                className="w-full rounded-xl surface-2 border border-border/40 p-3 text-xs text-foreground outline-none resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl font-display font-extrabold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Grievance to Redressal Officer <ArrowRight className="w-4 h-4 ml-1.5" /></>}
            </Button>
          </form>
        )
      ) : (
        /* Track Existing Ticket */
        <div className="max-w-xl mx-auto space-y-4">
          <form onSubmit={handleTrackTicket} className="flex gap-2">
            <Input
              value={trackTicketId}
              onChange={(e) => setTrackTicketId(e.target.value)}
              placeholder="Enter Ticket ID (e.g. YT-GRV-849201)"
              className="rounded-2xl surface-2 border-border/50 text-xs h-11"
            />
            <Button
              type="submit"
              disabled={trackingLoading || !trackTicketId.trim()}
              className="rounded-2xl text-xs font-bold px-6 h-11 bg-primary text-primary-foreground shrink-0 cursor-pointer"
            >
              {trackingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
            </Button>
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
              <p className="text-xs text-muted-foreground">{trackedTicket.officerNote}</p>
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
        <p><strong>Officer:</strong> Appointed grievance officer details are not configured yet.</p>
        <p><strong>Contact:</strong> The official contact address must be published before statutory production launch.</p>
        <p><strong>Beta handling:</strong> Tickets are persisted, assigned for review, and can be tracked with the ticket ID.</p>
      </div>
    </div>
  );
}
