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
            const { data, error } = await supabase.rpc('check_email_exists', {
                email_to_check: email
            });

            if (error) {
                console.error('Error checking email:', error);
                return { exists: false, error };
            }

            return { exists: data, error: null };
        } catch (error) {
            console.error('Exception checking email:', error);
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
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Sign In Timeout')), 10000) // 10s timeout for login
            );

            const { data, error } = await Promise.race([
                supabase.auth.signInWithPassword({
                    email,
                    password,
                }),
                timeoutPromise
            ]);

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
            console.log('🕵️ authService: getCurrentUser calling getUser()');

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );

            // Race getUser against timeout
            const { data: { user }, error } = await Promise.race([
                supabase.auth.getUser(),
                timeoutPromise
            ]);

            console.log('🕵️ authService: getUser() result', { hasUser: !!user, error });

            if (error) throw error;

            console.log('🕵️ authService: getCurrentUser calling getSession()');
            const { data: { session } } = await supabase.auth.getSession();
            console.log('🕵️ authService: getSession() result', { hasSession: !!session });

            return { user, session, error: null };
        } catch (error) {
            console.error('🕵️ authService: getCurrentUser error', error);

            // Fallback: try getSession if getUser fails/times out
            try {
                console.log('🕵️ authService: Fallback to getSession');

                // Also race getSession against timeout
                const sessionTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session Timeout')), 2000)
                );

                const { data: { session } } = await Promise.race([
                    supabase.auth.getSession(),
                    sessionTimeoutPromise
                ]);

                console.log('🕵️ authService: Fallback getSession result', { hasSession: !!session });
                return { user: session?.user || null, session, error: null };
            } catch (sessionError) {
                console.error('🕵️ authService: Fallback getSession error', sessionError);
                return { user: null, session: null, error: sessionError };
            }
        }
    },

    /**
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
