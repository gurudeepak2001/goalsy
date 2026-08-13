import { InputHTMLAttributes, ReactNode, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ExecutiveInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

const ExecutiveInput = forwardRef<HTMLInputElement, ExecutiveInputProps>(
  ({ label, leftIcon, rightElement, className = '', id: idProp, type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = idProp ?? generatedId;
    const isPassword = type === 'password';
    const [revealed, setRevealed] = useState(false);

    return (
      <div className={`w-full ${className}`}>
        {(label || rightElement) && (
          <div className={`mb-2 flex items-center ${rightElement ? 'justify-between pr-1' : ''} pl-1`}>
            <label
              htmlFor={inputId}
              className="text-xs font-bold uppercase tracking-[1px] text-[#808BA4]"
            >
              {label}
            </label>
            {rightElement}
          </div>
        )}
        <div className="bg-[#111827] border border-white/10 rounded-xl px-5 h-16 flex items-center gap-3 focus-within:border-[#2563EB] transition-colors">
          {leftIcon && (
            <div className="text-white/40 flex-shrink-0" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={isPassword ? (revealed ? 'text' : 'password') : type}
            className="text-white placeholder:text-[#444444] text-base font-semibold bg-transparent outline-none flex-1 w-full h-full"
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((prev) => !prev)}
              aria-label={revealed ? 'Hide password' : 'Show password'}
              className="w-11 h-11 flex items-center justify-center flex-shrink-0 -mr-2 text-white/40 hover:text-white/70 transition-colors"
            >
              {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
    );
  }
);

ExecutiveInput.displayName = 'ExecutiveInput';
export default ExecutiveInput;
