import { supabase } from './supabase';

/**
 * Storage Service for Supabase Storage operations
 */

const AVATAR_BUCKET = 'avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const storageService = {
    /**
     * Upload avatar image to Supabase Storage
     * @param {string} userId - User ID
     * @param {File} file - Image file to upload
     * @returns {Promise<{url, error}>}
     */
    async uploadAvatar(userId, file) {
        try {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                throw new Error('File size must be less than 2MB');
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                throw new Error('File must be an image (JPEG, PNG, or WebP)');
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // Upload file to Supabase Storage
            console.log('📤 Uploading avatar to Supabase:', filePath);
            const { data, error } = await supabase.storage
                .from(AVATAR_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('❌ Supabase storage upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(AVATAR_BUCKET)
                .getPublicUrl(filePath);

            console.log('✅ Avatar uploaded successfully:', publicUrl);
            return { url: publicUrl, path: filePath, error: null };
        } catch (error) {
            console.error('❌ Upload avatar exception:', error);
            return { url: null, path: null, error };
        }
    },

    /**
     * Delete avatar from storage
     * @param {string} avatarPath - Path to avatar in storage
     * @returns {Promise<{error}>}
     */
    async deleteAvatar(avatarPath) {
        try {
            if (!avatarPath) return { error: null };

            // Extract path from URL if full URL is provided
            let path = avatarPath;
            if (avatarPath.includes(AVATAR_BUCKET)) {
                const parts = avatarPath.split(`${AVATAR_BUCKET}/`);
                path = parts[1] || avatarPath;
            }

            const { error } = await supabase.storage
                .from(AVATAR_BUCKET)
                .remove([path]);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Delete avatar error:', error);
            return { error };
        }
    },

    /**
     * Get public URL for avatar
     * @param {string} path - Path to avatar in storage
     * @returns {string} Public URL
     */
    getAvatarUrl(path) {
        if (!path) return null;

        const { data } = supabase.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(path);

        return data.publicUrl;
    }
};
