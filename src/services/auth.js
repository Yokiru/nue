import { supabase } from './supabase';

/**
 * Authentication Service
 * Wrapper for Supabase Auth operations
 */

export const authService = {
    /**
     * Register a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} displayName - User display name
     * @returns {Promise<{user, error}>}
     */
    async signUp(email, password, displayName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                    },
                },
            });

            if (error) throw error;

            // Create user profile
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: data.user.id,
                        display_name: displayName,
                        language_preference: 'auto',
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }
            }

            return { user: data.user, error: null };
        } catch (error) {
            return { user: null, error };
        }
    },

    /**
     * Check if email already exists
     * @param {string} email - Email to check
     * @returns {Promise<{exists, error}>}
     */
    async checkEmailExists(email) {
        try {
            // Try to get user by email from auth.users (admin only)
            // Since we can't access auth.users directly, we'll use a workaround:
            // Try to sign in with a dummy password and check the error
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: 'dummy-check-password-' + Math.random(),
            });

            // If error message indicates invalid credentials, email exists
            // If error message indicates user not found, email doesn't exist
            if (error) {
                if (error.message.includes('Invalid login credentials') ||
                    error.message.includes('Email not confirmed')) {
                    return { exists: true, error: null };
                } else {
                    return { exists: false, error: null };
                }
            }

            // If somehow successful (shouldn't happen with random password)
            return { exists: true, error: null };
        } catch (error) {
            return { exists: false, error };
        }
    },

    /**
     * Sign in existing user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<{user, error}>}
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            return { user: data.user, session: data.session, error: null };
        } catch (error) {
            return { user: null, session: null, error };
        }
    },

    /**
     * Sign out current user
     * @returns {Promise<{error}>}
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    },

    /**
     * Get current user session
     * @returns {Promise<{user, session}>}
     */
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;

            const { data: { session } } = await supabase.auth.getSession();

            return { user, session, error: null };
        } catch (error) {
            return { user: null, session: null, error };
        }
    },

    /**
     * Listen to auth state changes
     * @param {Function} callback - Callback function
     * @returns {Object} Subscription object
     */
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },

    /**
     * Send password reset email
     * @param {string} email - User email
     * @returns {Promise<{error}>}
     */
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    },

    /**
     * Get user profile
     * @param {string} userId - User ID
     * @returns {Promise<{profile, error}>}
     */
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { profile: data, error: null };
        } catch (error) {
            return { profile: null, error };
        }
    },

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updates - Profile updates
     * @returns {Promise<{error}>}
     */
    async updateUserProfile(userId, updates) {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    },
    /**
     * Update user password
     * @param {string} newPassword - New password
     * @returns {Promise<{error}>}
     */
    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    },

    /**
     * Delete user account
     * @returns {Promise<{error}>}
     */
    async deleteAccount() {
        try {
            // Try calling a database function first (best practice)
            const { error: rpcError } = await supabase.rpc('delete_user');

            if (rpcError) {
                // Fallback: Delete profile and sign out (if RPC doesn't exist)
                // Note: This doesn't delete the auth user without backend logic
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('user_profiles').delete().eq('id', user.id);
                }
            }

            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            return { error: null };
        } catch (error) {
            return { error };
        }
    },
};
