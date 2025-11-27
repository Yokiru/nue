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
            setLoading(true);
            const { user, session } = await authService.getCurrentUser();
            setUser(user);
            setSession(session);

            if (user) {
                await loadUserProfile(user.id);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserProfile = async (userId) => {
        try {
            const { profile } = await authService.getUserProfile(userId);
            setProfile(profile);
        } catch (error) {
            console.error('Error loading profile:', error);
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
        try {
            console.log('Logout started');
            setLoading(true);

            // Set a timeout to force logout if Supabase takes too long
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Logout timeout - forcing local logout');
                    resolve({ error: null });
                }, 3000); // 3 second timeout
            });

            const signOutPromise = authService.signOut();

            // Race between actual signOut and timeout
            const { error } = await Promise.race([signOutPromise, timeoutPromise]);

            if (error) {
                console.error("Logout error:", error);
                // Continue to clear local state anyway
            }

            console.log('Logout completed, clearing state');
            return { success: true, error: null };
        } catch (error) {
            console.error("Logout exception:", error);
            return { success: false, error };
        } finally {
            // Always clear local state
            console.log('Clearing user state');
            setUser(null);
            setProfile(null);
            setSession(null);
            setLoading(false);
            console.log('Logout finished');

            // Force redirect to login page
            setTimeout(() => {
                window.location.href = '/login';
            }, 100);
        }
    };

    const updateProfile = async (updates) => {
        try {
            if (!user) {
                throw new Error('No user logged in');
            }

            const { error } = await authService.updateUserProfile(user.id, updates);

            if (error) {
                throw error;
            }

            // Reload profile
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
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
