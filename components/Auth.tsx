
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Icon } from './ui';

interface AuthProps {
    onLogin: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [photoFileName, setPhotoFileName] = useState('');
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPhotoFileName(e.target.files[0].name);
        }
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isSignup) {
                if (password !== repeatPassword) {
                    throw new Error("Passwords do not match");
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                await updateProfile(user, { displayName: name });
                
                // Create user document in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: name,
                    email: email,
                    photoURL: photoFileName || '',
                    createdAt: new Date().toISOString()
                });

                setSuccess(true);
                // Small delay to show success animation if we add one, or just proceed
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Check if user document exists, if not create it (sync logic)
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);

                if (!docSnap.exists()) {
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        name: user.displayName || 'Unknown User',
                        email: user.email || '',
                        photoURL: '',
                        createdAt: new Date().toISOString()
                    });
                }

                setSuccess(true);
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Password or Email Incorrect");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("User already exists. Sign in?");
            } else {
                setError(err.message || "An error occurred");
            }
            setSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignup(!isSignup);
        setError(null);
        setSuccess(false);
        // Reset fields
        setEmail('');
        setPassword('');
        setName('');
        setRepeatPassword('');
        setPhotoFileName('');
    };

    return (
        <div className={`auth-container ${success ? 'animate-auth-exit' : ''}`}>
            <div className="auth-wrapper">
                <div className="card-switch">
                    <input 
                        type="checkbox" 
                        className="toggle" 
                        id="auth-toggle" 
                        checked={isSignup} 
                        onChange={toggleMode}
                    />
                    <label className="switch" htmlFor="auth-toggle">
                        <span className="slider"></span>
                        <span className="card-side"></span>
                    </label>
                    
                    <div className="flip-card__inner">
                        {/* Login Side (Front) */}
                        <div className="flip-card__front">
                            <div className="title">Log in</div>
                            <form className="flip-card__form" onSubmit={handleAuthAction}>
                                <input 
                                    className="flip-card__input" 
                                    name="email" 
                                    placeholder="Email" 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <input 
                                    className="flip-card__input" 
                                    name="password" 
                                    placeholder="Password" 
                                    type="password" 
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                {error && !isSignup && (
                                    <div className="text-red-400 text-sm font-semibold px-4 text-center">
                                        {error}
                                    </div>
                                )}
                                <button className={`flip-card__btn ${success ? 'success' : ''}`} type="submit" disabled={isLoading}>
                                    <span className="btn-text">{isLoading ? '...' : 'Let\'s go!'}</span>
                                    <svg className="checkmark-svg" viewBox="0 0 52 52">
                                        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path className="checkmark-path" fill="none" stroke="white" strokeWidth="5" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                    </svg>
                                </button>
                            </form>
                        </div>

                        {/* Signup Side (Back) */}
                        <div className="flip-card__back">
                            <div className="title">Sign up</div>
                            <form className="flip-card__form" onSubmit={handleAuthAction}>
                                <input 
                                    className="flip-card__input" 
                                    placeholder="Name" 
                                    type="text" 
                                    required 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <input 
                                    className="flip-card__input" 
                                    name="email" 
                                    placeholder="Email" 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <input 
                                    className="flip-card__input" 
                                    name="password" 
                                    placeholder="Password" 
                                    type="password" 
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <input 
                                    className="flip-card__input" 
                                    name="repeat_password" 
                                    placeholder="Repeat Password" 
                                    type="password" 
                                    required 
                                    value={repeatPassword}
                                    onChange={(e) => setRepeatPassword(e.target.value)}
                                />
                                {/* Placeholder for file upload */}
                                <label className="flip-card__input flex items-center text-slate-400 text-sm cursor-pointer truncate">
                                    <Icon name="upload_file" className="mr-2" /> 
                                    <span className="truncate">{photoFileName || "Upload Profile Photo (Optional)"}</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>

                                {error && isSignup && (
                                    <div className="text-red-400 text-sm font-semibold px-4 text-center cursor-pointer" onClick={() => {
                                        if(error.includes("User already exists")) toggleMode();
                                    }}>
                                        {error}
                                    </div>
                                )}
                                <button className={`flip-card__btn ${success ? 'success' : ''}`} type="submit" disabled={isLoading}>
                                    <span className="btn-text">{isLoading ? '...' : 'Confirm!'}</span>
                                    <svg className="checkmark-svg" viewBox="0 0 52 52">
                                        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path className="checkmark-path" fill="none" stroke="white" strokeWidth="5" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;