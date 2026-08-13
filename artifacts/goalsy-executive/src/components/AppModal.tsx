import { ReactNode, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface AppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export default function AppModal({ open, onOpenChange, title, children }: AppModalProps) {
  // Keyboard avoidance: track how far the soft keyboard has pushed up from the
  // bottom of the viewport so we can shift the bottom sheet up by that amount.
  const contentRef = useRef<HTMLDivElement>(null);
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    // Reset in case a previous open left a stale value.
    if (contentRef.current) {
      contentRef.current.style.bottom = '0px';
      contentRef.current.style.maxHeight = '';
    }
    keyboardHeightRef.current = 0;

    // Keyboard plugin is only available inside the Capacitor native shell.
    // Skip entirely on web — the browser handles keyboard avoidance natively.
    if (!Capacitor.isNativePlatform()) return;

    let willShowHandle: { remove: () => void } | null = null;
    let willHideHandle: { remove: () => void } | null = null;

    import('@capacitor/keyboard').then(({ Keyboard }) => {
      // iOS: keyboardWillShow fires *before* the slide-up animation so the
      // sheet moves in sync with the keyboard. Android uses keyboardDidShow
      // (after resize:'body' has settled) — but the transition still looks
      // smooth because the body resize already happened.
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

      Keyboard.addListener(
        isIos ? 'keyboardWillShow' : 'keyboardDidShow',
        (info: { keyboardHeight: number }) => {
          keyboardHeightRef.current = info.keyboardHeight;
          if (contentRef.current) {
            contentRef.current.style.bottom = `${info.keyboardHeight}px`;
            // Shrink max-height so the sheet doesn't overflow the visible area.
            contentRef.current.style.maxHeight = `calc(85dvh - ${info.keyboardHeight}px)`;
          }
          // Scroll the focused input into view inside the modal.
          requestAnimationFrame(() => {
            const focused = document.activeElement as HTMLElement | null;
            focused?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          });
        },
      ).then((h) => { willShowHandle = h; });

      Keyboard.addListener(
        isIos ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          keyboardHeightRef.current = 0;
          if (contentRef.current) {
            contentRef.current.style.bottom = '0px';
            contentRef.current.style.maxHeight = '';
          }
        },
      ).then((h) => { willHideHandle = h; });
    }).catch(() => {
      // Not running inside Capacitor (e.g. web browser) — no-op.
    });

    return () => {
      willShowHandle?.remove();
      willHideHandle?.remove();
      // Reset when modal closes.
      if (contentRef.current) {
        contentRef.current.style.bottom = '0px';
        contentRef.current.style.maxHeight = '';
      }
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[100] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          ref={contentRef}
          // pb-safe ensures the modal's bottom padding clears the iPhone home
          // indicator / Android gesture bar so content isn't hidden beneath it.
          // `bottom` and `max-height` are overridden via inline style by the
          // keyboard listener above when the soft keyboard is visible.
          style={{ transition: 'bottom 0.25s ease, max-height 0.25s ease' }}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md max-h-[85dvh] overflow-y-auto bg-[#0B0F17] border-t border-white/10 rounded-t-[28px] px-6 pt-6 pb-safe z-[101] flex flex-col gap-5 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
          aria-describedby={undefined}
        >
          <div className="w-10 h-1 bg-white/15 rounded-full mx-auto -mt-1" />
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-white font-bold text-xl leading-[30px]">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1F2937] border border-white/10 text-white flex-shrink-0 active:scale-95 transition-transform"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
