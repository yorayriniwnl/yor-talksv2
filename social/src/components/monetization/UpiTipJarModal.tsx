import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UpiTipJarModalProps {
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    upiId?: string;
  };
  trigger?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Payments are intentionally unavailable until a verified provider is wired
 * to the backend. This component remains as a clear beta boundary for the
 * places where tipping will eventually be offered.
 */
export function UpiTipJarModal({ creator, trigger, isOpen, onOpenChange }: UpiTipJarModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  const displayName = creator.displayName || creator.username || 'Creator';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[440px] rounded-3xl font-sans glass-heavy border border-amber-500/30 p-6">
        <DialogHeader className="text-center flex flex-col items-center">
          <Avatar className="w-16 h-16 border-2 border-primary shadow-xl ring-4 ring-primary/20">
            <AvatarImage src={creator.avatarUrl} />
            <AvatarFallback className="font-display font-black text-xl">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="font-display font-black text-xl mt-3">
            Tips for {displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
          <h3 className="font-display font-bold text-base">Payments are disabled for the college beta</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            UPI tips will become available after a verified payment provider and
            server-side payment confirmation are configured. No payment has been
            initiated.
          </p>
        </div>

        <Button variant="outline" onClick={() => setOpen(false)} className="w-full rounded-2xl font-bold text-xs h-11">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
