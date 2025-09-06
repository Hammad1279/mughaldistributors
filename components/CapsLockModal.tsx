import React, { useState, useEffect, useCallback } from 'react';

interface CapsLockModalProps {
    isOpen: boolean;
    onDismiss: () => void;
}

const CapsLockIcon: React.FC = () => (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="block mx-auto">
        <path d="M4 14.5C4 13.6716 4.67157 13 5.5 13H18.5C19.3284 13 20 13.6716 20 14.5V18.5C20 19.3284 19.3284 20 18.5 20H5.5C4.67157 20 4 19.3284 4 18.5V14.5Z" stroke="#94a3b8" strokeWidth="1.5"/>
        <path d="M12 13V10.5M12 10.5L14 8.5M12 10.5L10 8.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7" cy="16.5" r="1" className="caps-lock-icon-light"/>
    </svg>
);


export const CapsLockModal: React.FC<CapsLockModalProps> = ({ isOpen, onDismiss }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setIsDismissing(false);
        } else if (isRendered) {
            setIsDismissing(true);
        }
    }, [isOpen, isRendered]);
    
    const handleAnimationEnd = () => {
        if (isDismissing) {
            setIsRendered(false);
        }
    };

    const memoizedOnDismiss = useCallback(onDismiss, [onDismiss]);

    useEffect(() => {
        if (!isOpen) return;

        const handleInteraction = (event: KeyboardEvent) => {
            if (event.getModifierState("CapsLock")) {
                memoizedOnDismiss();
            }
        };
        
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('keyup', handleInteraction);
        
        return () => {
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('keyup', handleInteraction);
        };
    }, [isOpen, memoizedOnDismiss]);
    
    if (!isRendered) return null;

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${isDismissing ? 'animate-modal-bg-out' : 'animate-modal-bg'}`}
            onAnimationEnd={handleAnimationEnd}
        >
            <div
                 className={`bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md m-4 p-8 text-center ${isDismissing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
            >
                <CapsLockIcon />
                <h2 className="text-2xl font-bold text-slate-100 mt-5">Please Enable Caps Lock</h2>
                <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                    For the best experience and seamless navigation within the app, please turn on your Caps Lock key.
                </p>
            </div>
        </div>
    );
};