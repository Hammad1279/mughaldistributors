
import React, { useState, useEffect } from 'react';
import { NotificationType, User } from '../types';

interface AuthProps {
    addNotification: (message: string, type?: NotificationType) => void;
    onLoginSuccess: (username: string) => void;
    onSignUp: (user: Omit<User, 'id'>) => boolean;
    users: User[];
}

const LAST_USER_KEY = 'mughal_os_last_user';

const Auth: React.FC<AuthProps> = ({ addNotification, onLoginSuccess, onSignUp, users }) => {
    const [isSignUp, setIsSignUp] = useState(false);

    // Login Form State
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);

    // Sign Up Form State
    const [signUpUsername, setSignUpUsername] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

    useEffect(() => {
        const lastUser = localStorage.getItem(LAST_USER_KEY);
        if(lastUser) {
            setLoginUsername(lastUser);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginUsername.trim() || !loginPassword.trim()) {
            addNotification('Please enter username and password.', 'warning');
            return;
        }

        const user = users.find(u => u.username.toLowerCase() === loginUsername.trim().toLowerCase());
        
        // Use btoa for basic password obfuscation, atob to decode
        if (user && atob(user.password) === loginPassword) {
            setLoginSuccess(true);
            setTimeout(() => {
                onLoginSuccess(user.username);
            }, 1000);
        } else {
            addNotification('Invalid username or password.', 'error');
        }
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUsername = signUpUsername.trim();
        if (!trimmedUsername || !signUpPassword.trim()) {
            addNotification('Username and password cannot be empty.', 'warning');
            return;
        }
        if (signUpPassword !== signUpConfirmPassword) {
            addNotification('Passwords do not match.', 'error');
            return;
        }
        
        const success = onSignUp({
            username: trimmedUsername,
            password: btoa(signUpPassword) // Store encoded password
        });

        if (success) {
            addNotification('Account created successfully!', 'success');
            setSignUpUsername('');
            setSignUpPassword('');
            setSignUpConfirmPassword('');
            setIsSignUp(false); // Flip back to login form
        } else {
            addNotification(`Username "${trimmedUsername}" is already taken.`, 'error');
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
                            name="username" 
                            placeholder="Username" 
                            type="text" 
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
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
                        <button type="submit" className={`flip-card__btn ${loginSuccess ? 'success' : ''}`} disabled={loginSuccess}>
                            <span className="btn-text">Login</span>
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
                            placeholder="Username" 
                            type="text"
                            value={signUpUsername}
                            onChange={(e) => setSignUpUsername(e.target.value)}
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
                        <button type="submit" className="flip-card__btn">Sign Up</button>
                     </form>
                  </div>
               </div>
            </div>   
       </div>
    );
};

export default Auth;
