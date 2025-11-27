import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import './Register.css';

const Register = () => {
    const navigate = useNavigate();
    const { register, loading } = useAuth();

    const [step, setStep] = useState(1);
    const [animationDirection, setAnimationDirection] = useState('forward');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        displayName: '',
        password: '',
        confirmPassword: '',
    });

    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const getPasswordStrength = (password) => {
        if (!password) return null;

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength <= 2) return { level: 'weak', label: 'Weak', color: '#ef4444' };
        if (strength <= 3) return { level: 'medium', label: 'Medium', color: '#f59e0b' };
        return { level: 'strong', label: 'Strong', color: '#10b981' };
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.email) {
                setError('Please enter your email');
                return false;
            }
            if (!formData.email.includes('@')) {
                setError('Please enter a valid email');
                return false;
            }
        } else if (step === 2) {
            if (!formData.displayName) {
                setError('Please enter your name');
                return false;
            }
            if (formData.displayName.length < 2) {
                setError('Name must be at least 2 characters');
                return false;
            }
        } else if (step === 3) {
            if (!formData.password || !formData.confirmPassword) {
                setError('Please fill in both password fields');
                return false;
            }
            if (formData.password.length < 8) {
                setError('Password must be at least 8 characters');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
        }
        return true;
    };

    const handleNext = async () => {
        if (!validateStep()) return;

        // Check if email already exists on step 1
        if (step === 1) {
            setError('Checking email...');
            const { exists } = await authService.checkEmailExists(formData.email);

            if (exists) {
                setError('This email is already registered. Please sign in or use a different email.');
                return;
            }
            setError('');
        }

        setAnimationDirection('forward');
        setTimeout(() => setStep(step + 1), 50);
    };

    const handleBack = () => {
        setError('');
        setAnimationDirection('backward');
        setTimeout(() => setStep(step - 1), 50);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateStep()) return;

        const { success, error: registerError } = await register(
            formData.email,
            formData.password,
            formData.displayName
        );

        if (success) {
            setRegistrationSuccess(true);
        } else {
            // Check for specific error types
            const errorMessage = registerError?.message || '';

            if (errorMessage.includes('already registered') || errorMessage.includes('User already exists')) {
                setError('This email is already registered. Please sign in or use a different email.');
            } else if (errorMessage.includes('Invalid email')) {
                setError('Please enter a valid email address.');
            } else if (errorMessage.includes('Password')) {
                setError('Password must be at least 8 characters long.');
            } else {
                setError(errorMessage || 'Failed to create account. Please try again.');
            }
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1:
                return "What's your email?";
            case 2:
                return "What should we call you?";
            case 3:
                return "Create a secure password";
            default:
                return "";
        }
    };

    const getStepSubtitle = () => {
        switch (step) {
            case 1:
                return "We'll use this to keep your account safe";
            case 2:
                return "This is how you'll appear in Nue";
            case 3:
                return "Make it strong to protect your learning journey";
            default:
                return "";
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-header-outside">
                <h1 className="auth-logo-large">{registrationSuccess ? "Check your email!" : getStepTitle()}</h1>
                <p className="auth-subtitle-large">{registrationSuccess ? `We've sent a confirmation link to ${formData.email}` : getStepSubtitle()}</p>
            </div>

            <div className="auth-card">
                {registrationSuccess ? (
                    <div className="verification-success">
                        <div className="verification-icon">📧</div>
                        <p className="verification-instructions">
                            Please click the link in the email to verify your account and complete your registration.
                        </p>
                        <div className="verification-note">
                            <p>Didn't receive the email?</p>
                            <ul>
                                <li>Check your spam or junk folder</li>
                                <li>Make sure you entered the correct email address</li>
                                <li>Wait a few minutes and check again</li>
                            </ul>
                        </div>
                        <Link to="/login" className="auth-button primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                            Go to Login
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="progress-indicator">
                            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}></div>
                            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}></div>
                            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}></div>
                        </div>

                        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className={`auth-form ${animationDirection}`}>
                            {error && (
                                <div className="auth-error">
                                    {error}
                                </div>
                            )}

                            {step === 1 && (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    disabled={loading}
                                    autoComplete="email"
                                    autoFocus
                                    className="auth-input"
                                />
                            )}

                            {step === 2 && (
                                <input
                                    type="text"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleChange}
                                    placeholder="Enter your name"
                                    disabled={loading}
                                    autoComplete="name"
                                    autoFocus
                                    className="auth-input"
                                />
                            )}

                            {step === 3 && (
                                <>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Create a password (min. 8 characters)"
                                            disabled={loading}
                                            autoComplete="new-password"
                                            autoFocus
                                            className="auth-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="password-toggle"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="password-input-wrapper">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Confirm your password"
                                            disabled={loading}
                                            autoComplete="new-password"
                                            className="auth-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="password-toggle"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        {formData.confirmPassword && (
                                            <div className="password-match-indicator">
                                                {formData.password === formData.confirmPassword ? (
                                                    <Check size={18} className="match-icon success" />
                                                ) : (
                                                    <X size={18} className="match-icon error" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {formData.password && (
                                        <div className="password-strength">
                                            <div className="strength-label">
                                                Password strength: <span style={{ color: getPasswordStrength(formData.password).color }}>
                                                    {getPasswordStrength(formData.password).label}
                                                </span>
                                            </div>
                                            <div className="strength-bar">
                                                <div
                                                    className={`strength-fill ${getPasswordStrength(formData.password).level}`}
                                                    style={{ backgroundColor: getPasswordStrength(formData.password).color }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="button-group">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="auth-button secondary"
                                        disabled={loading}
                                    >
                                        Back
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className="auth-button primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating account...' : step === 3 ? 'Create account' : 'Continue'}
                                </button>
                            </div>
                        </form>

                        <div className="auth-footer">
                            <p>
                                Already have an account?{' '}
                                <Link to="/login" className="auth-link">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Register;
