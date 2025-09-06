import React, { useState } from 'react';
import { NotificationType } from '../types';

// A simplified version of useLocalStorage for this component, as it doesn't need user prefixes.
function useAuthStorage<T>(key: string, initialValue: T | (() => T)) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        } catch (error) {
            return (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue] as const;
}

interface User {
    username: string;
    // NOTE: In a real-world application, passwords should ALWAYS be hashed.
    // Storing plain text is insecure. This is for demonstration in a local-only app.
    password: string;
}

interface AuthProps {
    onLoginSuccess: (username: string) => void;
    addNotification: (message: string, type?: NotificationType) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess, addNotification }) => {
    const [isSignUp, setIsSignUp] = useState(false);

    // Login Form State
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);

    // Sign Up Form State
    const [signUpUsername, setSignUpUsername] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
    
    // User storage (this is global, not per-user)
    const [users, setUsers] = useAuthStorage<User[]>('users', []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginUsername.trim() || !loginPassword.trim()) {
            addNotification('Please enter both username and password.', 'warning');
            return;
        }
        const user = users.find(u => u.username.toLowerCase() === loginUsername.toLowerCase());
        if (user && user.password === loginPassword) {
            setLoginSuccess(true);
            // Immediately trigger screen transition, animation will happen concurrently
            onLoginSuccess(user.username);
        } else {
            addNotification('Invalid username or password.', 'error');
        }
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!signUpUsername.trim() || !signUpPassword.trim()) {
            addNotification('Username and password cannot be empty.', 'warning');
            return;
        }
        if (signUpPassword !== signUpConfirmPassword) {
            addNotification('Passwords do not match.', 'error');
            return;
        }
        const userExists = users.some(u => u.username.toLowerCase() === signUpUsername.toLowerCase());
        if (userExists) {
            addNotification('Username is already taken.', 'error');
            return;
        }

        const newUser: User = { username: signUpUsername, password: signUpPassword };
        setUsers(prevUsers => [...prevUsers, newUser]);
        onLoginSuccess(newUser.username);
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
