import { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface AppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export default function AppModal({ open, onOpenChange, title, children }: AppModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[100] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          // pb-safe ensures the modal's bottom padding clears the iPhone home
          // indicator / Android gesture bar so content isn't hidden beneath it.
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
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1F2937] border border-white/10 text-white flex-shrink-0 active:scale-95 transition-transform"
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
