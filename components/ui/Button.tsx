import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseStyle = "rounded-lg font-medium transition-colors flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-primary text-white hover:bg-amber-600",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        danger: "bg-red-100 text-red-700 hover:bg-red-200",
        success: "bg-green-100 text-green-700 hover:bg-green-200"
    };
    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm"
    };
    return (
        <button {...props} className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </button>
    );
};

export default Button;