import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    // Load user on mount
    useEffect(() => {
        loadUser();

        // Listen to auth changes
        const { data: { subscription } } = authService.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN') {
                    setSession(session);
                    setUser(session?.user || null);
                    if (session?.user) {
                        await loadUserProfile(session.user.id);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                }
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const loadUser = async () => {
        try {
            console.log('🔐 AuthContext: loadUser started');
            setLoading(true);

            // Load cached profile immediately for instant display
            const cached = localStorage.getItem('nue_user_profile');
            if (cached) {
                try {
                    setProfile(JSON.parse(cached));
                    console.log('🔐 AuthContext: Loaded cached profile');
                } catch (e) {
                    console.error('Failed to parse cached profile');
                }
            }

            const { user, session } = await authService.getCurrentUser();
            console.log('🔐 AuthContext: getCurrentUser result', { hasUser: !!user, hasSession: !!session });

            setUser(user);
            setSession(session);

            if (user) {
                console.log('🔐 AuthContext: Loading profile for', user.id);
                // Don't await profile load to prevent blocking app init
                loadUserProfile(user.id);
            } else {
                // Clear cache if no user
                localStorage.removeItem('nue_user_profile');
                setProfile(null);
            }
        } catch (error) {
            console.error('🔐 AuthContext: Error loading user:', error);
        } finally {
            console.log('🔐 AuthContext: loadUser finished, setting loading to false');
            setLoading(false);
        }
    };

    const loadUserProfile = async (userId) => {
        try {
            const { profile, error } = await authService.getUserProfile(userId);
            if (profile) {
                setProfile(profile);
                // Cache profile to localStorage
                localStorage.setItem('nue_user_profile', JSON.stringify(profile));
            } else if (error) {
                console.error('Error loading profile:', error);
                // Try to use cached profile if available
                const cached = localStorage.getItem('nue_user_profile');
                if (cached) {
                    try {
                        setProfile(JSON.parse(cached));
                    } catch (e) {
                        console.error('Failed to parse cached profile');
                    }
                }
            }
        } catch (error) {
            console.error('Exception loading profile:', error);
            // Try to use cached profile
            const cached = localStorage.getItem('nue_user_profile');
            if (cached) {
                try {
                    setProfile(JSON.parse(cached));
                } catch (e) {
                    console.error('Failed to parse cached profile');
                }
            }
        }
    };

    const register = async (email, password, displayName) => {
        try {
            setLoading(true);
            const { user, error } = await authService.signUp(email, password, displayName);

            if (error) {
                throw error;
            }

            return { success: true, error: null };
        } catch (error) {
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            console.log('Login attempt started');
            setLoading(true);
            const { user, session, error } = await authService.signIn(email, password);

            if (error) {
                console.error('Sign in error:', error);
                throw error;
            }

            console.log('Sign in successful, user:', user);
            setUser(user);
            setSession(session);

            if (user) {
                console.log('Loading user profile...');
                try {
                    await loadUserProfile(user.id);
                    console.log('Profile loaded successfully');
                } catch (profileError) {
                    console.error('Profile load error (non-fatal):', profileError);
                    // Continue even if profile fails to load
                }
            }

            console.log('Login completed successfully');
            return { success: true, error: null };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error };
        } finally {
            console.log('Setting loading to false');
            setLoading(false);
        }
    };

    const logout = async () => {
        console.log('Logout started');

        // Clear state immediately
        setUser(null);
        setProfile(null);
        setSession(null);

        // Clear cached profile
        localStorage.removeItem('nue_user_profile');

        try {
            // Set a timeout to force logout if Supabase takes too long
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Logout timeout - forcing local logout');
                    resolve({ error: null });
                }, 2000); // 2 second timeout
            });

            const signOutPromise = authService.signOut();

            // Race between actual signOut and timeout
            await Promise.race([signOutPromise, timeoutPromise]);

            console.log('Logout completed from Supabase');
        } catch (error) {
            console.error("Logout exception:", error);
        }

        console.log('Logout finished - state cleared');
    };

    const updateProfile = async (updates) => {
        try {
            if (!user) {
                throw new Error('No user logged in');
            }

            // Optimistic update - immediately update UI and cache
            const updatedProfile = {
                ...profile,
                ...updates
            };
            setProfile(updatedProfile);
            localStorage.setItem('nue_user_profile', JSON.stringify(updatedProfile));

            const { error } = await authService.updateUserProfile(user.id, updates);

            if (error) {
                // Revert on error
                await loadUserProfile(user.id);
                throw error;
            }

            // Reload profile to ensure sync
            await loadUserProfile(user.id);

            return { success: true, error: null };
        } catch (error) {
            return { success: false, error };
        }
    };

    const updatePassword = async (newPassword) => {
        try {
            setLoading(true);
            const { error } = await authService.updatePassword(newPassword);
            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    const deleteAccount = async () => {
        try {
            setLoading(true);
            const { error } = await authService.deleteAccount();
            if (error) throw error;

            setUser(null);
            setProfile(null);
            setSession(null);

            return { success: true, error: null };
        } catch (error) {
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    const uploadAvatar = async (file) => {
        try {
            if (!user) {
                throw new Error('No user logged in');
            }

            setLoading(true);
            const oldAvatarUrl = profile?.avatar_url;

            const { url, error } = await authService.uploadUserAvatar(user.id, file, oldAvatarUrl);

            if (error) throw error;

            // Update local profile state
            const updatedProfile = {
                ...profile,
                avatar_url: url
            };
            setProfile(updatedProfile);
            localStorage.setItem('nue_user_profile', JSON.stringify(updatedProfile));

            return { success: true, url, error: null };
        } catch (error) {
            console.error('Upload avatar error:', error);
            return { success: false, url: null, error };
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        profile,
        session,
        loading,
        register,
        login,
        logout,
        updateProfile,
        updatePassword,
        deleteAccount,
        uploadAvatar,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
