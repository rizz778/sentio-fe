/**
 * profileApi.js — Feature API: User Profile & Picture
 * =====================================================
 * Encapsulates all profile operations through the Sentio API Gateway.
 */

import { nodeClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

/**
 * Fetch the authenticated user's profile.
 * Returns null (instead of throwing) when the user has not set up a profile yet (404).
 *
 * @returns {Promise<object|null>} Normalised profile object, or null if not found
 */
export const fetchUserProfile = async () => {
  try {
    const res = await nodeClient.get(API_ENDPOINTS.PROFILE.BASE);
    const raw = res.data?.userProfile || res.data || {};

    return {
      name: raw.name,
      age: raw.age,
      gender: raw.gender,
      stressFrequency: raw.stressFrequency,
      sleep: raw.sleepHours ? `${raw.sleepHours} hours/night` : undefined,
      exercise: raw.exerciseFrequency,
      interests: raw.interests,
      goals: raw.goals,
      profilePicture: raw.profilePicture || { url: null, publicId: null },
      ...raw,
    };
  } catch (err) {
    // 404 means the user has never saved a profile yet — that's normal for new accounts.
    // Return null so callers can render an empty/setup state without crashing.
    if (err.message?.includes('Profile not found') || err.message?.includes('404')) {
      return null;
    }
    throw err; // re-throw any real server errors
  }
};

/**
 * Save / update the authenticated user's profile.
 *
 * @param {object} profileData
 * @returns {Promise<object>}
 */
export const saveUserProfile = async (profileData) => {
  const res = await nodeClient.post(API_ENDPOINTS.PROFILE.BASE, profileData);
  return res.data;
};

/**
 * Upload a profile picture to Cloudinary via node-backend.
 *
 * @param {FormData} formData
 * @returns {Promise<object>}
 */
export const uploadProfilePicture = async (formData) => {
  const res = await nodeClient.post(API_ENDPOINTS.PROFILE.UPLOAD_PICTURE, formData);
  return res.data;
};

/**
 * Delete the current profile picture.
 *
 * @returns {Promise<object>}
 */
export const deleteProfilePicture = async () => {
  const res = await nodeClient.delete(API_ENDPOINTS.PROFILE.DELETE_PICTURE);
  return res.data;
};

/**
 * Fetch user emotion analytics data.
 *
 * @returns {Promise<object>}
 */
export const fetchEmotionAnalytics = async () => {
  const res = await nodeClient.get(API_ENDPOINTS.PROFILE.EMOTION_ANALYTICS);
  return res.data;
};
