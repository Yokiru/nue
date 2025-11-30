import React, { useState } from 'react';
import { X, User, Lock, Bell, Moon, Info, HelpCircle, Trash2, ChevronRight, AlertTriangle, Check, Loader, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, profile, updateProfile, updatePassword, deleteAccount, uploadAvatar } = useAuth();
    const { t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [activeView, setActiveView] = useState('main'); // 'main', 'profile', 'password', 'delete'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form states
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    if (!isOpen) return null;

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const { success, error } = await updateProfile({ display_name: displayName });

        if (success) {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // Auto-hide success message and return to main view after 2 seconds
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
            // Auto-hide success message and return to main view after 2 seconds
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

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
            return;
        }

        try {
            setUploadingAvatar(true);
            setMessage({ type: '', text: '' });

            const { success, error } = await uploadAvatar(file);

            if (success) {
                setMessage({ type: 'success', text: 'Profile photo updated!' });
            } else {
                setMessage({ type: 'error', text: error?.message || 'Failed to upload avatar' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const getInitials = () => {
        if (profile?.display_name) {
            return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email?.charAt(0).toUpperCase() || 'U';
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal-new" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="settings-header-new">
                    {activeView !== 'main' && (
                        <button onClick={() => {
                            setActiveView('main');
                            setMessage({ type: '', text: '' });
                        }} className="back-btn-new">
                            <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    )}
                    <h2>Settings</h2>
                    <button onClick={onClose} className="close-btn-new">
                        <X size={20} />
                    </button>
                </div>

                {/* Main View */}
                {activeView === 'main' && (
                    <div className="settings-content-new">
                        {/* User Profile Card */}
                        <div className="settings-card user-card" onClick={() => setActiveView('profile')}>
                            <div className="user-info">
                                <div className="user-avatar-settings">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.display_name || 'User'} />
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
                                    setActiveView('profile');
                                    setMessage({ type: '', text: '' });
                                }}>
                                    <div className="card-item-left">
                                        <User size={20} />
                                        <span>Profile details</span>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </button>

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
                    <div className="settings-detail-view">
                        <h3>Profile Details</h3>

                        {message.text && (
                            <div className={`settings-message-new ${message.type}`}>
                                {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <div className="avatar-upload-section">
                            <div className="avatar-preview-large">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.display_name || 'User'} />
                                ) : (
                                    <div className="avatar-placeholder-large">{getInitials()}</div>
                                )}
                                <label className="avatar-upload-btn" htmlFor="avatar-upload">
                                    {uploadingAvatar ? <Loader className="spin" size={20} /> : <Camera size={20} />}
                                </label>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    disabled={uploadingAvatar}
                                    hidden
                                />
                            </div>
                            <p className="avatar-hint">Click camera icon to change photo</p>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="settings-form-new">
                            <div className="form-group-new">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="settings-input-new"
                                />
                            </div>
                            <div className="form-group-new">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={user?.email}
                                    disabled
                                    className="settings-input-new disabled"
                                />
                                <span className="input-hint-new">Email cannot be changed</span>
                            </div>
                            <button type="submit" className="save-btn-new" disabled={loading}>
                                {loading ? <Loader className="spin" size={18} /> : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Password Edit View */}
                {activeView === 'password' && (
                    <div className="settings-detail-view">
                        <h3>Change Password</h3>

                        {message.text && (
                            <div className={`settings-message-new ${message.type}`}>
                                {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdatePassword} className="settings-form-new">
                            <div className="form-group-new">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Enter new password (min. 8 characters)"
                                    className="settings-input-new"
                                />
                            </div>
                            <div className="form-group-new">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Confirm new password"
                                    className="settings-input-new"
                                />
                            </div>
                            <button type="submit" className="save-btn-new" disabled={loading}>
                                {loading ? <Loader className="spin" size={18} /> : 'Update Password'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Delete Account View */}
                {activeView === 'delete' && (
                    <div className="settings-detail-view">
                        <h3>Delete Account</h3>

                        {message.text && (
                            <div className={`settings-message-new ${message.type}`}>
                                {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <div className="danger-warning-new">
                            <AlertTriangle size={24} />
                            <div>
                                <h4>Warning: This action is irreversible</h4>
                                <p>All your data, including chat history and preferences, will be permanently deleted.</p>
                            </div>
                        </div>

                        <div className="form-group-new">
                            <label>Type "DELETE" to confirm</label>
                            <input
                                type="text"
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder="DELETE"
                                className="settings-input-new danger-input"
                            />
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            className="delete-btn-new"
                            disabled={loading || deleteConfirm !== 'DELETE'}
                        >
                            {loading ? <Loader className="spin" size={18} /> : 'Delete My Account'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;
