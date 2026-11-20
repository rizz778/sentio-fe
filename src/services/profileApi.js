
import { nodeClient } from "./apiClient";

/**
 * Fetch the authenticated user's profile.
 * Flattens the nested `userProfile` envelope if present, and normalises
 * `sleepHours` into a human-readable string for display.
 *
 * @returns {Promise<object>} Normalised profile object
 */
export const fetchUserProfile = async () => {
  const res = await nodeClient.get("/api/profile");
  const raw = res.data?.userProfile || res.data || {};

  return {
    name: raw.name,
    age: raw.age,
    gender: raw.gender,
    stressFrequency: raw.stressFrequency,
    // Normalise sleepHours number → readable string
    sleep: raw.sleepHours ? `${raw.sleepHours} hours/night` : undefined,
    exercise: raw.exerciseFrequency,
    interests: raw.interests,
    goals: raw.goals,
    // Spread the rest so no field is ever lost
    ...raw,
  };
};
