import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, className = '', ...props }, ref) => (
    <div className={className}>
        {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
        <input 
            ref={ref}
            className="w-full border-slate-200 rounded-lg p-2.5 focus:ring-primary focus:border-primary border outline-none transition-all"
            {...props}
        />
    </div>
));

Input.displayName = 'Input';
export default Input;