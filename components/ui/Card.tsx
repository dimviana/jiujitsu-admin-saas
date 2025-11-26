import React from 'react';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 ${className}`}>
        {children}
    </div>
);

export default Card;