import { Dimensions, Platform } from "react-native";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export const TOKENS = {
  surface: '#0d0f0d',
  surfaceLow: '#111412',
  surfaceHigh: '#1c211d',
  surfaceHighest: '#212722',
  primary: '#b9cbba',
  onSurface: '#ffffff',
  onSurfaceVariant: '#a6ada6',
  tertiary: '#fff8f2',
};

export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsLeft = Math.floor(totalSeconds % 60);
  return `${minutes}:${secondsLeft < 10 ? "0" : ""}${secondsLeft}`;
};

export const getLuminance = (hex) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return 0.5;
  const r = parseInt(rgb.substring(0, 2), 16) / 255;
  const g = parseInt(rgb.substring(2, 4), 16) / 255;
  const b = parseInt(rgb.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const darkenColor = (hex, factor = 0.4) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return "#070807";
  let r = parseInt(rgb.substring(0, 2), 16);
  let g = parseInt(rgb.substring(2, 4), 16);
  let b = parseInt(rgb.substring(4, 6), 16);
  
  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);
  
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const lightenColor = (hex, factor = 0.3) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return hex;
  let r = parseInt(rgb.substring(0, 2), 16);
  let g = parseInt(rgb.substring(2, 4), 16);
  let b = parseInt(rgb.substring(4, 6), 16);
  
  r = Math.floor(r + (255 - r) * factor);
  g = Math.floor(g + (255 - g) * factor);
  b = Math.floor(b + (255 - b) * factor);
  
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export { SCREEN_HEIGHT, SCREEN_WIDTH };
