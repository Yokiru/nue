import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Clock, Trash2, ArrowLeftToLine, Workflow, FileQuestion } from 'lucide-react';
import './Sidebar.css';
import { supabase } from '../services/supabase';
import ProfileSection from './ProfileSection';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ isOpen, toggle }) => {
    const [history, setHistory] = useState([]);
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const loadHistory = async () => {
            // Only load history if user is authenticated
            if (!isAuthenticated || !user) {
                setHistory([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('history')
                    .select('*')
                    .eq('user_id', user.id)  // CRITICAL: Filter by user_id
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;
                setHistory(data || []);
            } catch (e) {
                console.error("Failed to load history", e);
                setHistory([]);
            }
        };

        loadHistory();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('history_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, () => {
                loadHistory();
            })
            .subscribe();

        // Also listen for custom local event as fallback/immediate update
        window.addEventListener('historyUpdated', loadHistory);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('historyUpdated', loadHistory);
        };
    }, [isAuthenticated, user]);

    const handleDelete = async (e, itemToDelete) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from('history')
                .delete()
                .eq('id', itemToDelete.id);

            if (error) throw error;

            // Optimistic update
            setHistory(prev => prev.filter(item => item.id !== itemToDelete.id));
        } catch (e) {
            console.error("Failed to delete history item", e);
        }
    };

    const handleHistoryClick = (query) => {
        navigate(`/result?q=${encodeURIComponent(query)}`, { state: { query } });
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={toggle}
                        className="sidebar-overlay"
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: isOpen ? 0 : "-100%" }}
                transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                className="sidebar-container"
            >
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <img src="/logo-nue.png" alt="Nue" className="sidebar-logo" />
                        <span className="sidebar-app-name">Nue</span>
                    </div>
                    <button
                        onClick={toggle}
                        className="sidebar-toggle-btn open"
                        aria-label="Close Sidebar"
                    >
                        <ArrowLeftToLine size={20} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="sidebar-content">
                    <div className="sidebar-menu">
                        <div className="sidebar-menu-item coming-soon">
                            <div className="menu-icon">
                                <Workflow size={16} />
                            </div>
                            <span className="menu-text">{t('nav.mindmap')}</span>
                            <span className="badge">{t('nav.soon')}</span>
                        </div>
                        <div className="sidebar-menu-item coming-soon">
                            <div className="menu-icon">
                                <FileQuestion size={16} />
                            </div>
                            <span className="menu-text">{t('nav.quizzes')}</span>
                            <span className="badge">{t('nav.soon')}</span>
                        </div>
                    </div>

                    <div className="sidebar-divider"></div>

                    <div className="sidebar-section-title">{t('nav.recents')}</div>
                    {history.length === 0 ? (
                        <p className="empty-history">{t('nav.no_chats')}</p>
                    ) : (
                        <ul className="history-list">
                            {history.map((item, index) => (
                                <li key={index}>
                                    <div
                                        onClick={() => handleHistoryClick(item.query)}
                                        className="history-item"
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="history-content-wrapper">
                                            <div className="history-icon">
                                                <Clock size={16} />
                                            </div>
                                            <span className="history-text">{item.query}</span>
                                        </div>
                                        <button
                                            className="delete-history-btn"
                                            onClick={(e) => handleDelete(e, item)}
                                            aria-label="Delete history item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Profile Section at Bottom */}
                <ProfileSection />
            </motion.div>

            {!isOpen && (
                <button
                    onClick={toggle}
                    className="sidebar-toggle-btn closed"
                    aria-label="Open Sidebar"
                >
                    <Menu size={24} strokeWidth={1.5} />
                </button>
            )}
        </>
    );
};

export default Sidebar;
