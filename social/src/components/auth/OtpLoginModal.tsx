import { useState, type ReactNode } from 'react';
import { Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OtpLoginModalProps {
  trigger?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OtpLoginModal({ trigger, isOpen, onOpenChange }: OtpLoginModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[440px] rounded-3xl font-sans glass-heavy border border-primary/30 p-6">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
            <Smartphone className="h-7 w-7" />
          </div>
          <DialogTitle>Phone sign-in is unavailable.</DialogTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            SMS and WhatsApp one-time-code delivery are not configured for this release. Use email sign-in or an enrolled passkey instead.
          </p>
        </DialogHeader>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full rounded-xl">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}