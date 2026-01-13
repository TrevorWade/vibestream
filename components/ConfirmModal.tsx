import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    isDestructive = false,
    onConfirm,
    onCancel,
    children
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h3 className="text-lg font-semibold text-textMain">{title}</h3>
                    <button
                        onClick={onCancel}
                        className="text-textSub hover:text-textMain transition-colors p-1 rounded-md hover:bg-white/5"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-6">
                    <p className="text-textSub mb-4">{message}</p>
                    {children}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surfaceHighlight/30 border-t border-white/5">
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        variant={isDestructive ? 'primary' : 'primary'} // utilizing primary for now, could be destructive if Button supports it
                        className={isDestructive ? 'bg-red-600 hover:bg-red-700 text-white border-none' : ''}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};
