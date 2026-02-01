import React, { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    error,
    className = '',
    containerClassName = '',
    icon,
    type = 'text',
    ...props
}, ref) => {
    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                </label>
            )}
            <div className="relative rounded-md shadow-sm">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    ref={ref}
                    type={type}
                    className={`
                        block w-full rounded-lg border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                        focus:ring-blue-500 focus:border-blue-500 
                        disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800 
                        transition-colors outline-none border px-4 py-2
                        ${icon ? 'pl-10' : ''}
                        ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
