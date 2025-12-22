import React, { useState } from 'react';
import { NotificationType } from '../types';
import { supabase } from '../lib/supabase';

interface AuthProps {
    addNotification: (message: string, type?: NotificationType) => void;
    onLoginSuccess: (email: string) => void;
}

const Auth: React.FC<AuthProps> = ({ addNotification, onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);

    // Login Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            addNotification(error.message, 'error');
            setLoading(false);
        } else if (data.user) {
            setLoginSuccess(true);
            setTimeout(() => {
                onLoginSuccess(data.user?.email || 'User');
            }, 1000);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            addNotification(error.message, 'error');
            setLoading(false);
        } else if (data.user) {
            addNotification('Account created! Logging you in...', 'success');
            // Auto login after sign up if session created
             setLoginSuccess(true);
             setTimeout(() => {
                 onLoginSuccess(data.user?.email || 'User');
             }, 1000);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="card-switch">
                <input 
                    id="auth-toggle"
                    type="checkbox" 
                    className="toggle" 
                    checked={isSignUp} 
                    onChange={() => {
                        setIsSignUp(prev => !prev);
                        setEmail('');
                        setPassword('');
                    }} 
                />
                <label htmlFor="auth-toggle" className="switch">
                   <span className="slider"></span>
                   <span className="card-side"></span>
                </label>
               <div className="flip-card__inner">
                  <div className="flip-card__front">
                     <div className="title">Log in</div>
                     <form className="flip-card__form" onSubmit={handleLogin}>
                        <input 
                            className="flip-card__input" 
                            name="email" 
                            placeholder="Email" 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input 
                            className="flip-card__input" 
                            name="password" 
                            placeholder="Password" 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className={`flip-card__btn ${loginSuccess ? 'success' : ''}`} disabled={loading || loginSuccess}>
                            <span className="btn-text">{loading ? '...' : 'Login'}</span>
                            <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white">
                                <path className="checkmark-path" strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </button>
                     </form>
                  </div>
                  <div className="flip-card__back">
                     <div className="title">Sign up</div>
                     <form className="flip-card__form" onSubmit={handleSignUp}>
                        <input 
                            className="flip-card__input" 
                            name="email"
                            placeholder="Email" 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input 
                            className="flip-card__input" 
                            name="password" 
                            placeholder="Password" 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className="flip-card__btn" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                     </form>
                  </div>
               </div>
            </div>   
       </div>
    );
};

export default Auth;