'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="bottom-right"
      closeButton
      offset="1rem"
      className="toaster group"
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-2xl group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl',
          title: 'group-[.toast]:font-display group-[.toast]:font-bold',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      style={{ '--width': 'min(22rem, calc(100vw - 2rem))' } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
