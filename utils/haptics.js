import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Centralized Haptic Feedback Engine for Native Tactility
 */
export const haptics = {
  /**
   * Light impact for subtle touches: list item press, tab selection, letter scrubbing
   */
  impactLight: async () => {
    if (isWeb) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  },

  /**
   * Medium impact for primary actions: Play/Pause, Shuffle, Main action buttons
   */
  impactMedium: async () => {
    if (isWeb) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  },

  /**
   * Heavy impact for destructive or high-gravity actions
   */
  impactHeavy: async () => {
    if (isWeb) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}
  },

  /**
   * Selection tick for toggles: repeat mode, sort mode change, carousel snap
   */
  selection: async () => {
    if (isWeb) return;
    try {
      await Haptics.selectionAsync();
    } catch (_) {}
  },

  /**
   * Success notification pulse: favoriting / liking a song, sync complete
   */
  notificationSuccess: async () => {
    if (isWeb) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  },

  /**
   * Error notification pulse: sync failure, invalid action
   */
  notificationError: async () => {
    if (isWeb) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (_) {}
  },
};

export default haptics;
