import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react';

interface ExecutiveInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

const ExecutiveInput = forwardRef<HTMLInputElement, ExecutiveInputProps>(
  ({ label, leftIcon, rightElement, className = '', id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const inputId = idProp ?? generatedId;

    return (
      <div className={`w-full ${className}`}>
        {(label || rightElement) && (
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="text-xs tracking-widest text-[#64748B] font-medium uppercase"
            >
              {label}
            </label>
            {rightElement}
          </div>
        )}
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl px-4 py-4 flex items-center focus-within:border-[#2563EB] transition-colors">
          {leftIcon && (
            <div className="text-[#475569] mr-3 flex-shrink-0" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className="text-white placeholder:text-[#4B5563] text-base bg-transparent outline-none flex-1 w-full"
            {...props}
          />
        </div>
      </div>
    );
  }
);

ExecutiveInput.displayName = 'ExecutiveInput';
export default ExecutiveInput;
