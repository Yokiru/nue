import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getInitials, generateAvatarColor, getAvatarUrl } from '../utils/avatarUtils';
import { Settings, LogOut, HelpCircle, Globe, Check, MoreHorizontal } from 'lucide-react';
import './ProfileSection.css';

const ProfileSection = () => {
    const navigate = useNavigate();
    const { user, profile, isAuthenticated, logout } = useAuth();
    const { language, changeLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await logout();
        } catch (error) {
            console.error("Logout error in component:", error);
        } finally {
            navigate('/login');
        }
    };

    const handleLanguageToggle = async () => {
        const newLang = language === 'en' ? 'id' : 'en';
        await changeLanguage(newLang);
    };

    if (!isAuthenticated) {
        return (
            <div className="profile-section">
                <button
                    className="login-prompt-btn"
                    onClick={() => navigate('/login')}
                >
                    {t('auth.signin')}
                </button>
            </div>
        );
    }

    const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || '';
    const avatarUrl = getAvatarUrl(profile || user);
    const initials = getInitials(displayName);
    const avatarColor = generateAvatarColor(displayName);

    return (
        <>
            <div className="profile-container" ref={menuRef}>
                {isOpen && (
                    <div className="profile-menu">
                        <div className="menu-header">
                            <div className="menu-avatar">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} className="avatar-image" />
                                ) : (
                                    <div
                                        className="avatar-placeholder"
                                        style={{ backgroundColor: avatarColor }}
                                    >
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="menu-user-info">
                                <div className="menu-name">{displayName}</div>
                                <div className="menu-plan">{profile?.subscription_plan || 'Free plan'}</div>
                            </div>
                        </div>

                        <div className="menu-items">
                            <button
                                className="menu-item"
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/settings');
                                }}
                            >
                                <Settings size={16} />
                                <span>{t('menu.settings')}</span>
                            </button>
                            <button className="menu-item" onClick={handleLanguageToggle}>
                                <Globe size={16} />
                                <div className="menu-item-content">
                                    <span>{t('menu.language')}</span>
                                    <span className="language-badge">{language === 'en' ? 'English' : 'Indonesia'}</span>
                                </div>
                            </button>
                            <button className="menu-item">
                                <HelpCircle size={16} />
                                <span>{t('menu.help')}</span>
                            </button>
                            <div className="menu-divider"></div>
                            <button className="menu-item logout" type="button" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>{t('menu.logout')}</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className={`profile-section ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <div className="profile-avatar">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="avatar-image" />
                        ) : (
                            <div
                                className="avatar-placeholder"
                                style={{ backgroundColor: avatarColor }}
                            >
                                {initials}
                            </div>
                        )}
                    </div>
                    <div className="profile-info">
                        <div className="profile-name">{displayName}</div>
                        <div className="profile-email">{email}</div>
                    </div>
                    <MoreHorizontal size={20} className="profile-more-icon" />
                </div>
            </div>
        </>
    );
};

export default ProfileSection;
