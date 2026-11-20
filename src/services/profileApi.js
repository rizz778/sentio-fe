/**
 * profileApi.js — Feature API: User Profile & Picture
 * =====================================================
 * Encapsulates all profile operations through the Sentio API Gateway.
 */

import { nodeClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

/**
 * Fetch the authenticated user's profile.
 *
 * @returns {Promise<object>} Normalised profile object
 */
export const fetchUserProfile = async () => {
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
