import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, Moon, Info, HelpCircle, Trash2, ChevronRight, AlertTriangle, Check, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getAvatarUrl } from '../utils/avatarUtils';
import './SettingsPage.css';
import './AvatarUpload.css';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, profile, updateProfile, updatePassword, deleteAccount, uploadAvatar } = useAuth();
    const { t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [activeView, setActiveView] = useState('main'); // 'main', 'profile', 'password', 'delete'

    console.log('SettingsPage Debug:', {
        profile,
        user,
        avatarUrl: getAvatarUrl(profile || user),
        profileAvatar: profile?.avatar_url
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form states
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const { success, error } = await updateProfile({ display_name: displayName });

        if (success) {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => {
                setMessage({ type: '', text: '' });
                setActiveView('main');
            }, 2000);
        } else {
            setMessage({ type: 'error', text: error?.message || 'Failed to update profile' });
        }
        setLoading(false);
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        if (passwordData.newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        const { success, error } = await updatePassword(passwordData.newPassword);

        if (success) {
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
            setTimeout(() => {
                setMessage({ type: '', text: '' });
                setActiveView('main');
            }, 2000);
        } else {
            setMessage({ type: 'error', text: error?.message || 'Failed to update password' });
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== 'DELETE') {
            setMessage({ type: 'error', text: 'Please type DELETE to confirm' });
            return;
        }

        setLoading(true);
        const { success, error } = await deleteAccount();

        if (!success) {
            setMessage({ type: 'error', text: error?.message || 'Failed to delete account' });
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (2MB)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'File size must be less than 2MB' });
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setMessage({ type: 'error', text: 'File must be an image (JPEG, PNG, or WebP)' });
                return;
            }

            setAvatarFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
            setMessage({ type: '', text: '' });
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) return;

        setUploadingAvatar(true);
        setMessage({ type: '', text: '' });

        const { success, error } = await uploadAvatar(avatarFile);

        if (success) {
            setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
            setAvatarFile(null);
            setAvatarPreview(null);
            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
        } else {
            setMessage({ type: 'error', text: error?.message || 'Failed to upload avatar' });
        }
        setUploadingAvatar(false);
    };

    const getInitials = () => {
        if (profile?.display_name) {
            return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email?.charAt(0).toUpperCase() || 'U';
    };

    const handleBack = () => {
        if (activeView !== 'main') {
            setActiveView('main');
            setMessage({ type: '', text: '' });
        } else {
            navigate('/');
        }
    };

    return (
        <div className="settings-page-container">
            <div className="settings-page-content">
                {/* Header */}
                <div className="settings-header-page">
                    <button onClick={handleBack} className="back-btn-page">
                        <ArrowLeft size={24} />
                    </button>
                    <h2>{activeView === 'main' ? 'Settings' :
                        activeView === 'profile' ? 'Edit Profile' :
                            activeView === 'password' ? 'Change Password' :
                                activeView === 'delete' ? 'Delete Account' : 'Settings'}</h2>
                    <div className="header-spacer"></div> {/* To center title */}
                </div>

                {/* Main View */}
                {activeView === 'main' && (
                    <div className="settings-main-view">
                        {/* User Profile Card */}
                        <div className="settings-card user-card" onClick={() => setActiveView('profile')}>
                            <div className="user-info">
                                <div className="user-avatar-settings">
                                    {getAvatarUrl(profile || user) ? (
                                        <img
                                            src={getAvatarUrl(profile || user)}
                                            alt="Profile"
                                            className="avatar-image-settings"
                                        />
                                    ) : (
                                        getInitials()
                                    )}
                                </div>
                                <div className="user-details">
                                    <h3>{profile?.display_name || 'User'}</h3>
                                    <p>{user?.email}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="chevron-icon" />
                        </div>

                        {/* Other Settings Section */}
                        <div className="settings-section">
                            <h4 className="section-title">Other settings</h4>

                            <div className="settings-card-group">
                                <button className="settings-card-item" onClick={() => {
                                    setActiveView('password');
                                    setMessage({ type: '', text: '' });
                                }}>
                                    <div className="card-item-left">
                                        <Lock size={20} />
                                        <span>Password</span>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </button>

                                <button className="settings-card-item disabled">
                                    <div className="card-item-left">
                                        <Bell size={20} />
                                        <span>Notifications</span>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </button>

                                <button className="settings-card-item" onClick={toggleTheme}>
                                    <div className="card-item-left">
                                        <Moon size={20} />
                                        <span>Dark mode</span>
                                    </div>
                                    <div className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={theme === 'dark'}
                                            onChange={toggleTheme}
                                            id="dark-mode-toggle"
                                        />
                                        <label htmlFor="dark-mode-toggle"></label>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Additional Settings Section */}
                        <div className="settings-section">
                            <div className="settings-card-group">
                                <button className="settings-card-item disabled">
                                    <div className="card-item-left">
                                        <Info size={20} />
                                        <span>About application</span>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </button>

                                <button className="settings-card-item disabled">
                                    <div className="card-item-left">
                                        <HelpCircle size={20} />
                                        <span>Help/FAQ</span>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </button>

                                <button className="settings-card-item danger" onClick={() => {
                                    setActiveView('delete');
                                    setMessage({ type: '', text: '' });
                                }}>
                                    <div className="card-item-left">
                                        <Trash2 size={20} />
                                        <span>Deactivate my account</span>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile Edit View */}
                {activeView === 'profile' && (
                    <div className="settings-detail-page">
                        {message.text && (
                            <div className={`settings-message-page ${message.type}`}>
                                {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        {/* Avatar Upload Section */}
                        <div className="avatar-upload-section">
                            <div className="avatar-upload-container">
                                <div className="avatar-display">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar preview" className="avatar-preview-img" />
                                    ) : getAvatarUrl(profile || user) ? (
                                        <img src={getAvatarUrl(profile || user)} alt="Current avatar" className="avatar-preview-img" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {getInitials()}
                                        </div>
                                    )}
                                </div>
                                <div className="avatar-upload-controls">
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleAvatarChange}
                                        className="avatar-input-hidden"
                                    />
                                    <label htmlFor="avatar-upload" className="avatar-upload-btn">
                                        Choose Photo
                                    </label>
                                    {avatarFile && (
                                        <button
                                            type="button"
                                            onClick={handleAvatarUpload}
                                            className="avatar-save-btn"
                                            disabled={uploadingAvatar}
                                        >
                                            {uploadingAvatar ? <Loader className="spin" size={16} /> : 'Upload'}
                                        </button>
                                    )}
                                </div>
                                <p className="avatar-hint">JPG, PNG or WebP. Max size 2MB.</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="settings-form-page">
                            <div className="form-group-page">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="settings-input-page"
                                />
                            </div>
                            <div className="form-group-page">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={user?.email}
                                    disabled
                                    className="settings-input-page disabled"
                                />
                                <span className="input-hint-page">Email cannot be changed</span>
                            </div>
                            <button type="submit" className="save-btn-page" disabled={loading}>
                                {loading ? <Loader className="spin" size={18} /> : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Password Edit View */}
                {activeView === 'password' && (
                    <div className="settings-detail-page">
                        {message.text && (
                            <div className={`settings-message-page ${message.type}`}>
                                {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdatePassword} className="settings-form-page">
                            <div className="form-group-page">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Enter new password (min. 8 characters)"
                                    className="settings-input-page"
                                />
                            </div>
                            <div className="form-group-page">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Confirm new password"
                                    className="settings-input-page"
                                />
                            </div>
                            <button type="submit" className="save-btn-page" disabled={loading}>
                                {loading ? <Loader className="spin" size={18} /> : 'Update Password'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Delete Account View */}
                {activeView === 'delete' && (
                    <div className="settings-detail-page">
                        <div className="danger-warning-page">
                            <AlertTriangle size={24} />
                            <div>
                                <h4>Warning: This action is irreversible</h4>
                                <p>All your data, including history and preferences, will be permanently deleted.</p>
                            </div>
                        </div>

                        {message.text && (
                            <div className={`settings-message-page ${message.type}`}>
                                <AlertTriangle size={16} />
                                <span>{message.text}</span>
                            </div>
                        )}

                        <div className="form-group-page">
                            <label>Type DELETE to confirm</label>
                            <input
                                type="text"
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder="DELETE"
                                className="settings-input-page danger-input"
                            />
                        </div>

                        <button
                            onClick={handleDeleteAccount}
                            className="delete-btn-page"
                            disabled={loading || deleteConfirm !== 'DELETE'}
                        >
                            {loading ? <Loader className="spin" size={18} /> : 'Delete Account'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
