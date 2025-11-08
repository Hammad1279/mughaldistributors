

import React, { useState, useEffect } from 'react';
import { NotificationType } from '../types';
import { auth } from '../firebase';

interface AuthProps {
    addNotification: (message: string, type?: NotificationType) => void;
    onLoginSuccess: (email: string) => void;
    onSignUp: (email: string, password: string) => Promise<boolean>;
}

const LAST_USER_KEY = 'mughal_os_last_user_email';

const Auth: React.FC<AuthProps> = ({ addNotification, onLoginSuccess, onSignUp }) => {
    const [isSignUp, setIsSignUp] = useState(false);

    // Login Form State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Sign Up Form State
    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);

    useEffect(() => {
        const lastUser = localStorage.getItem(LAST_USER_KEY);
        if(lastUser) {
            setLoginEmail(lastUser);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword.trim()) {
            addNotification('Please enter email and password.', 'warning');
            return;
        }
        setIsLoggingIn(true);
        try {
            await auth.signInWithEmailAndPassword(loginEmail.trim(), loginPassword);
            setLoginSuccess(true);
            // onAuthStateChanged in App.tsx will handle the rest
            localStorage.setItem(LAST_USER_KEY, loginEmail.trim());
            // The onLoginSuccess prop is kept for the exit animation trigger
            setTimeout(() => {
                onLoginSuccess(loginEmail.trim());
            }, 1000);

        } catch (error: any) {
            let message = 'Failed to log in.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Invalid email or password.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
            }
            addNotification(message, 'error');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleSignUpForm = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = signUpEmail.trim();
        if (!trimmedEmail || !signUpPassword.trim()) {
            addNotification('Email and password cannot be empty.', 'warning');
            return;
        }
        if (signUpPassword !== signUpConfirmPassword) {
            addNotification('Passwords do not match.', 'error');
            return;
        }
        if (signUpPassword.length < 6) {
             addNotification('Password should be at least 6 characters.', 'warning');
            return;
        }

        setIsSigningUp(true);
        const success = await onSignUp(trimmedEmail, signUpPassword);
        setIsSigningUp(false);

        if (success) {
            addNotification('Account created successfully! You can now log in.', 'success');
            setSignUpEmail('');
            setSignUpPassword('');
            setSignUpConfirmPassword('');
            setIsSignUp(false); // Flip back to login form
        }
        // onSignUp in App.tsx handles specific error notifications
    };

    return (
        <div className="auth-wrapper">
            <div className="card-switch">
                <input 
                    id="auth-toggle"
                    type="checkbox" 
                    className="toggle" 
                    checked={isSignUp} 
                    onChange={() => setIsSignUp(prev => !prev)} 
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
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                        />
                        <input 
                            className="flip-card__input" 
                            name="password" 
                            placeholder="Password" 
                            type="password" 
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className={`flip-card__btn ${loginSuccess ? 'success' : ''}`} disabled={loginSuccess || isLoggingIn}>
                            <span className="btn-text">{isLoggingIn ? '...' : 'Login'}</span>
                            <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white">
                                <path className="checkmark-path" strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </button>
                     </form>
                  </div>
                  <div className="flip-card__back">
                     <div className="title">Sign up</div>
                     <form className="flip-card__form" onSubmit={handleSignUpForm}>
                        <input 
                            className="flip-card__input" 
                            placeholder="Email" 
                            type="email"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            required
                        />
                        <input 
                            className="flip-card__input" 
                            name="password" 
                            placeholder="Password" 
                            type="password" 
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            required
                        />
                         <input 
                            className="flip-card__input" 
                            name="confirm_password" 
                            placeholder="Confirm Password" 
                            type="password" 
                            value={signUpConfirmPassword}
                            onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className="flip-card__btn" disabled={isSigningUp}>
                           {isSigningUp ? '...' : 'Sign Up'}
                        </button>
                     </form>
                  </div>
               </div>
            </div>   
       </div>
    );
};

export default Auth;