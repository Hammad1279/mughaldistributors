import React from 'react';

const LoginLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900">
            <div className="spinner">
                <div className="spinnerin"></div>
            </div>
        </div>
    );
};

export default LoginLoader;
