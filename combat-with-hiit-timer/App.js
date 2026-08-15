import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
  PanResponder,
  SafeAreaView,
  Platform,
  Modal,
  StatusBar,
  TextInput,
  Alert,
  AppState,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFonts, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import { Accelerometer } from 'expo-sensors';
import * as StoreReview from 'expo-store-review';
import { Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { requireOptionalNativeModule } from 'expo';

// ---------- Audio: cue sounds ----------
const CUE_SOUNDS = {
  woodblock: require('./assets/sounds/woodblock.wav'),
  bell: require('./assets/sounds/bell.wav'),
  beep: require('./assets/sounds/beep.wav'),
  whistle: require('./assets/sounds/whistle.wav'),
};
const CUE_SOUND_NAMES = ['woodblock', 'bell', 'beep', 'whistle'];
const CUE_SOUND_LABELS = { woodblock: 'Woodblock', bell: 'Brass Bell', beep: 'Digital Beep', whistle: 'Whistle' };

// ---------- Voice packs (persona presets) ----------
const VOICE_PACKS = [
  { id: 'coach', label: 'Intense Coach', desc: 'Fast, commanding', rate: 1.15, pitch: 0.9 },
  { id: 'calm', label: 'Calm Corner', desc: 'Measured, clear', rate: 0.85, pitch: 1.0 },
  { id: 'urgency', label: 'Corner Urgency', desc: 'Rapid fire, high energy', rate: 1.35, pitch: 1.1 },
  { id: 'custom', label: 'Custom', desc: 'Your own rate/pitch', rate: null, pitch: null },
];

// ---------- Combo modifiers (defensive / stance / target zones) ----------
const COMBO_MODIFIERS = {
  defensive: ['Slip', 'Roll', 'Duck', 'Pivot', 'Shoulder roll', 'Pull counter', 'Parry', 'Step back'],
  stance: ['Switch stance', 'Southpaw switch', 'Shift lead foot'],
  target: ['to the body', 'to the head', 'to the liver', 'to the chin', 'to the solar plexus'],
};

// ---------- Pre-set workout programs (coach templates) ----------
const PROGRAMS = [
  {
    id: 'mt-pads', name: '5-Round Muay Thai Pad Conditioning', style: 'Muay Thai', rounds: 5, work: 180, rest: 60,
    desc: 'Heavy bag / pad rounds. 3-min work, 1-min rest.', focus: 'Kicks & clinch',
  },
  {
    id: 'box-speed', name: '3-Round Boxing Speed & Defense', style: 'Boxing', rounds: 3, work: 120, rest: 45,
    desc: 'Fast hands + slips. 2-min rounds, sharp bursts.', focus: 'Speed & head movement',
  },
  {
    id: 'mma-cardio', name: 'MMA Cardio Blast', style: 'MMA', rounds: 5, work: 150, rest: 30,
    desc: 'Mixed striking + takedown chains. Short rest.', focus: 'Conditioning',
  },
  {
    id: 'kb-power', name: 'Kickboxing Power Builder', style: 'Kickboxing', rounds: 6, work: 90, rest: 30,
    desc: 'Heavy low kicks + body shots. 90-sec bursts.', focus: 'Power',
  },
  {
    id: 'sambo-gnp', name: 'Sambo Striking to Ground', style: 'Combat Sambo', rounds: 4, work: 120, rest: 60,
    desc: 'Strikes flowing into takedown + GNP chains.', focus: 'Transitions',
  },
  {
    id: 'bjj-flow', name: 'BJJ Position Flow Drill', style: 'BJJ', rounds: 4, work: 150, rest: 45,
    desc: 'Guard to sweep to sub chains at drill pace.', focus: 'Position chains',
  },
  {
    id: 'wres-takedown', name: 'Wrestling Takedown Reps', style: 'Wrestling', rounds: 5, work: 60, rest: 60,
    desc: 'High-rep takedown + finish sequences.', focus: 'Explosiveness',
  },
  {
    id: 'judo-throws', name: 'Judo Throws & Holds', style: 'Judo', rounds: 3, work: 180, rest: 90,
    desc: 'Long rounds: throw combos into pins.', focus: 'Technique',
  },
];

// ---------- Cadence / rhythm presets ----------
const CADENCES = [
  { id: 'explosive', label: 'Explosive', gap: 3, desc: '2-3s gaps, bursts' },
  { id: 'standard', label: 'Standard', gap: 5, desc: 'steady 5s' },
  { id: 'endurance', label: 'Endurance', gap: 6, desc: '5-6s gaps, long pace' },
  { id: 'custom', label: 'Custom', gap: null, desc: 'your own interval' },
];

// ---------- Analytics: zero-dep PostHog capture (no SDK deps, fire-and-forget) ----------
// Configure via .env: EXPO_PUBLIC_POSTHOG_KEY=phc_xxx (Expo auto-inlines EXPO_PUBLIC_* vars).
// Events silently no-op when the key is empty, so the app works without setup.
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const ANALYTICS_ENABLED = POSTHOG_KEY.length > 0;
const track = (event, properties = {}) => {
  if (!ANALYTICS_ENABLED) return;
  try {
    fetch('https://us.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: 'mycombat-user',
        properties: { ...properties, app: 'mycombat', platform: Platform.OS, ts: new Date().toISOString() },
      }),
    }).catch(() => {});
  } catch (e) { /* analytics never blocks */ }
};

// ---------- Monetization: entitlements + soft gating ----------
// Free users get a taste: 3 styles (181 combos). The other 7 styles (644
// combos) + full library are Pro. Keep the free wall generous enough to learn
// the app, but make the full 825-combination library the reason to pay.
const FREE_STYLES = ['Boxing', 'Muay Thai', 'Karate'];
const PRO_PRICING = {
  monthly: 4.99, annual: 49.99,
};
// Health & Fitness category data: annual is the dominant + growing plan type,
// trials boost annual LTV, and high-priced apps earn ~4x LTV of low-priced.
// Annual leads the paywall; monthly is the low-commitment fallback.
const TRIAL_DAYS = 7;
const PRO_FEATURES = [
  'All 10 styles — full 825-combo library',
  'Unlimited custom combos & styles',
  'Premium voice packs + tempo control',
  'Hands-free tap controls',
  'Full workout history & analytics',
  'Ad-free — always',
];

// ---------- Typography (Barlow Condensed = sports/athletic headings, Barlow = body) ----------
const FONT = {
  heading: 'BarlowCondensed_700Bold',
  headingSemi: 'BarlowCondensed_600SemiBold',
  headingMed: 'BarlowCondensed_500Medium',
  body: 'Barlow_400Regular',
  bodyMed: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
};

const { width, height } = Dimensions.get('window');

// ---------- Data ----------
const taskDifficulties = {
    'Boxing': { 1: "Jab > Right cross", 2: "Jab > Jab > Right cross", 3: "Double jab > Right cross", 4: "Jab > Right cross > Left hook", 5: "Jab > Right cross > Left hook > Right cross", 6: "Jab > Left hook > Right cross", 7: "Right cross > Left hook > Right cross", 8: "Jab > Jab > Left hook > Right cross", 9: "Jab > Right cross > Left hook to the body > Left hook to the head", 10: "Jab to the body > Right cross to the head", 11: "Jab > Right hook to the body > Left hook to the head", 12: "Jab > Right cross > Slip left > Right cross", 13: "Jab > Right cross > Left hook", 14: "Jab > Jab > Right cross > Left hook", 15: "Jab > Right cross > Slip right > Right cross", 16: "Jab > Right cross > Left uppercut > Right cross", 17: "Jab > Left hook to the body > Right cross to the head", 18: "Right uppercut > Left hook > Right cross", 19: "Jab > Right cross > Left hook > Right uppercut", 20: "Jab > Right cross > Slip left > Left hook > Right cross", 21: "Double jab > Right cross > Left hook", 22: "Jab > Right cross > Left hook > Right hook to the body", 23: "Jab > Right cross > Duck > Left hook > Right uppercut", 24: "Right cross > Left hook > Right cross > Left hook to the body", 25: "Jab > Right cross > Pivot right > Left hook", 26: "Jab > Fake right > Left hook", 27: "Jab > Left hook to the body > Right hook to the body", 28: "Jab > Right cross > Left hook > Step back > Reset", 29: "Jab > Right cross > Left hook > Right hook > Jab", 30: "Jab > Right cross > Slip left > Left hook > Right cross > Slip right", 31: "Jab > Fake right > Slip right > Right cross > Left hook", 32: "Double jab > Right cross > Left hook > Right hook to the body", 33: "Jab > Right cross > Left uppercut > Right hook > Left hook to the body", 34: "Jab > Right cross > Step back > Jab > Right cross", 35: "Jab > Right cross > Left hook > Pivot left > Left hook", 36: "Jab > Left hook to the body > Right hook to the head > Left hook", 37: "Right cross > Left hook > Right cross > Duck > Left hook", 38: "Jab > Right cross > Left hook > Right uppercut > Step back", 39: "Double jab > Right cross > Left hook > Right hook > Left hook", 40: "Jab > Right cross > Left hook > Right hook > Pause > Left hook to the body" },
    'Kickboxing': { 1: "Jab, Cross, Left Hook, Right Low Kick", 2: "Cross, Left Hook, Right Hook, Left Body Kick", 3: "Jab, Right Cross, Left Uppercut, Right Hook", 4: "Left Hook, Cross, Left Body Kick, Right Low Kick", 5: "Right Cross, Left Hook, Right Low Kick", 6: "Jab, Right Cross, Left Uppercut, Right Uppercut", 7: "Left Hook, Cross, Left Body Kick, Right Leg Kick", 8: "Cross, Left Hook, Right Hook, Left High Kick", 9: "Jab, Cross, Left Uppercut, Right Elbow", 10: "Right Cross, Left Hook, Left Hook, Right Low Kick", 11: "Left Jab, Right Cross, Left Body Hook, Right Leg Kick", 12: "Right Cross, Left Hook, Left Kick to the Body, Right Hook", 13: "Jab, Left Hook, Right Cross, Left Roundhouse Kick", 14: "Left Jab, Right Cross, Left High Kick, Right Cross", 15: "Right Cross, Left Hook, Right Uppercut, Left Hook, Right Leg Kick", 16: "Left Hook, Right Hook, Left High Kick, Right Cross", 17: "Jab, Cross, Left Hook, Right Roundhouse Kick", 18: "Jab, Right Cross, Left Hook, Right Hook, Left Body Kick", 19: "Left Hook, Right Cross, Left Roundhouse Kick, Right Hook", 20: "Cross, Left Hook, Right Low Kick, Left Hook", 21: "Jab, Cross, Right Uppercut, Left Hook, Right Cross", 22: "Cross, Left Hook, Left Body Kick, Right Low Kick", 23: "Jab, Cross, Right Hook, Left High Kick", 24: "Left Jab, Right Cross, Left Uppercut, Right Hook, Left Roundhouse Kick", 25: "Right Cross, Left Hook, Right Cross, Left Kick to the Body", 26: "Jab, Right Cross, Left Hook, Right Uppercut, Left Hook", 27: "Cross, Left Hook, Right Low Kick, Left Hook, Right Cross", 28: "Left Hook, Right Cross, Left Uppercut, Right Elbow, Left Body Kick", 29: "Right Cross, Left Hook, Right Hook, Left High Kick, Right Leg Kick", 30: "Jab, Cross, Left Hook, Right Hook, Left Low Kick", 31: "Left Hook, Right Cross, Left Uppercut, Right Low Kick, Left Hook", 32: "Right Cross, Left Hook, Right Uppercut, Left Leg Kick", 33: "Cross, Left Hook, Right Uppercut, Left Hook, Right Roundhouse Kick", 34: "Jab, Right Cross, Left Hook, Right Uppercut, Left Body Kick", 35: "Left Jab, Right Cross, Left Hook, Right Cross, Left Roundhouse Kick", 36: "Right Cross, Left Hook, Right Hook, Left Leg Kick, Right Uppercut", 37: "Cross, Left Hook, Right Body Kick, Left Low Kick", 38: "Left Hook, Right Cross, Left Uppercut, Right Cross", 39: "Right Cross, Left Hook, Left Body Hook, Right Hook, Left Roundhouse Kick", 40: "Jab, Cross, Left Uppercut, Right Low Kick, Left Body Kick", 41: "Left Hook, Right Hook, Left High Kick, Right Cross, Left Low Kick", 42: "Jab, Right Cross, Left Hook, Right Low Kick, Left Hook, Right Cross", 43: "Cross, Left Hook, Right Uppercut, Left High Kick", 44: "Jab, Cross, Left Hook, Right Hook, Left High Kick, Right Leg Kick", 45: "Right Cross, Left Hook, Left High Kick, Right Hook, Left Low Kick", 46: "Left Hook, Right Cross, Left Uppercut, Right Leg Kick, Left Cross", 47: "Jab, Cross, Left Hook, Right Hook, Left High Kick, Right Cross", 48: "Jab, Cross, Left Hook, Right Overhand", 49: "Jab, Cross, Left Uppercut, Right Hook", 50: "Left Hook, Right Uppercut, Left Hook, Right Cross", 51: "Right Cross, Left Hook, Right Hook", 52: "Double Jab, Right Overhand, Left Hook", 53: "Jab, Cross, Liver Shot", 54: "Right Uppercut, Left Hook, Right Hook", 55: "Cross, Left Hook, Right Head Kick", 56: "Right Straight, Left Hook to the Body, Right Uppercut", 57: "Left Hook, Right Hook, Left Hook to the Liver", 58: "Jab, Cross, Left Head Kick", 59: "Left Hook, Right Low Kick, Left Hook, Right High Kick", 60: "Cross, Left Body Kick, Right Head Kick", 61: "Right Low Kick, Left Hook, Right Head Kick", 62: "Left Uppercut, Right Body Kick, Left High Kick", 63: "Jab, Cross, Spinning Heel Kick", 64: "Lead Teep, Right Cross, Left Head Kick", 65: "Left Hook, Right Body Kick, Left Switch Kick", 66: "Right Body Kick, Left Hook, Right Overhand", 67: "Fake Low Kick, Question Mark Kick", 68: "Clinch, Right Knee, Left Elbow", 69: "Right Cross, Left Elbow, Right Knee", 70: "Teep, Right Cross, Left Step-in Elbow", 71: "Jab, Cross, Right Flying Knee", 72: "Cross, Clinch, Right Knee to the Liver", 73: "Step-in Elbow, Right Hook, Left Head Kick", 74: "Jab, Right Uppercut, Left Knee", 75: "Right Hook, Left Elbow, Right Head Kick", 76: "Left Body Kick, Right Elbow, Left Hook", 77: "Teep, Right Hook, Spinning Elbow", 78: "Left Hook, Spinning Back Kick to the Liver", 79: "Right Cross, Spinning Backfist", 80: "Jab, Left Hook, Spinning Heel Kick", 81: "Low Kick, Superman Punch, Left Head Kick", 82: "Cross, Spinning Hook Kick", 83: "Step-in Elbow, Spinning Back Kick", 84: "Flying Knee, Right Overhand", 85: "Jab, Right Hook, Spinning Elbow", 86: "Teep to the Face, Cross, Left Head Kick", 87: "Switch Kick, Spinning Heel Kick", 88: "Right Hook, Left Hook, Right High Kick", 89: "Body Kick, Hook, Superman Punch", 90: "Uppercut, Right Hook, Left Head Kick", 91: "Right Hook, Left Body Kick, Right Spinning Hook Kick", 92: "Jab, Cross, Lead Head Kick", 93: "Cross, Hook, Overhand Right, Left Head Kick", 94: "Lead Uppercut, Overhand Right, High Kick", 95: "Teep, Cross, Hook, High Kick", 96: "Cross, Clinch Knee, Right Hook, High Kick" },
    'Muay Thai': { 1: "Jab > Cross > Left Hook > Right Roundhouse Kick", 2: "Cross > Left Hook > Right Uppercut > Left Kick to the Liver", 3: "Jab > Right Overhand > Left Kick to the Head", 4: "Lead Uppercut > Right Cross > Left Hook > Right Low Kick", 5: "Jab > Cross > Right Teep > Left High Kick", 6: "Jab > Cross > Right Up Elbow > Left Hook > Right Elbow", 7: "Lead Uppercut > Right Overhand > Left Spinning Elbow", 8: "Right Cross > Left Uppercut > Right Horizontal Elbow", 9: "Left Hook > Right Elbow > Left Knee to the Body", 10: "Jab > Right Elbow > Left Hook > Right Uppercut", 11: "Jab > Right Uppercut > Left Knee to the Solar Plexus", 12: "Left Teep > Jab > Right Knee to the Body", 13: "Right Cross > Left Hook > Right Jumping Knee", 14: "Left Hook to the Body > Right Knee to the Chin", 15: "Jab > Cross > Clinch > Right Knee to the Liver", 16: "Right Low Kick > Jab > Cross > Left High Kick", 17: "Left Teep > Right Low Kick > Left Hook > Right Overhand", 18: "Jab > Cross > Right Low Kick > Right Head Kick", 19: "Inside Low Kick > Left Hook > Right Cross > Left Hook to the Body", 20: "Lead Hook > Rear Low Kick > Rear Overhand Punch", 21: "Jab > Cross > Left Hook > Right Head Kick", 22: "Teep > Jab > Right Teep > Left High Kick", 23: "Left Hook > Right Cross > Left High Kick", 24: "Left Body Kick > Right Hook > Left Head Kick", 25: "Right Low Kick > Jab > Cross > Left Head Kick", 26: "Left Hook > Right Clinch > Left Knee to the Chin", 27: "Cross > Clinch > Left Elbow > Right Knee", 28: "Jab > Right Cross > Plum Clinch > Left Knee to the Solar Plexus", 29: "Overhand Right > Clinch > Repeated Right Knees to the Head", 30: "Right Uppercut > Clinch > Left Horizontal Elbow", 31: "Jab > Spinning Back Elbow", 32: "Cross > Left Hook > Spinning Back Kick", 33: "Jab > Cross > Spinning Back Fist", 34: "Teep > Spinning Heel Kick", 35: "Right Hook > Spinning Elbow > Right High Kick", 36: "Front Teep to the Face", 37: "Jab > Right Teep to the Body > Left Head Kick", 38: "Teep > Right Cross > Left Hook > Right Teep", 39: "Left Teep > Right Hook > Left Teep to the Solar Plexus", 40: "Left Teep > Right Teep > Left Hook > Right Roundhouse Kick", 41: "Left Hook to the Body > Overhand Right", 42: "Jab > Overhand Right > Left Uppercut > Right Hook", 43: "Cross > Left Hook > Overhand Right", 44: "Right Uppercut > Left Hook > Overhand Right", 45: "Right Low Kick > Left Hook > Overhand Right", 46: "Jab, Cross, Left Hook, Right Low Kick", 47: "Jab, Cross, Left Hook, Right Elbow", 48: "Jab, Left Hook, Right Uppercut, Right Elbow", 49: "Cross, Left Hook, Right Hook, Left Kick", 50: "Right Low Kick, Left Hook, Right Cross", 51: "Jab, Left Hook, Right Cross, Left Knee", 52: "Left Hook, Right Hook, Left Knee, Right Hook", 53: "Left Hook, Right Elbow, Right Kick", 54: "Jab, Left Hook, Right Cross, Right Elbow", 55: "Right Low Kick, Left Hook, Right Hook, Left High Kick", 56: "Left Hook, Right Hook, Left Elbow, Right Cross", 57: "Cross, Left Hook, Left Low Kick, Right Elbow", 58: "Right Low Kick, Left Hook, Right Hook", 59: "Left Hook, Right Cross, Left Knee", 60: "Cross, Left Hook, Left High Kick", 61: "Jab, Left Hook, Right Elbow, Left Knee", 62: "Left Hook, Right Hook, Left Low Kick, Right Elbow", 63: "Cross, Left Hook, Right Elbow", 64: "Left Hook, Right Cross, Left Elbow, Right Low Kick", 65: "Right Hook, Left Hook, Left High Kick", 66: "Jab, Cross, Right Uppercut, Left Hook", 67: "Jab, Left Hook, Right Elbow, Left Kick", 68: "Cross, Right Hook, Left Knee, Right Elbow", 69: "Jab, Cross, Left Hook, Left Elbow", 70: "Left Hook, Right Hook, Left Knee, Right Cross", 71: "Jab, Cross, Left Hook, Left Low Kick", 72: "Cross, Left Hook, Left Elbow, Right Knee", 73: "Right Cross, Left Hook, Right Low Kick", 74: "Left Hook, Right Hook, Left High Kick", 75: "Jab, Left Hook, Right Elbow, Left High Kick", 76: "Cross, Left Hook, Right Elbow, Left Knee", 77: "Right Cross, Left Hook, Left Elbow, Right Low Kick", 78: "Jab, Left Hook, Right Hook, Left Elbow", 79: "Cross, Left Hook, Right Elbow, Left Low Kick", 80: "Left Hook, Right Hook, Left Knee, Right High Kick", 81: "Jab, Right Cross, Left Hook, Left Knee", 82: "Jab, Left Hook, Right Cross, Left Elbow", 83: "Right Low Kick, Left Hook, Right Cross, Left Elbow", 84: "Jab, Cross, Left Hook, Right High Kick", 85: "Jab, Right Cross, Left Hook, Left Low Kick", 86: "Jab, Left Hook, Right Hook, Left Knee", 87: "Cross, Left Hook, Right Cross, Left High Kick", 88: "Jab, Cross, Left Hook, Left High Kick", 89: "Cross, Left Hook, Right Elbow, Left High Kick", 90: "Jab, Left Hook, Right Cross, Left Kick", 91: "Left Hook, Right Cross, Left Elbow, Right High Kick" },
    'MMA': { 1: "Jab → Cross → Left Hook", 2: "Jab → Cross → Right Head Kick", 3: "Inside Leg Kick → Overhand Right", 4: "Cross → Left Hook → Right Uppercut", 5: "Jab → Rear Body Kick", 6: "Double Jab → Cross → Left Hook → Right Leg Kick", 7: "Jab → Fake Cross → Lead Head Kick", 8: "Left Hook to the Body → Left Hook to the Head", 9: "Cross → Left Hook → Spinning Back Fist", 10: "Jab → Cross → Lead Uppercut", 11: "Teep Kick → Overhand Right", 12: "Jab → Cross → Rear Knee", 13: "Slip Opponent's Jab → Overhand Right", 14: "Cross → Rear Elbow", 15: "Jab → Cross → Lead Hook → Rear Low Kick", 16: "Right Cross → Left Hook → Right Uppercut → Left Head Kick", 17: "Fake Cross → Rear Head Kick", 18: "Jab → Cross → Duck Opponent's Punch → Right Uppercut", 19: "Right Hook → Left Hook → Right Hook", 20: "Jab → Rear Uppercut → Lead Hook", 21: "Jab → Cross → Rear Teep Kick", 22: "Lead Body Hook → Overhand Right", 23: "Cross → Slip Opponent's Punch → Left Hook", 24: "Cross → Spinning Back Kick", 25: "Jab → Cross → Hook → Low Kick", 26: "Jab → Cross → Left Uppercut → Right Hook", 27: "Fake Jab → Overhand Right → Left Hook", 28: "Teep Kick → Jab → Cross", 29: "Lead Hook → Rear Low Kick → Rear Head Kick", 30: "Jab → Cross → Lead Hook → Spinning Back Elbow", 31: "Cross → Step Back → Right High Kick", 32: "Jab → Rear Knee → Left Hook", 33: "Cross → Lead Uppercut → Cross", 34: "Inside Leg Kick → Cross → Overhand Right", 35: "Cross → Left Hook → Superman Punch", 36: "Jab → Right Hook → Spinning Hook Kick", 37: "Fake Cross → Spinning Back Kick to the Body", 38: "Jab → Jab → Overhand Right → Rear Uppercut", 39: "Cross → Left Hook → Right Hook → Left Hook → Rear Head Kick", 40: "Jab → Fake Cross → Left Hook → Right Uppercut", 41: "Jab → Cross → Lead Body Hook → Rear Head Kick", 42: "Slip Opponent’s Jab → Lead Uppercut → Cross", 43: "Jab → Rear Uppercut → Lead Hook → Rear Low Kick", 44: "Cross → Lead Hook → Rear Elbow", 45: "Overhand Right → Left Hook → Right Uppercut", 46: "Jab → Cross → Rear Leg Kick → Spinning Back Fist", 47: "Cross → Left Hook → Overhand Right → Left Hook", 48: "Jab → Cross → Step Forward → Rear Head Kick", 49: "Inside Leg Kick → Cross → Lead Hook → Rear Uppercut", 50: "Jab → Cross → Lead Hook → Rear Spinning Hook Kick", 51: "Lead Body Hook → Cross → Rear Uppercut", 52: "Jab → Cross → Lead Head Kick", 53: "Teep Kick → Step Back → Cross → Left Hook", 54: "Jab → Overhand Right → Left Hook", 55: "Cross → Lead Hook → Cross → Rear Knee", 56: "Step Back → Right Uppercut → Left Hook", 57: "Jab → Cross → Fake Low Kick → Rear Head Kick", 58: "Jab → Cross → Lead Hook → Spinning Heel Kick", 59: "Cross → Duck Opponent’s Hook → Right Uppercut", 60: "Overhand Right → Lead Hook → Cross → Rear Head Kick", 61: "Jab → Cross → Lead Hook → Rear Flying Knee", 62: "Slip Opponent’s Jab → Overhand Right → Left Hook", 63: "Jab → Fake Cross → Lead Hook → Rear Spinning Elbow", 64: "Inside Leg Kick → Cross → Left Hook → Overhand Right", 65: "Jab → Cross → Body Hook → Overhand Right", 66: "Jab → Cross → Step Back → Spinning Back Kick", 67: "Rear Teep Kick → Overhand Right", 68: "Cross → Lead Hook → Rear Uppercut → Rear Head Kick", 69: "Jab → Cross → Lead Uppercut → Cross", 70: "Right Hook → Left Hook → Right Cross → Rear Head Kick", 71: "Jab → Fake Cross → Rear Uppercut", 72: "Cross → Duck → Right Hook → Left Hook", 73: "Jab → Cross → Lead Hook → Rear Spinning Back Kick", 74: "Lead Hook → Cross → Step Forward → Rear Elbow", 75: "Overhand Right → Rear Uppercut → Lead Hook", 76: "Jab → Cross → Rear Low Kick → Spinning Hook Kick", 77: "Jab → Cross → Overhand Right → Rear Knee", 78: "Jab → Fake Cross → Left Hook → Rear Spinning Heel Kick", 79: "Jab → Cross → Lead Hook → Rear Superman Punch", 80: "Jab → Rear Teep Kick → Cross → Lead Hook", 81: "Jab → Cross → Fake Low Kick → Spinning Back Kick", 82: "Lead Body Hook → Rear Uppercut → Cross", 83: "Jab → Cross → Lead Hook → Jumping Switch Knee", 84: "Jab → Cross → Duck → Right Uppercut", 85: "Cross → Lead Hook → Rear Leg Kick", 86: "Jab → Cross → Rear Spinning Hook Kick", 87: "Jab → Cross → Lead Hook → Flying Knee", 88: "Jab → Rear Uppercut → Lead Hook → Cross", 89: "Inside Leg Kick → Overhand Right → Rear Head Kick", 90: "Jab → Fake Cross → Rear Spinning Back Elbow", 91: "Cross → Left Hook → Right Hook → Rear Head Kick", 92: "Jab → Cross → Lead Hook → Rear Uppercut", 93: "Jab → Rear Teep Kick → Spinning Heel Kick", 94: "Jab → Cross → Left Hook → Spinning Back Fist", 95: "Jab → Fake Cross → Rear Spinning Hook Kick", 96: "Inside Leg Kick → Cross → Rear Spinning Back Kick", 97: "Jab → Cross → Rear Leg Kick → Spinning Heel Kick", 98: "Overhand Right → Lead Hook → Rear Uppercut → Rear Head Kick", 99: "Jab → Rear Superman Punch → Rear Spinning Hook Kick", 100: "Jab → Cross → Lead Hook → Rear Spinning Elbow" },
    'Combat Sambo': { 1: "Jab, cross, left hook, right low kick", 2: "Front kick, cross, left hook, takedown", 3: "Slip, right uppercut, left hook, knee strike", 4: "Parry, overhand right, left body hook, right elbow", 5: "Double leg takedown, ground and pound", 6: "Clinch, knee strike, hip throw", 7: "Jab, cross, duck under, rear naked choke", 8: "Low kick, cross, hook, high kick", 9: "Feint jab, overhand right, left hook, ankle pick", 10: "Sprawl, front headlock, knee strikes", 11: "Jab, cross, left hook, right low kick, takedown", 12: "Side step, right hook, left uppercut, clinch, throw", 13: "Push kick, spinning back fist, clinch, hip toss", 14: "Parry, cross, hook, leg sweep", 15: "Jab, cross, level change, double leg takedown", 16: "Inside leg kick, cross, hook, outside leg kick", 17: "Overhand right, left hook, right uppercut, takedown", 18: "Clinch, knee strike, foot sweep, ground control", 19: "Fake takedown, uppercut, hook, high kick", 20: "Jab, cross, bob and weave, body shot, takedown", 21: "Front kick, cross, hook, spinning back kick", 22: "Slip jab, counter cross, left hook, right low kick", 23: "Catch kick, sweep, ground and pound", 24: "Jab, cross, level change, single leg takedown", 25: "Clinch, dirty boxing, knee strike, throw", 26: "Low kick, jab, cross, high kick", 27: "Feint kick, overhand right, left hook, takedown", 28: "Sprawl, front headlock, gator roll", 29: "Jab, cross, duck under, back take", 30: "Push kick, spinning heel kick, clinch, throw", 31: "Parry, elbow strike, knee, hip throw", 32: "Inside leg kick, jab, cross, outside leg kick, takedown", 33: "Overhand right, left hook, right uppercut, ankle pick", 34: "Clinch, knee strike, foot sweep, arm bar", 35: "Fake jab, right uppercut, left hook, takedown", 36: "Front kick, spinning back fist, clinch, suplex", 37: "Slip, body shot, hook, high kick", 38: "Jab, cross, level change, ankle pick", 39: "Low kick, overhand right, left hook, clinch, throw", 40: "Catch kick, counter punch, takedown", 41: "Jab, cross, bob and weave, liver shot, clinch", 42: "Push kick, cross, hook, leg kick", 43: "Feint takedown, uppercut, hook, knee strike", 44: "Parry, cross counter, hook, takedown", 45: "Clinch, knee strike, outside trip", 46: "Inside leg kick, jab, cross, high kick", 47: "Overhand right, left hook, level change, double leg", 48: "Sprawl, front headlock, snap down", 49: "Jab, cross, slip, body shot, clinch, throw", 50: "Low kick, jab, cross, spinning back kick", 51: "Feint jab, right hook, left uppercut, takedown", 52: "Catch punch, counter elbow, knee, throw", 53: "Push kick, spinning back fist, takedown", 54: "Slip, right uppercut, left hook, right low kick", 55: "Jab, cross, level change, single leg, lift, slam", 56: "Clinch, dirty boxing, knee strike, foot sweep", 57: "Inside leg kick, cross, hook, outside leg kick, clinch", 58: "Overhand right, left hook, right uppercut, double leg", 59: "Front kick, jab, cross, high kick", 60: "Feint kick, right hook, left uppercut, takedown", 61: "Sprawl, front headlock, arm drag to back take", 62: "Jab, cross, duck under, suplex", 63: "Low kick, overhand right, left hook, clinch, knee", 64: "Parry, counter cross, hook, spinning back kick", 65: "Clinch, knee strike, hip throw, ground control", 66: "Fake jab, right uppercut, left hook, leg kick", 67: "Push kick, cross, hook, takedown", 68: "Slip, body shot, hook, high kick, clinch", 69: "Jab, cross, level change, ankle pick, ground and pound", 70: "Inside leg kick, jab, cross, outside leg kick, spinning back fist", 71: "Overhand right, left hook, right uppercut, clinch, throw", 72: "Catch kick, sweep, mount, submission attempt", 73: "Front kick, spinning heel kick, takedown", 74: "Feint takedown, uppercut, hook, high kick", 75: "Parry, elbow strike, knee, outside trip", 76: "Clinch, dirty boxing, knee strike, inside trip", 77: "Low kick, jab, cross, spinning back kick, clinch", 78: "Slip jab, counter cross, left hook, right low kick, takedown", 79: "Sprawl, front headlock, go behind", 80: "Jab, cross, bob and weave, liver shot, takedown", 81: "Push kick, overhand right, left hook, clinch, throw", 82: "Feint jab, right hook, left uppercut, leg kick", 83: "Catch punch, counter knee, clinch, throw", 84: "Inside leg kick, cross, hook, high kick, takedown", 85: "Overhand right, left hook, level change, single leg", 86: "Front kick, jab, cross, spinning back fist", 87: "Slip, right uppercut, left hook, takedown", 88: "Jab, cross, duck under, back take, rear naked choke", 89: "Low kick, overhand right, left hook, right elbow", 90: "Parry, counter hook, cross, knee strike", 91: "Clinch, knee strike, foot sweep, arm lock", 92: "Fake takedown, uppercut, hook, spinning back kick", 93: "Push kick, cross, hook, outside leg kick, clinch", 94: "Slip, body shot, hook, high kick, takedown", 95: "Jab, cross, level change, double leg, ground and pound", 96: "Inside leg kick, jab, cross, outside leg kick, spinning heel kick", 97: "Overhand right, left hook, right uppercut, clinch, suplex", 98: "Catch kick, counter punch, takedown, submission attempt", 99: "Front kick, spinning back fist, clinch, knee strike, throw", 100: "Feint jab, right hook, left uppercut, leg kick, takedown" },
    'BJJ': { 1: "Double leg takedown > Mount > Ground and pound", 2: "Single leg takedown > Side control > Kimura", 3: "Clinch > Hip throw > Armbar", 4: "Sprawl > Front headlock > Guillotine choke", 5: "Pull guard > Sweep > Rear naked choke", 6: "Ankle pick > Knee on belly > Americana", 7: "Arm drag > Back take > Rear naked choke", 8: "Duck under > Back take > Bow and arrow choke", 9: "Snap down > Front headlock > D'arce choke", 10: "Osoto gari > Side control > North-south choke", 11: "Collar tie > Knee tap > Mount > Ezekiel choke", 12: "Arm wrap > Trip > Kesa gatame > Arm triangle", 13: "Underhook > Lateral drop > Side control > Kimura", 14: "Overhook > Uchi mata > Mount > Cross collar choke", 15: "Wrist control > Foot sweep > Knee on belly > Straight armbar", 16: "Two-on-one > Arm drag > Back take > Rear naked choke", 17: "Collar grab defense > Arm drag > Single leg > Ground and pound", 18: "Haymaker defense > Clinch > Hip throw > Mount", 19: "Bear hug defense > Lateral drop > Side control > Americana", 20: "Headlock defense > Switch > Back take > Rear naked choke", 21: "Guard pull > Triangle choke > Armbar", 22: "Double leg > Half guard pass > Mount > Arm triangle", 23: "Single leg > Knee cut pass > Side control > Kimura", 24: "Clinch > Foot sweep > Mount > Cross collar choke", 25: "Sprawl > Spin behind > Back take > Bow and arrow choke", 26: "Arm drag > Single leg > Knee on belly > Straight armbar", 27: "Duck under > Waist lock > Suplex > Rear naked choke", 28: "Snap down > Front headlock > Anaconda choke", 29: "Osoto gari > Scarf hold > Americana", 30: "Collar tie > Inside trip > Mount > Ezekiel choke", 31: "Underhook > Outside trip > Side control > North-south choke", 32: "Overhook > Harai goshi > Mount > Arm triangle", 33: "Wrist control > Ankle pick > Knee on belly > Kimura", 34: "Two-on-one > Russian tie > Single leg > Ground and pound", 35: "Collar grab defense > Osoto gari > Side control > Americana", 36: "Haymaker defense > Slip > Double leg > Mount", 37: "Bear hug defense > Hip toss > Side control > Kimura", 38: "Headlock defense > Roll > Mount > Cross collar choke", 39: "Guard pull > Omoplata > Straight armlock", 40: "Double leg > Toreando pass > Side control > Arm triangle", 41: "Single leg > X-pass > Mount > Ezekiel choke", 42: "Clinch > Uchi mata > Side control > North-south choke", 43: "Sprawl > Go behind > Back take > Rear naked choke", 44: "Arm drag > Kouchi gari > Knee on belly > Straight armbar", 45: "Duck under > Body lock > Suplex > Arm triangle", 46: "Snap down > Front headlock > Japanese necktie", 47: "Osoto gari > Kesa gatame > Arm triangle", 48: "Collar tie > Ankle pick > Side control > Kimura", 49: "Underhook > Sumi gaeshi > Mount > Cross collar choke", 50: "Overhook > Ouchi gari > Side control > Americana", 51: "Wrist control > De ashi barai > Knee on belly > Straight armbar", 52: "Two-on-one > Fireman's carry > Side control > North-south choke", 53: "Collar grab defense > Seoi nage > Mount > Ezekiel choke", 54: "Haymaker defense > Bob and weave > Double leg > Ground and pound", 55: "Bear hug defense > Ura nage > Side control > Kimura", 56: "Headlock defense > Sit-through > Back take > Bow and arrow choke", 57: "Guard pull > Scissor sweep > Mount > Cross collar choke", 58: "Double leg > Stack pass > Mount > Arm triangle", 59: "Single leg > Smash pass > Side control > Americana", 60: "Clinch > Kosoto gake > Side control > Kimura", 61: "Sprawl > Limp arm > Front headlock > Anaconda choke", 62: "Arm drag > Tai otoshi > Mount > Ezekiel choke", 63: "Duck under > Single leg > Knee on belly > Straight armbar", 64: "Snap down > Spiral ride > Back take > Rear naked choke", 65: "Osoto gari > Modified scarf hold > Arm triangle", 66: "Collar tie > Double leg > Half guard pass > Mount", 67: "Underhook > Uchi mata > Side control > Kimura", 68: "Overhook > Tani otoshi > Mount > Cross collar choke", 69: "Wrist control > Tomoe nage > Armbar", 70: "Two-on-one > Knee tap > Side control > North-south choke", 71: "Collar grab defense > Hip throw > Mount > Ezekiel choke", 72: "Haymaker defense > Level change > Double leg > Ground and pound", 73: "Bear hug defense > Sumi gaeshi > Mount > Arm triangle", 74: "Headlock defense > Arm trap > Back take > Rear naked choke", 75: "Guard pull > Flower sweep > Mount > Cross collar choke", 76: "Double leg > Over-under pass > Side control > Kimura", 77: "Single leg > Leg drag pass > Mount > Ezekiel choke", 78: "Clinch > Ouchi gari > Side control > Americana", 79: "Sprawl > Switch > Back take > Bow and arrow choke", 80: "Arm drag > Ankle pick > Knee on belly > Straight armbar", 81: "Duck under > High crotch > Knee on belly > Kimura", 82: "Snap down > Cow catcher > D'arce choke", 83: "Osoto gari > Knee on stomach > Straight armlock", 84: "Collar tie > Single leg > Half guard pass > Mount", 85: "Underhook > Kouchi gari > Side control > North-south choke", 86: "Overhook > Sasae tsurikomi ashi > Mount > Arm triangle", 87: "Wrist control > Sumi gaeshi > Armbar", 88: "Two-on-one > Inside trip > Side control > Americana", 89: "Collar grab defense > Double leg > Toreando pass > Mount", 90: "Haymaker defense > Duck under > Back take > Rear naked choke", 91: "Bear hug defense > Foot sweep > Side control > Kimura", 92: "Headlock defense > Hip bump > Mount > Cross collar choke", 93: "Guard pull > Pendulum sweep > Mount > Ezekiel choke", 94: "Double leg > Pressure pass > Side control > Arm triangle", 95: "Single leg > Bull fighter pass > Mount > Cross collar choke", 96: "Clinch > Harai goshi > Side control > Americana", 97: "Sprawl > Crossface > Front headlock > Anaconda choke", 98: "Arm drag > Uchi mata > Mount > Arm triangle", 99: "Duck under > Double leg > Half guard pass > Mount", 100: "Snap down > Guillotine > Mount > Ezekiel choke", 101: "Osoto gari > Side control > Paper cutter choke", 102: "Collar tie > Foot sweep > Knee on belly > Straight armbar", 103: "Underhook > Body lock takedown > Side control > Kimura", 104: "Overhook > Kosoto gari > Mount > Cross collar choke", 105: "Wrist control > Seoi nage > Armbar", 106: "Two-on-one > Outside trip > Side control > North-south choke", 107: "Collar grab defense > Arm drag > Back take > Rear naked choke", 108: "Haymaker defense > Shoot > Single leg > Ground and pound", 109: "Bear hug defense > Uchi mata > Mount > Ezekiel choke", 110: "Headlock defense > Lateral drop > Side control > Americana", 111: "Guard pull > Hip bump sweep > Mount > Arm triangle", 112: "Double leg > Knee slice pass > Side control > Kimura", 113: "Single leg > Backstep pass > Mount > Cross collar choke", 114: "Clinch > Foot sweep > Side control > North-south choke", 115: "Sprawl > Snap down > Front headlock > D'arce choke", 116: "Arm drag > Ouchi gari > Knee on belly > Straight armbar", 117: "Duck under > Ankle pick > Side control > Americana", 118: "Snap down > Arm-in guillotine > Mount", 119: "Osoto gari > Kesa gatame > Chest compression", 120: "Collar tie > Lateral drop > Side control > Kimura", 121: "Underhook > Sumi gaeshi > Armbar", 122: "Overhook > Tai otoshi > Mount > Ezekiel choke", 123: "Wrist control > Kouchi gari > Knee on belly > Straight armbar", 124: "Two-on-one > Hip throw > Side control > Arm triangle", 125: "Collar grab defense > Duck under > Back take > Bow and arrow choke", 126: "Haymaker defense > Clinch > Osoto gari > Mount", 127: "Bear hug defense > Suplex > Side control > Kimura", 128: "Headlock defense > Sit-out > Back take > Rear naked choke", 129: "Guard pull > Kimura sweep > Side control > Americana", 130: "Double leg > Double under pass > Mount > Cross collar choke", 131: "Single leg > Tripod pass > Side control > North-south choke", 132: "Clinch > Inside trip > Mount > Arm triangle", 133: "Sprawl > Spiral ride > Back take > Rear naked choke", 134: "Arm drag > Fireman's carry > Side control > Kimura", 135: "Duck under > Uchi mata > Mount > Ezekiel choke", 136: "Snap down > Clock choke > Mount", 137: "Osoto gari > Side control > Straight armlock", 138: "Collar tie > Single leg > Knee cut pass > Mount", 139: "Underhook > Harai goshi > Side control > Americana", 140: "Overhook > De ashi barai > Mount > Cross collar choke", 141: "Wrist control > Ankle pick > Side control > North-south choke", 142: "Two-on-one > Kosoto gake > Mount > Arm triangle", 143: "Collar grab defense > Snap down > Front headlock > Anaconda choke", 144: "Haymaker defense > Slip > Clinch > Hip throw > Mount", 145: "Bear hug defense > Back trip > Side control > Kimura", 146: "Headlock defense > Forward roll > Mount > Ezekiel choke", 147: "Guard pull > Tripod sweep > Mount > Cross collar choke", 148: "Double leg > Leg weave pass > Side control > Americana", 149: "Single leg > Over-under pass > Mount > Arm triangle", 150: "Clinch > Foot sweep > Knee on belly > Straight armbar" },
    'Wrestling': {
    // Wrestling is POSITIONAL first — every sequence starts from a clinch, tie, or position,
    // then describes what you DO from there. These are rep chains, not linear punch lists.
    1: "Collar tie > Snap down > Front headlock position",
    2: "Underhook > Elbow strike > Snap down > Front headlock",
    3: "Arm drag > Double leg takedown",
    4: "Collar tie > Elbow strike > Single leg takedown",
    5: "Underhook > Body lock > Hip throw",
    6: "Collar tie > Knee strike > High crotch takedown",
    7: "Arm wrap > Level change > Double leg takedown",
    8: "Overhook > Elbow strike > Ankle pick",
    9: "Wrist control > Arm drag > Single leg takedown",
    10: "Collar tie > Underhook > Sit-out",
    11: "Underhook > Underhook > Body lock > Mat return",
    12: "Arm drag > Level change > Ankle pick",
    13: "Collar tie > Snap down > Front headlock > Knee to body",
    14: "Overhook > Elbow strike > Go-behind takedown",
    15: "Underhook > Head lock > Throw",
    16: "Wrist control > High crotch > Single leg takedown",
    17: "Arm wrap > Level change > Double leg takedown > Ground position",
    18: "Collar tie > Underhook > Trip takedown",
    19: "Arm drag > Back take > RNC finish",
    20: "Overhook > Stand-up > Collar tie reset",
    21: "Underhook > Elbow strike > Snap down > Ground position",
    22: "Wrist control > Duck under > Back take",
    23: "Collar tie > Knee strike > Ankle pick > Mat return",
    24: "Arm drag > High crotch > Double leg takedown",
    25: "Overhook > Elbow strike > Go-behind > Back take",
    26: "Underhook > Sit-out > Leg lace",
    27: "Collar tie > Snap down > Arm triangle setup",
    28: "Wrist control > Level change > Double leg > Pin position",
    29: "Arm wrap > Hip throw > Side control",
    30: "Overhook > Elbow strike > Single leg takedown",
    31: "Underhook > Body lock > Suplex",
    32: "Collar tie > Elbow strike > Ankle pick > Leg lace",
    33: "Arm drag > High crotch > Sit-out",
    34: "Wrist control > Snap down > Front headlock > Transition",
    35: "Overhook > Stand-up > Collar tie reset",
    36: "Underhook > Elbow strike > Go-behind > Back take",
    37: "Collar tie > Knee strike > Double leg takedown",
    38: "Arm wrap > Level change > Single leg takedown",
    39: "Wrist control > Head lock > Throw",
    40: "Collar tie > Underhook > Sit-out > Leg lace",
    'Judo': { 1: "O Goshi (Major Hip Throw)", 2: "Seoi Nage (Shoulder Throw)", 3: "Uchi Mata (Inner Thigh Throw)", 4: "Tai Otoshi (Body Drop)", 5: "Koshi Guruma (Hip Wheel)", 6: "Harai Goshi (Hip Sweep)", 7: "Sumi Gaeshi (Corner Reversal)", 8: "Ippon Seoi Nage (One-Arm Shoulder Throw)", 9: "Osoto Gari (Large Outer Reap)", 10: "Osoto Otoshi (Large Outer Drop)", 11: "Ashi Guruma (Foot Wheel)", 12: "De Ashi Barai (Advanced Foot Sweep)", 13: "Okuri Ashi Barai (Sliding Foot Sweep)", 14: "Sasae Tsurikomi Ashi (Supporting Foot Lift Sweep)", 15: "Hiza Guruma (Knee Wheel)", 16: "Uchi Ashi Barai (Inner Foot Sweep)", 17: "Kouchi Gari (Small Inner Reap)", 18: "Kouchi Barai (Small Inner Sweep)", 19: "Ashi Tori Zemi (Foot Catching)", 20: "Tsurikomi Ashi (Lifting Foot Sweep)", 21: "Tomoe Nage (Circle Throw)", 22: "Ura Nage (Back Throw)", 23: "Yoko Gake (Side Hook)", 24: "Yoko Otoshi (Side Drop)", 25: "Hane Goshi (Spring Hip Throw)", 26: "Kani Basami (Crab Leg Sweep)", 27: "Tani Otoshi (Valley Drop)", 28: "Ashi Garami (Leg Trap)", 29: "Uchi Mata Sukashi (Inner Thigh Reversal)", 30: "Kesa Gatame (Scarf Hold)", 31: "Yoko Shiho Gatame (Side Four Corner Hold)", 32: "Tate Shiho Gatame (Top Four Corner Hold)", 33: "Kami Shiho Gatame (Upper Four Corner Hold)", 34: "Juji Gatame (Armbar)", 35: "Ude Garami (Entangled Arm)", 36: "Shime Waza (Strangulation Techniques)", 37: "Kata Gatame (Shoulder Hold)", 38: "Ashi Garami (Leg Entanglement)", 39: "Hiza Gatame (Knee Hold)", 40: "Atemi Waza (Striking Techniques)", 41: "Kansetsu Waza (Joint Locks)", 42: "Ashi Uke (Foot Block)", 43: "Waki Gatame (Armpit Arm Lock)", 44: "Atemi (Striking with the Open Hand)", 45: "Ude Hishigi Juji Gatame (Armbar in Cross Position)", 46: "Ashi Hishigi (Foot Lock)", 47: "Ude Hishigi Ura (Reverse Arm Lock)", 48: "Kote Hishigi (Wrist Lock)", 49: "Kansetsu Waza Kata Gatame (Shoulder Lock)" },
    'Taekwondo': { 1: "Jab > Cross", 2: "Jab > Cross > Front kick", 3: "Front kick > Roundhouse kick", 4: "Jab > Front kick", 5: "Jab > Cross > Roundhouse kick", 6: "Jab > Front kick > Roundhouse kick", 7: "Roundhouse kick > Side kick", 8: "Jab > Cross > Front kick > Roundhouse kick", 9: "Front kick > Side kick > Cross", 10: "Jab > Roundhouse kick > Roundhouse kick", 11: "Cross > Side kick > Roundhouse kick", 12: "Back kick > Cross", 13: "Jab > Cross > Back kick", 14: "Front kick > Back kick > Side kick", 15: "Jab > Roundhouse kick > Back kick", 16: "Side kick > Roundhouse kick > Cross", 17: "Hook kick > Cross", 18: "Jab > Cross > Hook kick", 19: "Front kick > Hook kick > Roundhouse kick", 20: "Jab > Cross > Front kick > Back kick", 21: "Axe kick > Roundhouse kick", 22: "Jab > Axe kick > Cross", 23: "Crescent kick > Roundhouse kick", 24: "Front kick > Crescent kick > Side kick", 25: "Spinning back kick > Cross", 26: "Jab > Cross > Spinning back kick", 27: "Front kick > Spinning back kick > Roundhouse kick", 28: "Push kick > Roundhouse kick > Cross", 29: "Jab > Push kick > Roundhouse kick", 30: "Knee > Cross > Roundhouse kick",
        31: "Jab > Cross > Side kick > Roundhouse kick",
    32: "Front kick > Roundhouse kick > Side kick > Cross",
    33: "Jab > Cross > Spinning back kick > Side kick",
    34: "Roundhouse kick > Back kick > Hook kick > Cross",
    35: "Jab > Cross > Front kick > Roundhouse kick > Side kick",
    36: "Spinning back kick > Jab > Cross > Back kick",
    37: "Jab > Crescent kick > Reset > Roundhouse kick",
    38: "Front kick > Side kick > Roundhouse kick > Back kick",
    39: "Front kick > Side kick > Back kick > Roundhouse kick",
    40: "Jab > Cross > Hook kick > Roundhouse kick > Back kick",
    41: "Front kick > Roundhouse kick > Side kick > Back kick > Reset",
    42: "Front kick > Axe kick > Roundhouse kick > Side kick",
    43: "Jab > Knee > Roundhouse kick > Side kick > Cross",
    44: "Push kick > Jab > Cross > Roundhouse kick > Side kick",
    45: "Front kick > Side kick > Roundhouse kick > Back kick > Cross",
    46: "Jab > Cross > Roundhouse kick > Back kick > Hook kick > Reset",
    47: "Front kick > Side kick > Back kick > Roundhouse kick > Hook kick",
    48: "Jab > Cross > Back kick > Roundhouse kick > Side kick",
    49: "Spinning back kick > Reset > Roundhouse kick > Side kick > Back kick",
    50: "Jab > Cross > Knee > Roundhouse kick > Reset"  },
    'Karate': { 1: "Jab > Cross", 2: "Jab > Cross > Reverse punch", 3: "Reverse punch > Front kick", 4: "Jab > Reverse punch", 5: "Jab > Cross > Front kick", 6: "Jab > Reverse punch > Front kick", 7: "Front kick > Side kick", 8: "Jab > Cross > Reverse punch > Front kick", 9: "Reverse punch > Side kick > Cross", 10: "Jab > Front kick > Front kick", 11: "Cross > Side kick > Front kick", 12: "Roundhouse kick > Cross", 13: "Jab > Cross > Roundhouse kick", 14: "Reverse punch > Roundhouse kick > Side kick", 15: "Jab > Front kick > Roundhouse kick", 16: "Side kick > Front kick > Cross", 17: "Backfist > Cross", 18: "Jab > Cross > Backfist", 19: "Reverse punch > Backfist > Front kick", 20: "Jab > Cross > Reverse punch > Roundhouse kick", 21: "Ridge hand > Front kick", 22: "Jab > Ridge hand > Cross", 23: "Knife hand > Front kick", 24: "Reverse punch > Knife hand > Side kick", 25: "Elbow > Cross", 26: "Jab > Cross > Elbow", 27: "Reverse punch > Elbow > Front kick", 28: "Knee > Front kick > Cross", 29: "Jab > Knee > Front kick", 30: "Push kick > Cross > Front kick",
        31: "Jab > Cross > Side kick > Back kick",
    32: "Jab > Cross > Elbow > Front kick",
    33: "Jab > Cross > Elbow > Ridge hand",
    34: "Jab > Cross > Front kick > Roundhouse kick",
    35: "Jab > Cross > Roundhouse kick > Side kick > Back kick",
    36: "Jab > Cross > Backfist > Ridge hand",
    37: "Jab > Cross > Knife hand > Elbow",
    38: "Jab > Cross > Elbow > Knee > Front kick",
    39: "Jab > Cross > Side kick > Knee > Front kick",
    40: "Jab > Cross > Front kick > Elbow > Ridge hand",
    41: "Jab > Cross > Roundhouse kick > Back kick > Backfist",
    42: "Jab > Cross > Ridge hand > Knife hand",
    43: "Jab > Cross > Push kick > Roundhouse kick > Back kick",
    44: "Jab > Cross > Knee > Elbow > Front kick",
    45: "Jab > Cross > Side kick > Elbow > Backfist",
    46: "Jab > Cross > Roundhouse kick > Back kick > Side kick",
    47: "Jab > Cross > Roundhouse kick > Back kick > Backfist > Cross",
    48: "Jab > Cross > Elbow > Ridge hand > Knife hand",
    49: "Jab > Cross > Backfist > Ridge hand > Knife hand > Elbow",
    50: "Jab > Cross > Push kick > Side kick > Roundhouse kick"  },};

// ---------- Difficulty tiers (per style: which level numbers are beginner/intermediate/advanced) ----------
const DIFFICULTY_TIERS = {
  'Boxing': { beginner: 12, intermediate: 28, advanced: 40 },
  'Kickboxing': { beginner: 32, intermediate: 64, advanced: 96 },
  'Muay Thai': { beginner: 30, intermediate: 60, advanced: 91 },
  'MMA': { beginner: 33, intermediate: 66, advanced: 100 },
  'Combat Sambo': { beginner: 33, intermediate: 66, advanced: 100 },
  'BJJ': { beginner: 50, intermediate: 100, advanced: 150 },
  'Wrestling': { beginner: 33, intermediate: 66, advanced: 99 },
  'Judo': { beginner: 16, intermediate: 32, advanced: 49 },
  'Taekwondo': { beginner: 16, intermediate: 32, advanced: 50 },
  'Karate': { beginner: 16, intermediate: 32, advanced: 50 },
};
const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced'];
const DIFFICULTY_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const difficultyOf = (style, level) => {
  const t = DIFFICULTY_TIERS[style] || { beginner: 33, intermediate: 66, advanced: 100 };
  if (level <= t.beginner) return 'beginner';
  if (level <= t.intermediate) return 'intermediate';
  return 'advanced';
};

// ---------- Technique library (Learn Mode + form cues) ----------
const TECHNIQUES = {
  'Boxing': {
    'jab': { how: 'Snap your lead hand straight from your chin, rotate your fist palm-down at extension, and return it immediately to guard.', cue: 'Snap it, don\'t push it. Return fast.' },
    'cross': { how: 'Pivot your back foot, rotate hips and shoulders, and drive the rear hand straight down the line. Recover to guard.', cue: 'Pivot the back foot. Full hip turn.' },
    'hook': { how: 'Pivot the lead foot, turn the hips, and swing the lead arm in a horizontal arc with a 90-degree elbow. Keep the wrist straight.', cue: 'Turn the hip. Elbow at 90.' },
    'uppercut': { how: 'Dip slightly, bend the knees, then drive up through the hips, palm facing you, landing under the chin.', cue: 'Dip and drive up. Hips first.' },
    'overhand': { how: 'Loop the rear hand up and over the opponent\'s guard with a wide arc, dropping your weight into the punch.', cue: 'Loop it over. Drop the weight.' },
    'slip': { how: 'Move your head slightly off the center line by bending at the knees and rotating the shoulders — never by leaning back.', cue: 'Small movement. Bend the knees.' },
    'roll': { how: 'Bend the knees and trace a U-shape with your head under the incoming shot, keeping your eyes on the opponent.', cue: 'Tuck the chin, trace the U.' },
    'pull counter': { how: 'Pull your head and torso straight back off the line of the punch, then fire a counter cross as they retract.', cue: 'Pull straight back, fire the counter.' },
    'shoulder roll': { how: 'Raise the lead shoulder to cover your chin and turn your torso slightly, letting the punch slide off your shoulder.', cue: 'Shoulder up, turn the torso.' },
    'pivot': { how: 'Pivot on the lead foot, stepping the rear foot around to change your angle while keeping your guard up.', cue: 'Step the rear foot around.' },
    'footwork': { how: 'Move in small steps — push off the back foot to advance, push off the front to retreat. Never cross your feet.', cue: 'Small steps. Don\'t cross the feet.' },
    'duck': { how: 'Drop your level by bending both knees, keeping your back straight and eyes up, slipping under the punch.', cue: 'Bend both knees. Back straight.' },
    'feint': { how: 'Throw a short, partial motion that sells a punch without committing, to draw a reaction you can counter.', cue: 'Short and sharp. Sell it.' },
    'body shot': { how: 'Drop your level and fire into the ribs or liver, keeping your guard high to protect against the counter.', cue: 'Drop level, keep the guard up.' },
  },
  'Kickboxing': {
    'jab': { how: 'Snap the lead hand straight out from the chin with a small step, rotating the fist at the end. Return to guard.', cue: 'Snap and return.' },
    'cross': { how: 'Pivot the rear foot and drive the rear hand straight through, rotating the hips for power.', cue: 'Hip turn, full extension.' },
    'hook': { how: 'Pivot the lead foot and swing the lead arm horizontally with a bent elbow, turning through the hips.', cue: 'Turn through the hips.' },
    'low kick': { how: 'Step off at an angle and swing the shin into the opponent\'s thigh or calf, pivoting on the standing foot.', cue: 'Shin to the leg. Pivot hard.' },
    'body kick': { how: 'Pivot the standing foot, drive the hip forward, and land the shin into the ribs. Chamber the leg first.', cue: 'Chamber, then drive the hip.' },
    'head kick': { how: 'Swing the leg high with a whipping motion, pivoting fully on the standing foot and reaching with the hip.', cue: 'Whip it high. Full pivot.' },
    'roundhouse': { how: 'Pivot the standing leg, raise the knee, then rotate the hips to snap the shin through the target.', cue: 'Knee up, hips through.' },
    'uppercut': { how: 'Bend the knees, then drive up through the hips with the palm facing you, landing under the chin.', cue: 'Dip and drive.' },
    'elbow': { how: 'Tighten the arm and slice the elbow in a horizontal or downward arc, turning the hips for power.', cue: 'Slice it tight.' },
    'knee': { how: 'Drive the knee straight up the middle, grabbing the neck or clinching to control distance.', cue: 'Drive the knee up.' },
    'teep': { how: 'Push the ball of your foot into the opponent\'s midsection with a slight hip thrust, controlling range.', cue: 'Push through the hip.' },
    'spinning backfist': { how: 'Pivot 180 degrees on the lead foot and whip the rear arm around, striking with the back of the fist.', cue: 'Spin, then whip.' },
  },
  'Muay Thai': {
    'jab': { how: 'Snap the lead hand out from the guard with a half-step, then bring it straight back to your chin.', cue: 'Snap out, back to the chin.' },
    'cross': { how: 'Pivot the rear foot and drive the rear hand through the target with full hip rotation.', cue: 'Pivot and drive.' },
    'roundhouse': { how: 'Swing the leg in a horizontal arc, pivoting on the standing foot and landing with the shin.', cue: 'Pivot, shin through.' },
    'teep': { how: 'Extend the lead or rear leg forward, pushing with the ball of the foot to control distance.', cue: 'Push with the ball of the foot.' },
    'low kick': { how: 'Chop the shin into the opponent\'s leg just above the knee, pivoting the standing foot.', cue: 'Chop above the knee.' },
    'knee': { how: 'Grab the clinch and drive the knee up the middle into the body or chin.', cue: 'Pull and drive.' },
    'elbow': { how: 'Slice the elbow in tight arcs — horizontal, diagonal, or upward — turning the hips.', cue: 'Tight arcs, hip turn.' },
    'clinch': { how: 'Cup the back of the opponent\'s head with both hands, control the posture, and work knees.', cue: 'Control the head, stay tall.' },
    'plum clinch': { how: 'Lock both hands behind the opponent\'s head, pull the head down, and fire knees up the middle.', cue: 'Lock, pull, knee.' },
    'lead uppercut': { how: 'Drop the weight and drive the lead hand up under the chin, palm facing you.', cue: 'Drop and drive up.' },
    'superman punch': { how: 'Fake a front kick, then launch forward off the back leg with a straight rear-hand punch.', cue: 'Fake the kick, launch the punch.' },
    'switch kick': { how: 'Quickly switch stance to bring the rear leg to the front, then immediately fire a roundhouse from the new lead leg.', cue: 'Switch, then fire.' },
  },
  'MMA': {
    'jab': { how: 'Snap the lead hand from a bladed stance to measure range and set up everything else.', cue: 'Snap it out, bring it back.' },
    'cross': { how: 'Pivot and drive the rear hand straight through, loading the hips behind it.', cue: 'Pivot and drive.' },
    'head kick': { how: 'Swing the lead or rear leg high, pivoting the standing foot and reaching with the hip.', cue: 'Reach with the hip.' },
    'body kick': { how: 'Drive the shin into the ribs with a hip turn, keeping your hands up against the counter.', cue: 'Hip turn, hands up.' },
    'takedown': { how: 'Drop your level, close the distance, and drive through the hips to bring the fight to the ground.', cue: 'Drop level, drive the hips.' },
    'double leg': { how: 'Shoot in by stepping deep, wrapping both arms around the legs, and driving forward while lifting.', cue: 'Step deep, drive forward.' },
    'single leg': { how: 'Grab one leg, pinch it tight to your chest, and chain to a finish while keeping your head inside.', cue: 'Pinch it tight, head inside.' },
    'rear naked choke': { how: 'From the back, slide your arm under the chin and squeeze the biceps together, closing the grip.', cue: 'Arm under the chin, squeeze.' },
    'guillotine': { how: 'Wrap the arm around the neck from the front, close your hands, and pull up while cutting an angle.', cue: 'Wrap, close, angle.' },
    'kimura': { how: 'Grab the wrist, thread the other arm under the elbow, and crank the shoulder with your body weight.', cue: 'Thread, crank the shoulder.' },
    'teep': { how: 'Push the opponent back with the ball of the foot to create space or set up the takedown.', cue: 'Push, create space.' },
    'clinch': { how: 'Control the neck or overhooks and work knees and short strikes while breaking their posture.', cue: 'Control, break posture.' },
  },
  'Combat Sambo': {
    'jab': { how: 'Snap the lead hand from a balanced stance to set up entries.', cue: 'Snap and return.' },
    'cross': { how: 'Pivot the rear foot and drive the rear hand through, keeping your chin tucked.', cue: 'Pivot, chin tucked.' },
    'knee': { how: 'Drive the knee up the middle in the clinch, using your grip to pull them into it.', cue: 'Pull and drive.' },
    'double leg': { how: 'Shoot deep, drive through the hips, and lift while stepping to finish the takedown.', cue: 'Shoot deep, drive.' },
    'hip throw': { how: 'Step in, turn your hips underneath, and throw over your hip with a strong grip.', cue: 'Hips under, throw.' },
    'foot sweep': { how: 'Sweep the opponent\'s foot as you pull their upper body, breaking their balance.', cue: 'Sweep as you pull.' },
    'rear naked choke': { how: 'From the back, slide the arm under the chin and squeeze the grip together.', cue: 'Under the chin, squeeze.' },
    'armbar': { how: 'Isolate the arm, control the wrist, and extend the elbow across your body.', cue: 'Control the wrist, extend.' },
    'ground and pound': { how: 'From mount or side control, post your weight and fire short, controlled strikes.', cue: 'Post, short strikes.' },
    'clinch': { how: 'Use collar and sleeve grips to control posture and set up throws.', cue: 'Control the grips.' },
    'guillotine': { how: 'Wrap the neck from the front and pull up while cutting an angle.', cue: 'Wrap, pull up.' },
    'spinning back kick': { how: 'Pivot 180 degrees and drive the heel straight back into the body.', cue: 'Pivot, drive the heel.' },
  },
  'BJJ': {
    "arm in guillotine": { how: "Wrap the neck with the arm trapped inside and squeeze.", cue: "arm in guillotine" },
    "arm trap": { how: "Pin the arm against the body to limit defense.", cue: "arm trap" },
    "back trip": { how: "Trip the opponent backward while taking the back.", cue: "back trip" },
    "backstep pass": { how: "Step the leg over the guard and take side control.", cue: "backstep pass" },
    "bear hug defense": { how: "Base out, sit the hips and break the grip.", cue: "bear hug defense" },
    "body lock takedown": { how: "Lock both arms around the waist and drive to the mat.", cue: "body lock takedown" },
    "bow and arrow choke": { how: "Pull the collar across and drive the leg into the back.", cue: "bow and arrow choke" },
    "bull fighter pass": { how: "Push the legs to one side and run around to side control.", cue: "bull fighter pass" },
    "chest compression": { how: "Crush the ribs with the chest from top position.", cue: "chest compression" },
    "clock choke": { how: "Pull the collar down over the head from the back.", cue: "clock choke" },
    "collar grab defense": { how: "Strip the collar grip before it locks.", cue: "collar grab defense" },
    "cow catcher": { how: "Cross-face and drive the near arm into a choke.", cue: "cow catcher" },
    "cross collar choke": { how: "Grip both collars and twist the wrists to choke.", cue: "cross collar choke" },
    "de ashi barai": { how: "Sweep the advancing foot with a forward push.", cue: "de ashi barai" },
    "double under pass": { how: "Drive both legs down and pass to side control.", cue: "double under pass" },
    "ezekiel choke": { how: "Thread the arm behind the neck and grip the sleeve.", cue: "ezekiel choke" },
    "flower sweep": { how: "Grip the collar and pants, kick and roll the opponent over.", cue: "flower sweep" },
    "foot sweep": { how: "Sweep the opponent's foot while breaking their balance.", cue: "foot sweep" },
    "forward roll": { how: "Roll forward to escape and reset to standing.", cue: "forward roll" },
    "half guard pass": { how: "Smash the trapped leg flat and slide to side control.", cue: "half guard pass" },
    "harai goshi": { how: "Sweep the outer leg while lifting with the hip.", cue: "harai goshi" },
    "haymaker defense": { how: "Cover up, clinch and take the fight down.", cue: "haymaker defense" },
    "headlock defense": { how: "Post on the hip, sit out and take the back.", cue: "headlock defense" },
    "japanese necktie": { how: "Crank the neck across and fold the opponent down.", cue: "japanese necktie" },
    "kesa gatame": { how: "Hold the head and arm while driving the chest down.", cue: "kesa gatame" },
    "kimura sweep": { how: "Grip the kimura and roll the opponent over.", cue: "kimura sweep" },
    "knee on stomach": { how: "Drive the knee into the belly for control.", cue: "knee on stomach" },
    "knee slice pass": { how: "Slide the knee through the guard to side control.", cue: "knee slice pass" },
    "kosoto gake": { how: "Hook the outside leg and reap it backward.", cue: "kosoto gake" },
    "kosoto gari": { how: "Reap the outside leg with a push to the mat.", cue: "kosoto gari" },
    "kouchi gari": { how: "Reap the inner heel and drive the opponent down.", cue: "kouchi gari" },
    "lateral drop": { how: "Drop the hips and throw the opponent over the side.", cue: "lateral drop" },
    "leg drag pass": { how: "Grab the ankle and drag the leg across to pass.", cue: "leg drag pass" },
    "leg weave pass": { how: "Weave the arms between the legs and drive through.", cue: "leg weave pass" },
    "limp arm": { how: "Relax the arm and slip out of the grip.", cue: "limp arm" },
    "modified scarf hold": { how: "Pin the arm and shoulder from a tightened kesa.", cue: "modified scarf hold" },
    "osoto gari": { how: "Reap the outside leg and drive the opponent over.", cue: "osoto gari" },
    "ouchi gari": { how: "Reap the inside leg and spin the opponent down.", cue: "ouchi gari" },
    "over under pass": { how: "Thread the arms over and under, then drive to the side.", cue: "over under pass" },
    "paper cutter choke": { how: "Grip the collar and the lapel and cut the neck.", cue: "paper cutter choke" },
    "pressure pass": { how: "Smash the guard with weight and walk around.", cue: "pressure pass" },
    "russian tie": { how: "Control the elbow and triceps to break posture.", cue: "russian tie" },
    "sasae tsurikomi ashi": { how: "Block the lead leg and lift into a sweep.", cue: "sasae tsurikomi ashi" },
    "scarf hold": { how: "Control the head and arm from the side.", cue: "scarf hold" },
    "seoi nage": { how: "Rotate under the arm and throw over the shoulder.", cue: "seoi nage" },
    "shoot": { how: "Drop level and drive in for a takedown.", cue: "shoot" },
    "sit through": { how: "Sit through the hips to escape and take the back.", cue: "sit through" },
    "smash pass": { how: "Crush the guard flat and step over to side control.", cue: "smash pass" },
    "spin behind": { how: "Spin around the opponent and take the back.", cue: "spin behind" },
    "spiral ride": { how: "Spiral down the back to flatten the opponent.", cue: "spiral ride" },
    "stack pass": { how: "Lift the hips over the head and slide to the side.", cue: "stack pass" },
    "straight armbar": { how: "Hold the wrist and press the elbow across the hip.", cue: "straight armbar" },
    "straight armlock": { how: "Hyperextend the elbow with the arm trapped.", cue: "straight armlock" },
    "sumi gaeshi": { how: "Sit back and throw the opponent over the shoulder.", cue: "sumi gaeshi" },
    "switch": { how: "Pivot the hips and switch to take the back.", cue: "switch" },
    "tai otoshi": { how: "Drop the body and throw over the leg.", cue: "tai otoshi" },
    "tani otoshi": { how: "Drop to the side and drive the opponent over the leg.", cue: "tani otoshi" },
    "tomoe nage": { how: "Place the foot on the hip and roll backward to throw.", cue: "tomoe nage" },
    "tripod pass": { how: "Push the hips up and walk around to the side.", cue: "tripod pass" },
    "tripod sweep": { how: "Lift the leg into a tripod and roll the opponent.", cue: "tripod sweep" },
    "two on one": { how: "Control the arm with both hands to break posture.", cue: "two on one" },
    "uchi mata": { how: "Lift the inner thigh and throw over the hip.", cue: "uchi mata" },
    "ura nage": { how: "Hook behind and throw the opponent backward.", cue: "ura nage" },
    "x pass": { how: "Push both knees to one side and slide to the back.", cue: "x pass" },
    'guard pull': { how: 'Sit down and wrap your legs around the opponent, controlling distance with grips.', cue: 'Sit, wrap the legs.' },
    'sweep': { how: 'Break the opponent\'s base with grips and momentum, then roll them over you.', cue: 'Break base, roll.' },
    'armbar': { how: 'Isolate the arm, control the wrist and elbow, and extend the joint across your body.', cue: 'Isolate, extend.' },
    'kimura': { how: 'Control the wrist, thread the other arm under the elbow, and crank the shoulder.', cue: 'Thread, crank.' },
    'triangle': { how: 'From guard, swing your leg over the shoulder, lock the ankle, and squeeze with the legs.', cue: 'Leg over, lock, squeeze.' },
    'rear naked choke': { how: 'From the back, slide the arm under the chin and squeeze the grip together.', cue: 'Under the chin, squeeze.' },
    'mount': { how: 'Control the hips from top position, keep your weight heavy, and isolate an attack.', cue: 'Control the hips.' },
    'side control': { how: 'Pin the opponent\'s near hip and shoulder from the side, chest-to-chest.', cue: 'Pin the hip and shoulder.' },
    'guard pass': { how: 'Control the legs, keep your head low, and step around to side control.', cue: 'Head low, step around.' },
    'back take': { how: 'Work to the opponent\'s back and secure both hooks.', cue: 'Both hooks in.' },
    'omoplata': { how: 'From guard, swing a leg over the shoulder and rotate to attack the shoulder joint.', cue: 'Leg over, rotate.' },
    'sweep to mount': { how: 'Execute a sweep and immediately follow through to establish mount.', cue: 'Sweep, follow through.' },
  },
  'Wrestling': {
    "ankle sweep": { how: "Sweep the ankle while driving the head forward.", cue: "ankle sweep" },
    "arm bar from guard": { how: "Post on the bicep and pressure from top guard.", cue: "arm bar from guard" },
    "arm control": { how: "Control the wrist and elbow to steer the opponent.", cue: "arm control" },
    "arm spin": { how: "Spin the opponent by the arm and take the back.", cue: "arm spin" },
    "arm triangle from mount": { how: "Thread the arm under the neck and squeeze.", cue: "arm triangle from mount" },
    "butterfly guard": { how: "Hook the legs inside and lift for sweeps.", cue: "butterfly guard" },
    "calf crush": { how: "Drive the calf down from the leg ride.", cue: "calf crush" },
    "calf slicer": { how: "Trap the calf against the shin and squeeze.", cue: "calf slicer" },
    "collar drag": { how: "Drag the collar down and forward to break posture.", cue: "collar drag" },
    "crucifix": { how: "Trap both arms and control from the back.", cue: "crucifix" },
    "double underhooks": { how: "Lock both underhooks to control the body.", cue: "double underhooks" },
    "front choke": { how: "Drive the forearm across the throat from the front.", cue: "front choke" },
    "head and arm control": { how: "Lock the head and arm to pin the opponent.", cue: "head and arm control" },
    "head snap": { how: "Snap the head down to break posture.", cue: "head snap" },
    "headlock throw": { how: "Lock the head and hip and throw over.", cue: "headlock throw" },
    "kimura trap": { how: "Use the kimura grip to force a takedown or tap.", cue: "kimura trap" },
    "knee shield": { how: "Frame the knee against the opponent's hip to defend.", cue: "knee shield" },
    "leg hook": { how: "Hook the leg to unbalance the opponent.", cue: "leg hook" },
    "leg lace": { how: "Lace the legs and drive the opponent over.", cue: "leg lace" },
    "leg lock": { how: "Attack the ankle or knee joint.", cue: "leg lock" },
    "north south position": { how: "Hold the opponent from the top, head to head.", cue: "north south position" },
    "russian arm drag": { how: "Drag the arm across and circle to the back.", cue: "russian arm drag" },
    "sacrifice throw": { how: "Drop and throw the opponent over you.", cue: "sacrifice throw" },
    "shoulder lock": { how: "Hyperextend the shoulder with a straight grip.", cue: "shoulder lock" },
    "shoulder throw": { how: "Rotate and throw the opponent over the shoulder.", cue: "shoulder throw" },
    "single collar tie": { how: "Control the head with one hand on the collar.", cue: "single collar tie" },
    "single leg x guard": { how: "Hook one leg high into an X-guard sweep.", cue: "single leg x guard" },
    "standing kimura": { how: "Crank the kimura grip standing to force the mat.", cue: "standing kimura" },
    "trip takedown": { how: "Trip the opponent and drive them down.", cue: "trip takedown" },
    "turk": { how: "Cross the legs from the leg ride and roll the hips.", cue: "turk" },
    "waist lock takedown": { how: "Lock the waist and throw to the mat.", cue: "waist lock takedown" },
    "wrist lock": { how: "Twist the wrist against the joint.", cue: "wrist lock" },
    "x guard": { how: "Cross the legs on the opponent's arm and lift.", cue: "x guard" },
    'double leg': { how: 'Drop level, step deep, wrap both legs, and drive forward while lifting.', cue: 'Drop, step, drive.' },
    'single leg': { how: 'Grab one leg, pinch it to your chest, and work the finish with your head inside.', cue: 'Pinch, head inside.' },
    'arm drag': { how: 'Pull the opponent\'s arm across their body to clear their defenses and take the back.', cue: 'Pull across, clear.' },
    'sprawl': { how: 'Kick both legs back and drop your hips onto the opponent\'s head when they shoot.', cue: 'Kick back, hips down.' },
    'front headlock': { how: 'Snap the head down and control the neck with both hands.', cue: 'Snap, control the neck.' },
    'takedown': { how: 'Attack the legs with a level change and finish by driving through the hips.', cue: 'Level change, drive.' },
    'trip': { how: 'Break balance with an upper-body pull and sweep the leg to the mat.', cue: 'Pull, sweep the leg.' },
    'hip toss': { how: 'Turn your hips in, load them onto your hip, and throw over with a grip.', cue: 'Hips in, throw.' },
    'ankle pick': { how: 'Snap the head down and reach for the ankle, pulling it out from under them.', cue: 'Snap, grab the ankle.' },
    'cradle': { how: 'Lock the head and near leg together and roll the opponent to their back.', cue: 'Lock head and leg.' },
    'sit out': { how: 'From a defensive base, sit through your hips to escape and create space.', cue: 'Sit through, escape.' },
    'mat return': { how: 'Lift and return the opponent to the mat, landing in control.', cue: 'Lift, return in control.' },
  },
  'Judo': {
    'ogoshi': { how: 'Step in, turn your hips underneath the opponent, and throw them over your hip.', cue: 'Hips under, throw.' },
    'seoi nage': { how: 'Turn your back, load the opponent on your shoulder, and throw them over.', cue: 'Turn, load, throw.' },
    'uchi mata': { how: 'Sweep the inner thigh with your leg while pulling the opponent\'s upper body forward.', cue: 'Sweep the thigh, pull.' },
    'osoto gari': { how: 'Reap the opponent\'s outer leg with your leg while driving them backward.', cue: 'Reap, drive back.' },
    'harai goshi': { how: 'Sweep the opponent\'s leg with your own as you rotate the hips into a throw.', cue: 'Sweep as you turn.' },
    'tai otoshi': { how: 'Drop your weight and extend your leg to block while throwing the opponent over it.', cue: 'Drop, block, throw.' },
    'ippon seoi nage': { how: 'Grab the sleeve and collar, turn, and throw the opponent over your shoulder.', cue: 'Grip, turn, throw.' },
    'kesa gatame': { how: 'Hold the opponent\'s head and arm from the side, pinning them with your weight.', cue: 'Hold head and arm.' },
    'juji gatame': { how: 'Control the arm, straddle the chest, and extend the elbow across your body.', cue: 'Control, extend.' },
    'tomoe nage': { how: 'Place your foot on the opponent\'s belly and roll backward, throwing them over your head.', cue: 'Foot on the belly, roll.' },
    'foot sweep': { how: 'Sweep the opponent\'s foot as you pull their upper body off balance.', cue: 'Sweep as you pull.' },
    'hold down': { how: 'Secure a pin with your weight centered and the opponent flat on their back.', cue: 'Center the weight.' },
    'koshi guruma': { how: 'Wrap the arm around the neck, turn the hips, and throw over the hip.', cue: 'Wrap, turn, throw.' },
    'sumi gaeshi': { how: 'Sit back under the opponent and lift with the leg to flip them over.', cue: 'Sit, lift, flip.' },
    'osoto otoshi': { how: 'Block the rear leg and drop the weight to take the opponent down.', cue: 'Block, drop weight.' },
    'ashi guruma': { how: 'Place the foot across the leg and spin to wheel them over.', cue: 'Foot across, spin.' },
    'de ashi barai': { how: 'Sweep the advancing foot as they step, breaking the rhythm.', cue: 'Sweep the step.' },
    'okuri ashi barai': { how: 'Sweep both feet as the opponent shuffles, catching them mid-step.', cue: 'Sweep both feet.' },
    'sasae tsurikomi ashi': { how: 'Block the ankle and pull the sleeve to tip them over the block.', cue: 'Block, pull, tip.' },
    'hiza guruma': { how: 'Block the knee with your foot and spin the upper body to wheel them.', cue: 'Block the knee, spin.' },
    'uchi ashi barai': { how: 'Sweep the inner foot with yours while pulling the upper body.', cue: 'Sweep inner foot.' },
    'kouchi gari': { how: 'Reap the inner heel while driving the opponent backward.', cue: 'Reap the heel.' },
    'kouchi barai': { how: 'Sweep the inner leg out while pulling the opponent forward.', cue: 'Sweep, pull forward.' },
    'ashi tori zemi': { how: 'Catch the leg and drive forward to take the opponent down.', cue: 'Catch the leg, drive.' },
    'tsurikomi ashi': { how: 'Lift the sleeve and sweep the supporting foot.', cue: 'Lift, sweep the foot.' },
    'ura nage': { how: 'Lock the body, arch backward, and throw the opponent over you.', cue: 'Lock, arch, throw.' },
    'yoko gake': { how: 'Hook the leg from the side and drop weight to throw.', cue: 'Hook, drop weight.' },
    'yoko otoshi': { how: 'Drop to the side while controlling the arm to take them down.', cue: 'Drop to the side.' },
    'hane goshi': { how: 'Spring the hip up under the opponent and throw with a leg kick.', cue: 'Spring the hip.' },
    'kani basami': { how: 'Scissor the legs around the opponent and twist them down.', cue: 'Scissor, twist down.' },
    'tani otoshi': { how: 'Drop the hip behind the opponent\'s leg and sit them down.', cue: 'Drop the hip.' },
    'ashi garami': { how: 'Entangle the leg and apply pressure against the knee or ankle.', cue: 'Entangle, apply pressure.' },
    'uchi mata sukashi': { how: 'Step over the inner thigh attack and spin to take the back.', cue: 'Step over, spin.' },
    'yoko shiho gatame': { how: 'Pin from the side, chest-to-chest, with weight across the body.', cue: 'Side pin, weight across.' },
    'tate shiho gatame': { how: 'Pin from the top with both arms controlling the opponent\'s arms.', cue: 'Top pin, control arms.' },
    'kami shiho gatame': { how: 'Pin from the head with the weight over the chest.', cue: 'Head pin, weight over.' },
    'ude garami': { how: 'Fold the arm and rotate the wrist to attack the elbow.', cue: 'Fold, rotate.' },
    'shime waza': { how: 'Apply a strangle to the neck with controlled pressure.', cue: 'Control the neck.' },
    'kata gatame': { how: 'Trap the head and arm together and squeeze for the pin.', cue: 'Trap, squeeze.' },
    'hiza gatame': { how: 'Hold the leg with the knee and apply pressure.', cue: 'Hold, apply pressure.' },
    'atemi waza': { how: 'Strike at vital points to create openings.', cue: 'Strike the openings.' },
    'ashi uke': { how: 'Use the foot and leg to block an incoming attack.', cue: 'Block with the foot.' },
    'waki gatame': { how: 'Clamp the arm under the armpit and apply pressure.', cue: 'Clamp, apply pressure.' },
    'atemi': { how: 'Deliver a sharp strike to a vulnerable area.', cue: 'Sharp strike.' },
    'ude hishigi juji gatame': { how: 'Control the arm and hyperextend the elbow from the cross position.', cue: 'Control, extend.' },
    'ashi hishigi': { how: 'Lock the foot and apply pressure against the ankle.', cue: 'Lock the ankle.' },
    'ude hishigi ura': { how: 'Reverse the arm lock and apply backward pressure on the elbow.', cue: 'Reverse, apply pressure.' },
    'kote hishigi': { how: 'Bend the wrist and apply pressure to the joint.', cue: 'Bend the wrist.' },
    'kansetsu waza': { how: 'Apply a joint lock against the natural bend.', cue: 'Lock the joint.' },
    'kansetsu waza kata gatame': { how: 'Combine the shoulder pin with a joint lock.', cue: 'Pin and lock.' },
  },
  'Taekwondo': {
    'jab': { how: 'Snap the lead hand straight from your chin, rotating the fist at extension, and return to guard.', cue: 'Snap out, return fast.' },
    'cross': { how: 'Pivot the rear foot and drive the rear hand straight through with full hip rotation.', cue: 'Pivot and drive.' },
    'front kick': { how: 'Raise the knee to the chest and extend the foot forward, snapping with the ball of the foot.', cue: 'Knee up, snap forward.' },
    'roundhouse kick': { how: 'Pivot the standing foot, raise the knee, and rotate the hips to snap the foot through the target.', cue: 'Pivot, knee up, whip through.' },
    'side kick': { how: 'Chamber the knee across the body, then extend the leg sideways with the heel leading.', cue: 'Chamber, extend with the heel.' },
    'back kick': { how: 'Turn the head and shoulders back, chamber the knee, and drive the heel straight behind you.', cue: 'Look back, drive the heel.' },
    'hook kick': { how: 'Raise the knee, swing the leg in a horizontal arc, and hook with the heel.', cue: 'Knee up, hook the heel.' },
    'axe kick': { how: 'Raise the leg high, then drop the heel straight down with power.', cue: 'Raise high, chop down.' },
    'crescent kick': { how: 'Swing the leg in an inward or outward arc, striking with the inner or outer foot edge.', cue: 'Swing the arc.' },
    'spinning back kick': { how: 'Pivot 180 degrees on the lead foot and drive the heel straight back into the target.', cue: 'Spin, drive the heel.' },
    'push kick': { how: 'Extend the foot forward with a thrusting motion to control range.', cue: 'Thrust to control.' },
    'knee': { how: 'Drive the knee straight up the middle, using the clinch or grip to control distance.', cue: 'Drive the knee up.' },
  },
  'Karate': {
    'jab': { how: 'Snap the lead hand straight from a bladed stance, rotating the fist at extension, and return.', cue: 'Snap and return.' },
    'cross': { how: 'Pivot the rear foot and drive the rear hand straight through the target with full rotation.', cue: 'Pivot and drive.' },
    'reverse punch': { how: 'From a stable stance, rotate the hips and drive the rear fist straight down the center line.', cue: 'Hips first, straight line.' },
    'front kick': { how: 'Raise the knee and snap the ball of the foot forward, then rechamber.', cue: 'Knee up, snap, rechamber.' },
    'side kick': { how: 'Chamber the knee across the body and extend the heel sideways with hip rotation.', cue: 'Chamber, extend the heel.' },
    'roundhouse kick': { how: 'Pivot the standing foot and whip the leg through with the shin or instep.', cue: 'Pivot, whip through.' },
    'backfist': { how: 'Snap the arm out and whip the back of the fist into the target, rotating the wrist.', cue: 'Snap, whip the backfist.' },
    'ridge hand': { how: 'Strike with the ridge of the hand between the thumb and forefinger, wrist straight.', cue: 'Wrist straight, ridge first.' },
    'knife hand': { how: 'Strike with the edge of the hand, fingers tight, thumb across the palm.', cue: 'Edge of the hand, tight fingers.' },
    'elbow': { how: 'Slice the elbow in a tight arc with the hips behind it.', cue: 'Tight arc, hip turn.' },
    'knee': { how: 'Drive the knee up the middle with a strong hip snap.', cue: 'Drive the knee.' },
    'push kick': { how: 'Extend the foot forward with a thrust to create space.', cue: 'Thrust for space.' },
  },
};

// Shared striking techniques — available as fallback for every style
const SHARED_TECHNIQUES = {
  'jab': { how: 'Snap the lead hand straight from your chin, rotate the fist at extension, and return immediately to guard.', cue: 'Snap it, return fast.' },
  'cross': { how: 'Pivot the rear foot and drive the rear hand straight through the target with full hip rotation.', cue: 'Pivot, drive, recover.' },
  'hook': { how: 'Pivot the lead foot and swing the lead arm horizontally with a 90-degree elbow, turning through the hips.', cue: 'Turn the hip, elbow at 90.' },
  'uppercut': { how: 'Bend the knees, then drive up through the hips with the palm facing you, landing under the chin.', cue: 'Dip and drive up.' },
  'overhand': { how: 'Loop the rear hand up and over the guard with a wide arc, dropping your weight into it.', cue: 'Loop over, drop weight.' },
  'slip': { how: 'Move your head off the center line by bending the knees and rotating the shoulders, never leaning back.', cue: 'Small movement, bend knees.' },
  'duck': { how: 'Drop your level by bending both knees, keeping the back straight and eyes up.', cue: 'Bend both knees.' },
  'roll': { how: 'Bend the knees and trace a U-shape with your head under the incoming shot.', cue: 'Tuck chin, trace the U.' },
  'teep': { how: 'Push the ball of the foot into the opponent\'s midsection to control range.', cue: 'Push through the hip.' },
  'knee': { how: 'Drive the knee straight up the middle, using the clinch or grip to control distance.', cue: 'Drive the knee up.' },
  'elbow': { how: 'Slice the elbow in tight arcs, turning the hips for power.', cue: 'Tight arcs, hip turn.' },
  'low kick': { how: 'Chop the shin into the opponent\'s leg, pivoting the standing foot.', cue: 'Chop the leg, pivot.' },
  'body kick': { how: 'Drive the shin into the ribs with a hip turn, keeping your hands up.', cue: 'Hip turn, hands up.' },
  'head kick': { how: 'Swing the leg high with a whipping motion, pivoting fully on the standing foot.', cue: 'Whip it high, full pivot.' },
  'roundhouse': { how: 'Pivot the standing leg, raise the knee, and rotate the hips to snap the shin through the target.', cue: 'Knee up, hips through.' },
  'spinning backfist': { how: 'Pivot 180 degrees on the lead foot and whip the rear arm around with the back of the fist.', cue: 'Spin, then whip.' },
  'feint': { how: 'Throw a short, partial motion that sells a punch without committing.', cue: 'Short and sharp.' },
  'pivot': { how: 'Pivot on the lead foot and step the rear foot around to change your angle.', cue: 'Step around, keep guard.' },
  'parry': { how: 'Deflect the incoming punch with a light hand motion off the center line.', cue: 'Light deflection.' },
  'takedown': { how: 'Drop your level, close distance, and drive through the hips to bring the fight down.', cue: 'Drop level, drive hips.' },
  'clinch': { how: 'Control the opponent\'s posture with grips and work short strikes or throws.', cue: 'Control posture.' },
  'ground and pound': { how: 'From top position, post your weight and fire short, controlled strikes.', cue: 'Post, short strikes.' },
  // ---------- Grappling / submission entries (BJJ, Wrestling, MMA, Sambo) ----------
  'double leg': { how: 'Drop your level, shoot under the hips, and drive forward to finish on top.', cue: 'Drop, shoot, drive.' },
  'single leg': { how: 'Drop to one knee, scoop the far ankle, and drive through to finish the takedown.', cue: 'Scoop the ankle, drive.' },
  'high crotch': { how: 'Reach deep between the legs, stand tall, and finish the takedown from the high crotch lift.', cue: 'Reach deep, stand tall.' },
  'arm drag': { how: 'Pull the opponent\'s arm across their body and circle to take the back.', cue: 'Pull across, circle.' },
  'snap down': { how: 'Snap the head down while circling to the side, then attack the front headlock.', cue: 'Snap, circle.' },
  'sprawl': { how: 'Shoot the hips back and down when the opponent shoots, sprawling over their back.', cue: 'Hips back, sprawl.' },
  'underhook': { how: 'Work your arm under the opponent\'s armpit to control their posture and set up throws.', cue: 'Get under, control.' },
  'overhook': { how: 'Lock your arm over the opponent\'s arm to break their posture and set up sweeps.', cue: 'Lock over, break posture.' },
  'body lock': { how: 'Lock both arms around the opponent\'s waist and lift for the takedown.', cue: 'Lock, lift, drive.' },
  'knee tap': { how: 'Snap the head down and sweep the far knee with your hand to trip them.', cue: 'Snap head, tap knee.' },
  'firemans carry': { how: 'Reach under the arm, roll under their weight, and dump them over your shoulder.', cue: 'Reach, roll, dump.' },
  'headlock': { how: 'Wrap the arm around the neck and pull tight, using your head against their jaw.', cue: 'Wrap and squeeze.' },
  'suplex': { how: 'Lock the body, arch your back, and throw the opponent over your head.', cue: 'Lock, arch, throw.' },
  'hip throw': { how: 'Turn your hips under the opponent and throw them across your hip.', cue: 'Turn hips, throw.' },
  'back take': { how: 'Circle to the back and secure both hooks with your heels.', cue: 'Circle, hook both.' },
  'mount': { how: 'From top position, straddle the opponent\'s torso with both knees planted.', cue: 'Straddle and post.' },
  'side control': { how: 'Pin the chest from the side, chest-to-chest, controlling the near arm.', cue: 'Chest to chest.' },
  'knee on belly': { how: 'Post one knee across the torso and keep the other leg out for balance.', cue: 'Knee across, base out.' },
  'half guard': { how: 'From bottom, trap one of the opponent\'s legs between yours.', cue: 'Trap one leg.' },
  'guard pull': { how: 'Sit to guard and wrap your legs around the opponent, breaking their posture.', cue: 'Sit, wrap, break.' },
  'kimura': { how: 'Grab the wrist, thread the other arm under the bicep, and crank the shoulder.', cue: 'Grab, thread, crank.' },
  'americana': { how: 'Pin the wrist, flatten the arm at 90 degrees, and press the elbow down.', cue: 'Pin, flatten, press.' },
  'armbar': { how: 'Isolate the arm, swing the leg over the head, and hyperextend the elbow.', cue: 'Isolate, swing, extend.' },
  'rear naked choke': { how: 'From the back, slide the arm under the chin and squeeze with the other hand.', cue: 'Under the chin, squeeze.' },
  'guillotine': { how: 'Wrap the arm around the neck from the front and pull up with a squeeze.', cue: 'Wrap, pull up.' },
  'triangle choke': { how: 'Lock the legs around the neck and one arm, then squeeze the knees.', cue: 'Lock legs, squeeze.' },
  'arm triangle': { how: 'From side control, thread the head and arm together and squeeze the shoulder.', cue: 'Thread, squeeze.' },
  'north south choke': { how: 'From north-south position, slide the forearm across the throat and squeeze.', cue: 'Forearm across, squeeze.' },
  'anaconda choke': { how: 'Wrap the arm under the neck from the side and roll to squeeze.', cue: 'Wrap, roll, squeeze.' },
  'd arce choke': { how: 'Thread the arm under the neck from the top, lock the grip, and squeeze.', cue: 'Thread, lock, squeeze.' },
  'scissor sweep': { how: 'From guard, pull the arm and kick the legs like scissors to reverse position.', cue: 'Pull, scissor, reverse.' },
  'hip bump sweep': { how: 'From guard, bump the hips and pull the arm to roll the opponent over.', cue: 'Bump, pull, roll.' },
  'pendulum sweep': { how: 'From guard, swing the leg like a pendulum to tip the opponent over.', cue: 'Swing the leg.' },
  'butterfly sweep': { how: 'Hook both ankles from guard and lift to sweep the opponent over.', cue: 'Hook, lift, sweep.' },
  'omoplata': { how: 'From guard, swing the leg over the shoulder and roll to attack the shoulder.', cue: 'Swing, roll, attack.' },
  'kneebar': { how: 'Isolate the leg and hyperextend the knee with both hands pulling.', cue: 'Isolate, pull, extend.' },
  'knee cut pass': { how: 'Slice the knee across the opponent\'s thigh to pass the guard.', cue: 'Slice across, pass.' },
  'toreando pass': { how: 'Push both knees aside and step around to pass the guard.', cue: 'Push, step around.' },
  'arm drag takedown': { how: 'Drag the arm across and circle to take the back for the finish.', cue: 'Drag, circle, take back.' },
  'wrist control': { how: 'Grab the wrist to control distance and set up the next attack.', cue: 'Control the wrist.' },
  'collar tie': { how: 'Grab the back of the neck to control posture and set up attacks.', cue: 'Control the neck.' },
  'whizzer': { how: 'Hook the arm over the opponent\'s back from below to defend the takedown.', cue: 'Hook over, defend.' },
  'leg ride': { how: 'Hook the legs from top to control the opponent\'s movement and score.', cue: 'Hook the legs, ride.' },
  'cradle': { how: 'Trap the head and far leg together and squeeze to pin.', cue: 'Trap, squeeze, pin.' },
  'crossface': { how: 'Drive the forearm across the jaw to flatten the opponent.', cue: 'Forearm across the face.' },
  'go behind': { how: 'Circle away from the opponent\'s hands and step to take the back.', cue: 'Circle, step behind.' },
  'sit out': { how: 'Drop the hips, spin under, and escape to take the back.', cue: 'Drop, spin, escape.' },
  'granby roll': { how: 'Tuck and roll under the opponent to escape from bottom.', cue: 'Tuck, roll, escape.' },
  'sweep': { how: 'Use the legs and momentum to reverse the position from bottom.', cue: 'Legs and momentum.' },
  'guard pass': { how: 'Break the legs apart and control the hips to pass to a pin.', cue: 'Break, control, pass.' },
  'front headlock': { how: 'Lock the head down and under your arm, then circle for the takedown.', cue: 'Lock the head, circle.' },
  'choke': { how: 'Cut off the airway or blood flow with a controlled squeeze.', cue: 'Control, then squeeze.' },
  'lock': { how: 'Isolate the joint and apply steady pressure against the natural bend.', cue: 'Isolate, apply pressure.' },
  'throw': { how: 'Off-balance the opponent, turn your hips, and throw them to the mat.', cue: 'Off-balance, turn, throw.' },
  'trip': { how: 'Sweep or hook the leg while driving forward to take them down.', cue: 'Hook, drive forward.' },

    "ankle pick": { how: "Grab the ankle, drive the shoulder into the thigh, pull the leg out.", cue: "ankle pick" },
    "arm drag to back take": { how: "Drag the arm across, step behind and take the back.", cue: "arm drag to back take" },
    "arm lock": { how: "Hyperextend the elbow in an armbar or straight armlock.", cue: "arm lock" },
    "bob and weave": { how: "Dip under the punch in a U-shape and come back up in range.", cue: "bob and weave" },
    "body shot": { how: "Hook or cross to the ribs, under the elbows.", cue: "body shot" },
    "catch kick": { how: "Catch the incoming kick under the leg and hold it.", cue: "catch the kick" },
    "catch punch": { how: "Trap the incoming punch with a cupped hand.", cue: "catch the punch" },
    "clinch knee": { how: "Lock the clinch, pull the head down, drive the knee up the middle.", cue: "clinch knee" },
    "counter cross": { how: "Slip or parry, then answer with the rear cross.", cue: "counter cross" },
    "counter elbow": { how: "Block the strike, then answer with an elbow.", cue: "counter elbow" },
    "counter hook": { how: "Roll off the punch, then answer with a hook.", cue: "counter hook" },
    "counter knee": { how: "Catch the strike and answer with a knee.", cue: "counter knee" },
    "counter punch": { how: "Block or slip, then fire a punch back.", cue: "counter punch" },
    "cross counter": { how: "Counter the jab with a cross over the top.", cue: "cross counter" },
    "dirty boxing": { how: "Work short punches inside the clinch.", cue: "dirty boxing" },
    "double hook": { how: "Snap the lead hook, then fire a second hook to the same target.", cue: "double hook" },
    "double leg takedown": { how: "Drop level, drive through the hips and finish the double leg.", cue: "double leg takedown" },
    "duck opponents hook": { how: "Bend the knees and duck under the incoming hook.", cue: "duck the hook" },
    "duck opponents punch": { how: "Dip under the incoming punch, staying in range.", cue: "duck the punch" },
    "elbow strike": { how: "Drive the elbow into the target with the hips behind it.", cue: "elbow strike" },
    "fake low kick": { how: "Threaten the low kick, then fire the real strike.", cue: "fake low kick" },
    "fake takedown": { how: "Threaten the shot to draw the hands down, then strike.", cue: "fake takedown" },
    "feint jab": { how: "Show the jab to draw a reaction, then attack.", cue: "feint jab" },
    "feint kick": { how: "Show the kick to draw the guard, then attack.", cue: "feint kick" },
    "feint takedown": { how: "Show the level change to draw the sprawl, then attack.", cue: "feint takedown" },
    "flying knee": { how: "Push off the rear leg and drive the knee through the target.", cue: "flying knee" },
    "front kick": { how: "Push the foot straight forward like a teep.", cue: "front kick" },
    "front teep to the face": { how: "Push the front foot up through the chin like a spear.", cue: "front teep to the face" },
    "gator roll": { how: "Roll the hips over to escape and come up on top.", cue: "gator roll" },
    "ground control": { how: "Hold top position with weight, base and pressure.", cue: "ground control" },
    "inside leg kick": { how: "Swing the shin from the inside across the lead leg.", cue: "inside low kick" },
    "inside low kick": { how: "Swing the shin from the inside across the opponent's lead leg.", cue: "inside low kick" },
    "inside trip": { how: "Step in deep and sweep the opponent's near leg.", cue: "inside trip" },
    "jumping knee": { how: "Jump and drive the knee into the chin or body.", cue: "jumping knee" },
    "jumping switch knee": { how: "Switch stance in the air and land a flying knee.", cue: "jumping switch knee" },
    "level change": { how: "Drop the hips and change levels to shoot or strike.", cue: "level change" },
    "lift": { how: "Elevate the opponent and drive them down.", cue: "lift" },
    "liver shot": { how: "Hook the rear hand under the elbow into the liver.", cue: "liver shot" },
    "outside leg kick": { how: "Swing the shin into the opponent's rear leg.", cue: "outside leg kick" },
    "outside trip": { how: "Step outside and reap the far leg.", cue: "outside trip" },
    "overhand punch": { how: "Drop the rear hand and arc it over the guard.", cue: "overhand punch" },
    "push kick": { how: "Push the foot forward to keep the opponent at range.", cue: "push kick" },
    "question mark kick": { how: "Raise the knee like a teep, then snap it over the guard like a question mark.", cue: "question mark kick" },
    "repeated knees": { how: "Lock the clinch and pump the knees into the body.", cue: "repeated knees" },
    "shift": { how: "Slide the rear foot forward and the lead foot back to switch stances.", cue: "shift your stance" },
    "shift foot": { how: "Step the feet into the opposite stance.", cue: "shift your feet" },
    "single leg takedown": { how: "Secure one leg, lift it and drive to the mat.", cue: "single leg takedown" },
    "slam": { how: "Lift the opponent and drive them to the mat.", cue: "slam" },
    "slip jab": { how: "Move the head off the line to avoid the jab.", cue: "slip the jab" },
    "slip opponents jab": { how: "Tilt the head just off the center line to let the jab pass.", cue: "slip the jab" },
    "slip opponents punch": { how: "Move the head off the line, then counter.", cue: "slip the punch" },
    "southpaw cross": { how: "From the southpaw stance, throw the rear cross.", cue: "southpaw cross" },
    "spinning back body kick": { how: "Pivot the base leg and spin the hips into a back kick to the body.", cue: "spinning back body kick" },
    "spinning back elbow": { how: "Spin the body and drive the elbow around into the face.", cue: "spinning back elbow" },
    "spinning back kick": { how: "Pivot, look over the shoulder, and drive the heel straight back.", cue: "spinning back kick" },
    "spinning heel kick": { how: "Spin the whole body and whip the heel around in an arc.", cue: "spinning heel kick" },
    "spinning hook kick": { how: "Spin and hook the heel around the guard to the head.", cue: "spinning hook kick" },
    "step": { how: "Take a short, balanced step to close distance.", cue: "step" },
    "step back": { how: "Step straight back to create distance and draw the attack.", cue: "step back" },
    "step forward": { how: "Step forward to close the distance before striking.", cue: "step forward" },
    "step in elbow": { how: "Step forward and drive the elbow horizontally into the target.", cue: "step in elbow" },
    "submission attempt": { how: "Attack a joint or choke to force the tap.", cue: "submission attempt" },
    "superman punch": { how: "Fake the front kick, push off the lead leg, and cross over the top.", cue: "superman punch" },
    "switch kick": { how: "Switch the stance and immediately fire the roundhouse.", cue: "switch kick" },
    "teep to the face": { how: "Push the front foot up through the chin like a spear.", cue: "teep to the face" },

    "arm trap": { how: "Pin the arm against the body to limit defense.", cue: "arm trap" },
    "foot sweep": { how: "Sweep the opponent's foot while breaking their balance.", cue: "foot sweep" },
    "kick": { how: "Drive the shin or foot into the target.", cue: "kick" },
    "lateral drop": { how: "Drop the hips and throw the opponent over the side.", cue: "lateral drop" },
    "pivot degrees": { how: "Turn the lead foot and rotate the hips to change angle.", cue: "pivot" },
    "russian tie": { how: "Control the elbow and triceps to break posture.", cue: "russian tie" },
    "spin behind": { how: "Spin around the opponent and take the back.", cue: "spin behind" },
};

// Curriculum: ordered technique names to learn per style
const CURRICULUM = {
  'Boxing': ['jab', 'cross', 'hook', 'slip', 'uppercut', 'roll', 'footwork', 'feint', 'pivot', 'body shot', 'pull counter', 'shoulder roll', 'duck', 'overhand'],
  'Kickboxing': ['jab', 'cross', 'low kick', 'hook', 'roundhouse', 'body kick', 'teep', 'uppercut', 'knee', 'elbow', 'head kick', 'spinning backfist'],
  'Muay Thai': ['jab', 'cross', 'roundhouse', 'teep', 'low kick', 'knee', 'clinch', 'elbow', 'plum clinch', 'lead uppercut', 'switch kick', 'superman punch'],
  'MMA': ['jab', 'cross', 'takedown', 'double leg', 'single leg', 'rear naked choke', 'body kick', 'head kick', 'guillotine', 'kimura', 'teep', 'clinch'],
  'Combat Sambo': ['jab', 'cross', 'double leg', 'hip throw', 'knee', 'rear naked choke', 'armbar', 'foot sweep', 'clinch', 'guillotine', 'ground and pound', 'spinning back kick'],
  'BJJ': ['guard pull', 'sweep', 'mount', 'side control', 'guard pass', 'armbar', 'rear naked choke', 'kimura', 'triangle', 'back take', 'omoplata', 'sweep to mount'],
  'Wrestling': ['double leg', 'single leg', 'arm drag', 'sprawl', 'front headlock', 'takedown', 'trip', 'hip toss', 'ankle pick', 'cradle', 'sit out', 'mat return'],
  'Judo': ['ogoshi', 'seoi nage', 'osoto gari', 'harai goshi', 'uchi mata', 'tai otoshi', 'ippon seoi nage', 'foot sweep', 'tomoe nage', 'kesa gatame', 'juji gatame', 'hold down'],
  'Taekwondo': ['jab', 'cross', 'front kick', 'roundhouse kick', 'side kick', 'back kick', 'hook kick', 'axe kick', 'crescent kick', 'spinning back kick', 'push kick', 'knee'],
  'Karate': ['jab', 'cross', 'reverse punch', 'front kick', 'side kick', 'roundhouse kick', 'backfist', 'ridge hand', 'knife hand', 'elbow', 'knee', 'push kick'],
};

// Normalize a combo move name to look up in the technique library
const normalizeMove = (move) => {
  let s = move
    .toLowerCase()
    .replace(/\b(left|right|lead|rear)\s*/g, '')
    .replace(/['’]/g, '')
    // Strip parenthetical glosses: "O Goshi (Major Hip Throw)" -> "o goshi"
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Target-aware mapping so "kick to the head" -> "head kick" etc.
  s = s
    .replace(/kick to (?:the )?head/, 'head kick')
    .replace(/kick to (?:the )?(body|liver|solar plexus)/, 'body kick')
    .replace(/ to (?:the )?(head|body|liver|chin|solar plexus)/g, '');
  // Synonym aliases used across styles
  const aliases = {
    'leg kick': 'low kick',
    'high kick': 'head kick',
    'roundhouse kick': 'roundhouse',
    'body hook': 'hook',
    'head hook': 'hook',
    'lead uppercut': 'uppercut',
    'shovel hook': 'hook',
    'backfist': 'spinning backfist',
    'spinning back fist': 'spinning backfist',
    'front kick': 'teep',
    'push kick': 'teep',
    'teep kick': 'teep',
    'superman': 'superman punch',
    'double jab': 'jab',
    'naked choke': 'rear naked choke',
    'knee strike': 'knee',
    'knee strikes': 'knee',
    'up elbow': 'elbow',
    'spinning elbow': 'elbow',
    'horizontal elbow': 'elbow',
    'duck under': 'duck',
    'inside leg kick': 'low kick',
    'fake cross': 'cross',
    'feint jab': 'feint',
    'throw': 'hip throw',
    'guillotine choke': 'guillotine',
    'hip toss': 'hip throw',
    'side step': 'pivot',
    'step left': 'pivot',
    'step right': 'pivot',
    'slip back': 'slip',
    'fake jab': 'feint',
    'pull guard': 'guard pull',
    'arm wrap': 'arm drag',
    'waist lock': 'body lock',
    'leg sweep': 'foot sweep',
    'hip bump': 'hip bump sweep',
    'arm bar': 'armbar',
    'guillotine choke defense': 'guillotine',
    'back control': 'back take',
    'back mount': 'back take',
    'rear bodylock': 'body lock',
    'straight': 'cross',
    'straight right': 'cross',
    'overhand right': 'overhand',
    'jab': 'jab',
  };
  if (aliases[s]) return aliases[s];
  // "double leg takedown" -> "double leg"
  s = s.replace(' leg takedown', ' leg').replace(' takedown', '');
  return s;
};

const splitCombo = (combo) => combo.split(/\s*(?:>|→|,)\s*/).map(s => s.trim()).filter(Boolean);

// Southpaw: swap left/right + lead/rear in a combo string
const swapStance = (text) => {
  return text
    .replace(/Left/g, '§R§').replace(/Right/g, '§L§').replace(/§R§/g, 'Right').replace(/§L§/g, 'Left')
    .replace(/Lead/g, '§r§').replace(/Rear/g, '§l§').replace(/§r§/g, 'Rear').replace(/§l§/g, 'Lead');
};

// ---------- Theme ----------
const THEMES = {
  dark: {
    bgTop: '#0F172A', bgBottom: '#1F2937', container: '#0F172A', text: '#F8FAFC', textMuted: '#94A3B8',
    cardBg: 'rgba(255,255,255,0.06)', cardBgSelected: 'rgba(255,255,255,0.12)',
    cardGradSelected: ['#C2410C', '#9A3412'], cardGradNormal: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'],
    taskContainer: 'rgba(0,0,0,0.25)', iconButton: 'rgba(255,255,255,0.08)', buttonDefault: 'rgba(255,255,255,0.08)',
    modalBg: '#1F2937', overlay: 'rgba(0,0,0,0.6)', accent: '#F97316', accentDark: '#C2410C',
    // accentBg = button background version of accent (white text must pass ≥4.5)
    accentBg: '#C2410C',
    // Darkened for WCAG ≥4.5 white-icon contrast (was #22C55E/#EF4444/#8B5CF6)
    success: '#15803D', danger: '#DC2626', test: '#7C3AED', timerPanel: 'rgba(255,255,255,0.04)',
    toggleOff: 'rgba(255,255,255,0.1)', shadowColor: '#000', border: '#374151',
  },
  light: {
    bgTop: '#F8FAFC', bgBottom: '#E2E8F0', container: '#F8FAFC', text: '#0F172A', textMuted: '#64748B',
    cardBg: 'rgba(255,255,255,0.7)', cardBgSelected: 'rgba(255,255,255,0.95)',
    cardGradSelected: ['#C2410C', '#9A3412'], cardGradNormal: ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.6)'],
    taskContainer: 'rgba(0,0,0,0.05)', iconButton: 'rgba(0,0,0,0.06)', buttonDefault: 'rgba(0,0,0,0.06)',
    modalBg: '#FFFFFF', overlay: 'rgba(0,0,0,0.45)', accent: '#C2410C', accentDark: '#9A3412',
    accentBg: '#C2410C',
    // Darkened for WCAG ≥4.5 white-icon contrast on light backgrounds
    success: '#166534', danger: '#B91C1C', test: '#6D28D9', timerPanel: 'rgba(0,0,0,0.03)',
    toggleOff: 'rgba(0,0,0,0.08)', shadowColor: '#000', border: '#CBD5E1',
  },
};

// ---------- Persistence helper ----------
const usePersistedState = (key, initial) => {
  const [value, setValue] = useState(initial);
  const loaded = useRef(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw !== null && mounted) setValue(JSON.parse(raw));
      } catch (e) { console.log('storage read', key, e); }
      loaded.current = true;
    })();
    return () => { mounted = false; };
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try { AsyncStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.log('storage write', key, e); }
  }, [key, value]);
  return [value, setValue];
};

// ---------- Haptics helper ----------
const haptic = (type = 'light') => {
  try {
    const map = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy };
    Haptics.impactAsync(map[type] || Haptics.ImpactFeedbackStyle.Light);
  } catch (e) { /* haptics optional */ }
};

// ---------- Weighted random task picker (respects difficulty filter) ----------
const basicLevels = { 'Boxing': 12 };
// A real coach never calls the SAME combo twice in a row. Track the last pick
// per style (module-level; survives across renders) and re-roll once if the
// random pick matches it — keeps sessions feeling coached, not robotic.
const lastPickByStyle = {};
const pickRandomTask = (style, styles, difficultyFilter) => {
  const tasks = styles[style];
  if (!tasks) return null;
  let taskLevels = Object.keys(tasks).map(Number);
  if (difficultyFilter && difficultyFilter !== 'all') {
    const filtered = taskLevels.filter(lv => difficultyOf(style, lv) === difficultyFilter);
    // BUG9: don't silently fall back to all levels when the filter matches nothing —
    // return null so the caller can tell the user instead of showing wrong-difficulty combos
    if (filtered.length > 0) taskLevels = filtered;
    else return null;
  }
  if (taskLevels.length === 0) return null;
  const basicCount = basicLevels[style] || 0;
  const pickLevel = () => {
    if (basicCount > 0 && Math.random() < 0.7) {
      const basics = taskLevels.filter(lv => lv <= basicCount);
      if (basics.length > 0) {
        return basics[Math.floor(Math.random() * basics.length)];
      }
    }
    return taskLevels[Math.floor(Math.random() * taskLevels.length)];
  };
  let randomLevel = pickLevel();
  // No-immediate-repeat: if there are 2+ candidates and we re-picked the last
  // combo for this style, re-roll once (second roll is final — avoids an
  // infinite loop when the filter leaves only one candidate).
  const prev = lastPickByStyle[style];
  if (prev != null && randomLevel === prev && taskLevels.length > 1) {
    randomLevel = pickLevel();
  }
  lastPickByStyle[style] = randomLevel;
  return tasks[randomLevel];
};


// ---------- Drag-and-drop style card (pure JS PanResponder, Expo Go safe) ----------
// Long-press a card to lift it, drag vertically to reorder, release to drop.
// ScrollView scrolling stays intact because we only claim the responder after
// the long-press fires (onMoveShouldSetPanResponder), never on touch start.
const DraggableCard = ({ category, index, onReorder, children }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);
  const dragDy = useRef(0);
  const isDragging = useRef(false);

  const startDrag = () => {
    isDragging.current = true;
    dragDy.current = 0;
    setDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    // Card height ~ 190px including margin; compute how many cards we crossed
    const step = 190;
    const delta = Math.round(dragDy.current / step);
    if (delta !== 0) onReorder(index, index + delta);
    Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => isDragging.current && Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (!isDragging.current) return;
        dragDy.current = g.dy;
        translateY.setValue(g.dy);
      },
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[dragging && { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, transform: [{ translateY }, { scale: 1.03 }] }, !dragging && { transform: [{ translateY }] }, { zIndex: dragging ? 10 : 1 }]}
    >
      {typeof children === 'function'
        ? children({ onLongPress: startDrag, onPressOut: () => { if (!isDragging.current) return; endDrag(); } })
        : children}
    </Animated.View>
  );
};

// ---------- Error boundary: keep the app alive instead of white-screening ----------
// A single runtime JS error in the render tree would otherwise blank the whole
// app on Android. Catch it, show a restart prompt, and let the user recover.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    try { console.log('App crash', error, info); } catch (e) {}
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0F172A' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            MyCombat hit an unexpected error. Your progress is saved — a quick restart will fix it.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#FF7043', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 25 }}
            onPress={() => { this.setState({ hasError: false }); }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold,
    BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold,
  });
  const [generatedTasks, setGeneratedTasks] = usePersistedState('generatedTasks', {});

  // Settings
  const [fontSize, setFontSize] = usePersistedState('fontSize', 16);
  const [comboRestPeriod, setComboRestPeriod] = usePersistedState('comboRestPeriod', 10);
  const [comboRepeatCount, setComboRepeatCount] = usePersistedState('comboRepeatCount', 1);
  const [hiitRestPeriod, setHiitRestPeriod] = usePersistedState('hiitRestPeriod', 10);
  const [workPeriod, setWorkPeriod] = usePersistedState('workPeriod', 30);
  const [totalRounds, setTotalRounds] = usePersistedState('totalRounds', 5);
  const [themeName, setThemeName] = usePersistedState('theme', 'dark');
  const theme = THEMES[themeName] || THEMES.dark;
  const styles = createStyles(theme);

  // Voice options
  const [timerSpeechPaused, setTimerSpeechPaused] = usePersistedState('timerSpeechPaused', false);
  const [comboSpeechPaused, setComboSpeechPaused] = usePersistedState('comboSpeechPaused', false);
  const [speechVoice, setSpeechVoice] = usePersistedState('speechVoice', null);       // command voice (combos/timer)
  const [techniqueVoice, setTechniqueVoice] = usePersistedState('techniqueVoice', null); // technique/form-cue voice
  const [speechRate, setSpeechRate] = usePersistedState('speechRate', 0.9);
  const [speechPitch, setSpeechPitch] = usePersistedState('speechPitch', 1.0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicePack, setVoicePack] = usePersistedState('voicePack', 'coach');
  // cue sound: 'woodblock' | 'bell' | 'beep' | 'whistle' | null
  const [cueSound, setCueSound] = usePersistedState('cueSound', 'bell');
  // cadence: 'explosive' | 'standard' | 'endurance' | 'custom'
  const [cadence, setCadence] = usePersistedState('cadence', 'standard');
  // workout stats + session log
  const [sessions, setSessions] = usePersistedState('sessions', []);
  const [weightKg, setWeightKg] = usePersistedState('weightKg', 75);
  const [activeProgram, setActiveProgram] = usePersistedState('activeProgram', null);
  // hands-free tap-to-skip
  const [tapControls, setTapControls] = usePersistedState('tapControls', false);
  const [landscapeMode, setLandscapeMode] = usePersistedState('landscapeMode', false);
  const [modifiersEnabled, setModifiersEnabled] = usePersistedState('modifiersEnabled', false);
  // Pro entitlement: persisted; gated features soft-open the paywall preview
  const [isPro, setIsPro] = usePersistedState('isPro', false);
  // Authoritative entitlement from Play Billing. isPro is persisted so it can
  // be rehydrated asynchronously and race the billing check — a lapsed sub
  // must NOT be re-granted Pro by a stale stored value. Once billing is
  // available and checked, ONLY the real purchase state counts.
  const [subActive, setSubActive] = useState(false);
  const [billingChecked, setBillingChecked] = useState(false);
  const effectivePro = billingChecked && billingAvailable ? subActive : isPro;
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [pendingProAction, setPendingProAction] = useState(null);
  // Real Play Billing state (react-native-iap) — only available in dev builds
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [billingReady, setBillingReady] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Voice-command hands-free (Pro): "stop" / "next" while training
  const [voiceCommands, setVoiceCommands] = usePersistedState('voiceCommands', false);
  const [voiceCmdListening, setVoiceCmdListening] = useState(false);

  // Difficulty filter: 'all' | 'beginner' | 'intermediate' | 'advanced'
  const [difficultyFilter, setDifficultyFilter] = usePersistedState('difficultyFilter', 'all');
  // Curriculum progress: { [style]: index into CURRICULUM[style] (number of techniques learned) }
  const [curriculumProgress, setCurriculumProgress] = usePersistedState('curriculumProgress', {});
  // Form cues between sets
  const [formCuesEnabled, setFormCuesEnabled] = usePersistedState('formCuesEnabled', true);
  // Southpaw stance
  const [southpaw, setSouthpaw] = usePersistedState('southpaw', false);
  // Workout history + streak: { dates: ['YYYY-MM-DD', ...] }
  const [workoutDates, setWorkoutDates] = usePersistedState('workoutDates', []);
  // Day-0 paywall: shown ONCE after the first completed session (the moment of
  // peak motivation). Per H&F category data, users decide Day 0 or Days 4-7 —
  // this catches the Day-0 cohort right after they've felt the product.
  const [day0PaywallShown, setDay0PaywallShown] = usePersistedState('day0PaywallShown', false);
  // Gamification: XP + level, streak freezes, badges, weekly challenge
  const [xp, setXp] = usePersistedState('xp', 0);
  const [streakFreezes, setStreakFreezes] = usePersistedState('streakFreezes', 2);
  const [freezeUsedFor, setFreezeUsedFor] = usePersistedState('freezeUsedFor', null);
  const [badges, setBadges] = usePersistedState('badges', []);
  const [weeklyGoalMet, setWeeklyGoalMet] = usePersistedState('weeklyGoalMet', {});
  // Haptics toggle
  const [hapticsEnabled, setHapticsEnabled] = usePersistedState('hapticsEnabled', true);
  const hapticIf = (type) => { if (hapticsEnabled) haptic(type); };

  // ---------- Keep-awake: the screen must stay on during a session ----------
  // This is a HANDS-FREE coach app — the user's hands are wrapped/on pads and
  // the phone sits on the floor/bench. Android's default screen timeout (~30s-2min)
  // would lock the screen mid-round; AppState fires 'background', the timer
  // throttles and the session auto-stops. Keep the screen on for the whole
  // session, release the moment training stops.
  const keepAwakeActiveRef = useRef(false);
  // Dim mode: for long bag sessions, keep the screen awake but drop brightness
  // to a faint level (battery + less distracting). Restore on stop.
  const [dimScreen, setDimScreen] = usePersistedState('dimScreen', false);
  const originalBrightnessRef = useRef(null);
  const setKeepAwake = (active) => {
    if (active === keepAwakeActiveRef.current) return;
    keepAwakeActiveRef.current = active;
    try {
      if (active) {
        activateKeepAwakeAsync().catch(() => {});
        if (dimScreen) {
          Brightness.getBrightnessAsync().then(b => {
            originalBrightnessRef.current = b;
            return Brightness.setBrightnessAsync(0.12);
          }).catch(() => {});
        }
      } else {
        deactivateKeepAwake();
        if (dimScreen && originalBrightnessRef.current != null) {
          const restore = originalBrightnessRef.current;
          originalBrightnessRef.current = null;
          Brightness.setBrightnessAsync(restore).catch(() => {});
        }
      }
    } catch (e) { /* keep-awake / dimming optional */ }
  };

  // ---------- Monetization: soft gate + REAL Google Play Billing ----------
  // Gated feature tap → if not Pro, open the paywall preview instead.
  // The action name lets us deep-link to the exact feature after purchase.
  const requirePro = (actionName = 'feature') => {
    if (effectivePro) return true;
    setPendingProAction(actionName);
    setPaywallVisible(true);
    track('paywall_shown', { action: actionName });
    return false;
  };

  // Style gating: free styles work for everyone; locked styles need Pro.
  // A style is locked if it's not in FREE_STYLES and the user isn't Pro.
  const isStyleLocked = (style) => !effectivePro && !FREE_STYLES.includes(style);
  const requireStyle = (style) => isStyleLocked(style) && !requirePro(style);

  // Play Store product IDs — must match the products created in Google Play Console.
  const BILLING_PRODUCTS = {
    monthly: 'mycombat_pro_monthly',
    annual: 'mycombat_pro_annual',
  };
  const BILLING_TIER_NAMES = { monthly: 'Monthly', annual: 'Annual' };
  // Free-trial offer per SKU (from getProducts subscriptionOfferDetails).
  // Populated at init so requestPurchase can pass the offer token — that's how
  // Play Billing knows to grant the 7-day trial instead of charging immediately.
  const [trialOfferBySku, setTrialOfferBySku] = useState({});

  // NitroModules availability probe — non-throwing. react-native-iap v16 is
  // Nitro-based and its module factory throws at require-time in Expo Go
  // (native NitroModules missing). We must NEVER require it there — checking
  // first keeps the whole app alive; the feature simply no-ops.
  const nitroAvailable = (() => {
    try {
      const { TurboModuleRegistry } = require('react-native');
      return TurboModuleRegistry.get('NitroModules') != null;
    } catch (e) {
      return false;
    }
  })();
  const getRNIap = () => {
    if (!nitroAvailable) return null;
    try {
      // NOTE: must stay a static require() — Metro needs it to bundle the
      // module for dev builds. The nitroAvailable gate above ensures it never
      // RUNS in Expo Go (module factory only evaluates on first require call,
      // and we return before calling it). try/catch is belt-and-suspenders.
      const RNIap = require('react-native-iap');
      return RNIap && typeof RNIap.initConnection === 'function' ? RNIap : null;
    } catch (e) {
      return null;
    }
  };

  // Initialize the billing connection on mount (dev builds only — Expo Go has no native module).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const RNIap = getRNIap();
        if (!RNIap) {
          setBillingAvailable(false);
          return;
        }
        await RNIap.initConnection();
        if (cancelled) return;
        setBillingAvailable(true);
        // Fetch product details to find the free-trial offer per SKU
        // (Android: subscriptionOfferDetails[].offerId on the base plan with a
        // FREE pricing phase). Without passing the offer token, Play charges
        // immediately — the trial never fires.
        try {
          const skus = Object.values(BILLING_PRODUCTS);
          const products = await RNIap.getProducts({ skus });
          const offers = {};
          (products || []).forEach(p => {
            const details = p.subscriptionOfferDetails || [];
            const trial = details.find(d => (d.pricingPhases || []).some(ph => ph.priceAmountMicros === 0));
            if (trial) offers[p.productId] = trial;
          });
          if (!cancelled) setTrialOfferBySku(offers);
        } catch (e) { /* product fetch failed — purchases still work without trial */ }
        // Restore a prior purchase (e.g. reinstall) so Pro survives reinstall.
        // Also: if billing is live and NO active purchase exists, clear Pro —
        // a lapsed/expired subscription must not keep the user Pro forever.
        try {
          const purchases = await RNIap.getAvailablePurchases();
          const owned = purchases.some(p => p.productId && Object.values(BILLING_PRODUCTS).includes(p.productId));
          setSubActive(!!owned);
          if (owned && !cancelled) setIsPro(true);
          else if (!cancelled) setIsPro(false);
        } catch (e) { /* restore check failed — treat as not owned */ }
        if (!cancelled) setBillingChecked(true);
        setBillingReady(true);
      } catch (e) {
        // No native module (Expo Go / web) — fall back to dev unlock / soft gate.
        setBillingAvailable(false);
        setBillingReady(true);
      }
    })();
    return () => { cancelled = true; try { const RNIap = getRNIap(); RNIap && RNIap.endConnection && RNIap.endConnection(); } catch (e) {} };
  }, []);

  // Purchase flow: request the Play Billing sheet for a tier, then grant Pro.
  const purchasePro = async (tier) => {
    track('paywall_purchase_attempt', { tier });
    const productId = BILLING_PRODUCTS[tier];
    if (!productId) return;
    if (!billingAvailable) {
      // No native billing (Expo Go / preview build) — keep the old preview behavior.
      if (!__DEV__) {
        setPaywallVisible(false);
        Alert.alert('Billing coming soon', 'Purchases will be enabled in the next update. Pro is currently in preview.');
        return;
      }
      setIsPro(true);
      setSubActive(true);
      setPaywallVisible(false);
      setPendingProAction(null);
      hapticIf('heavy');
      Alert.alert('Pro unlocked (dev)', `MyCombat Pro (${tier}) is active for testing.`);
      return;
    }
    try {
      setPurchasing(true);
      const RNIap = getRNIap();
      if (!RNIap) throw new Error('billing unavailable');
      // Pass the free-trial offer token if we found one for this SKU — Play
      // Billing grants the trial only when the offer is explicitly requested.
      const trialOffer = trialOfferBySku[productId];
      let purchase;
      if (trialOffer && trialOffer.offerId) {
        track('trial_start', { tier, days: TRIAL_DAYS });
        purchase = await RNIap.requestPurchase({
          sku: productId,
          subscriptionOffers: [{
            productId,
            offerId: trialOffer.offerId,
            pricingPhases: trialOffer.pricingPhases || [],
          }],
        });
      } else {
        purchase = await RNIap.requestPurchase({ sku: productId });
      }
      const receipt = purchase?.transactionReceipt || purchase?.purchaseToken || null;
      await RNIap.finishTransaction({ purchase, isConsumable: false });
      if (purchase?.productId === productId) {
        setIsPro(true);
        setSubActive(true);
        setPaywallVisible(false);
        setPendingProAction(null);
        hapticIf('heavy');
        track('paywall_purchase_success', { tier, trial: !!trialOffer });
        Alert.alert('Welcome to Pro', `MyCombat Pro (${BILLING_TIER_NAMES[tier]}) is active.`);
      }
      return receipt;
    } catch (e) {
      // User cancelled the sheet or billing error — stay on the paywall.
      if (e && (e.code === 'E_USER_CANCELLED' || e.message && e.message.includes('cancel'))) {
        track('paywall_purchase_cancelled', { tier });
      } else {
        console.log('purchase error', e);
        Alert.alert('Purchase failed', 'Could not complete the purchase. Please try again.');
      }
      return null;
    } finally {
      setPurchasing(false);
    }
  };

  // Restore purchases: re-query owned items and re-grant Pro.
  const restorePurchases = async () => {
    if (!billingAvailable) {
      Alert.alert('Restore not available', 'Billing is not available in this build.');
      return;
    }
    try {
      setRestoring(true);
      const RNIap = getRNIap();
      if (!RNIap) throw new Error('billing unavailable');
      const purchases = await RNIap.getAvailablePurchases();
      const owned = purchases.some(p => p.productId && Object.values(BILLING_PRODUCTS).includes(p.productId));
      if (owned) {
        setIsPro(true);
        setSubActive(true);
        track('paywall_restore_success');
        Alert.alert('Restored', 'Your Pro purchase has been restored.');
      } else {
        Alert.alert('No purchases found', 'We could not find a Pro purchase on this account.');
      }
    } catch (e) {
      console.log('restore error', e);
      Alert.alert('Restore failed', 'Could not check your purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => { track('app_open', { isPro: effectivePro }); }, [effectivePro]);

  // ---------- Audio: cue sounds + music ducking ----------
  const cueSoundRef = useRef(null);
  const playCueSound = async () => {
    if (!cueSound) return;
    try {
      const sound = CUE_SOUNDS[cueSound];
      if (!sound) return;
      if (cueSoundRef.current) {
        try { cueSoundRef.current.release(); } catch (e) {}
        cueSoundRef.current = null;
      }
      const player = createAudioPlayer(sound);
      cueSoundRef.current = player;
      player.play();
    } catch (e) { console.log('cue sound error', e); }
  };
  const setupAudioMode = async () => {
    try {
      // Voice coach needs AUDIO FOCUS to be audible. 'duckOthers' requests focus
      // and ducks background music (Spotify/YouTube) while the coach speaks.
      // ('mixWithOthers' = no focus request → TTS can be silent over other audio.)
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
    } catch (e) { console.log('audio mode error', e); }
  };
  useEffect(() => { setupAudioMode(); }, []);

  // ---------- Hands-free: accelerometer tap to pause/skip ----------
  // Refs so the listener always calls the latest stop handlers (defined later in component)
  const stopTimerRef = useRef(null);
  const stopTrainingRef = useRef(null);
  useEffect(() => {
    stopTimerRef.current = stopHiitTimer;
    stopTrainingRef.current = stopTrainingSession;
  });
  useEffect(() => {
    // BUG7: only listen while a session is active — no idle 10Hz polling / battery drain
    if (!tapControls || (!timerActive && !isTraining)) return;
    let lastTap = 0;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > 1.6 && now - lastTap > 1200) {
        lastTap = now;
        hapticIf('medium');
        if (timerActive) {
          stopTimerRef.current && stopTimerRef.current();
        } else if (isTraining) {
          stopTrainingRef.current && stopTrainingRef.current();
        } else {
          // tap with no active session does nothing (avoid accidental starts)
        }
      }
    });
    Accelerometer.setUpdateInterval(100);
    return () => sub.remove();
  }, [tapControls, timerActive, isTraining]);

  // ---------- Hands-free: voice commands ("stop" / "next") ----------
  // Native module is OPTIONAL — in Expo Go / web it's null and the feature
  // silently no-ops instead of crashing the app (requireOptionalNativeModule
  // returns null rather than throwing when the native module is absent).
  const SpeechRecognition = requireOptionalNativeModule('ExpoSpeechRecognition');
  // Refs so the recognizer always calls the LATEST handlers (defined later).
  const voiceCmdHandlersRef = useRef({ stop: null, next: null, timerActive: false, isTraining: false });
  useEffect(() => {
    voiceCmdHandlersRef.current = {
      stop: () => {
        if (timerActive) { stopTimerRef.current && stopTimerRef.current(); }
        else if (isTraining) { stopTrainingRef.current && stopTrainingRef.current(); }
      },
      next: () => {
        // Combo training: pull a fresh combo immediately (generateTask handles
        // isTraining && currentStyle === stat, speaks it, resets repeat count).
        if (isTraining && currentStyle) generateTask(currentStyle);
        // HIIT timer: skip the current round by zeroing the clock — the timer
        // interval advances to the next phase naturally.
        else if (timerActive) setTimeRemaining(0);
      },
      timerActive,
      isTraining,
    };
  });
  const voiceCmdActive = () => voiceCmdHandlersRef.current.timerActive || voiceCmdHandlersRef.current.isTraining;
  const startVoiceListening = useCallback(async () => {
    if (!SpeechRecognition) return;
    try {
      const perm = await SpeechRecognition.requestPermissionsAsync();
      if (!perm.granted) return;
      const available = await SpeechRecognition.isRecognitionAvailable();
      if (!available) return;
      SpeechRecognition.start({
        lang: 'en-US',
        interimResults: false,
        continuous: true,
        requiresOnDeviceRecognition: false,
      });
    } catch (e) { console.log('voice start error', e); }
  }, [SpeechRecognition]);
  // Manual native listeners (no hooks — the hooks import the native module
  // eagerly and would crash Expo Go at module load). Registered once, route
  // through refs so handlers always see fresh state.
  useEffect(() => {
    if (!SpeechRecognition) return;
    const onResult = (event) => {
      const text = (event.results && event.results[0] && event.results[0].transcript || '').toLowerCase().trim();
      if (!text) return;
      // "stop"/"halt"/"quit"/"end"/"enough" → stop the session
      if (/\b(stop|halt|quit|end|enough|finish)\b/.test(text)) {
        hapticIf('medium');
        voiceCmdHandlersRef.current.stop && voiceCmdHandlersRef.current.stop();
      } else if (/\b(next|skip|again|another|more|change)\b/.test(text)) {
        hapticIf('light');
        voiceCmdHandlersRef.current.next && voiceCmdHandlersRef.current.next();
      }
    };
    const onEnd = () => {
      // Recognizer can end on its own — restart while the session is active.
      if (voiceCommands && voiceCmdActive()) {
        SpeechRecognition.stop && SpeechRecognition.stop();
        setTimeout(() => { if (voiceCommands && voiceCmdActive()) startVoiceListening(); }, 300);
      } else {
        SpeechRecognition.stop && SpeechRecognition.stop();
      }
    };
    const subs = [
      SpeechRecognition.addListener('result', onResult),
      SpeechRecognition.addListener('end', onEnd),
    ];
    return () => { subs.forEach(s => { try { s.remove(); } catch (e) {} }); };
  }, [SpeechRecognition, voiceCommands, startVoiceListening]);
  // Start/stop recognition when the toggle or session state changes.
  useEffect(() => {
    if (!SpeechRecognition) return;
    if (!voiceCommands || (!timerActive && !isTraining)) {
      SpeechRecognition.stop && SpeechRecognition.stop();
      setVoiceCmdListening(false);
      return;
    }
    setVoiceCmdListening(true);
    startVoiceListening();
    return () => { SpeechRecognition.stop && SpeechRecognition.stop(); setVoiceCmdListening(false); };
  }, [SpeechRecognition, voiceCommands, timerActive, isTraining, startVoiceListening]);

  // ---------- Voice pack application ----------
  const effectiveSpeechRate = useMemo(() => {
    const pack = VOICE_PACKS.find(p => p.id === voicePack);
    return pack && pack.rate != null ? pack.rate : speechRate;
  }, [voicePack, speechRate]);
  const effectiveSpeechPitch = useMemo(() => {
    const pack = VOICE_PACKS.find(p => p.id === voicePack);
    return pack && pack.pitch != null ? pack.pitch : speechPitch;
  }, [voicePack, speechPitch]);

  const [reviewRequested, setReviewRequested] = usePersistedState('reviewRequested', false);
  // BUG3: ref mirrors session count so the review gate reads the POST-update count,
  // and a pending flag prevents double requestReview when sessions land close together
  const sessionsCountRef = useRef(0);
  const reviewPendingRef = useRef(false);
  useEffect(() => { sessionsCountRef.current = sessions.length; }, [sessions]);
  // Native Play Store review sheet — ask once, after 3+ completed sessions
  const maybeRequestReview = async () => {
    if (reviewRequested) return;
    if (reviewPendingRef.current) return;
    if (sessionsCountRef.current < 3) return;
    reviewPendingRef.current = true;
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        setReviewRequested(true);
      }
    } catch (e) { console.log('review request error', e); }
    finally { reviewPendingRef.current = false; }
  };

  // ---------- Session logging + calories (MET-based) ----------
  // BUG10: local-date strings, not UTC (toISOString shifts late-evening workouts
  // to the next day in the Americas, breaking streaks + monthly stats)
  const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = () => localDateStr(new Date());
  const METS = { 'Boxing': 8, 'Kickboxing': 9, 'Muay Thai': 10, 'MMA': 9, 'Combat Sambo': 9, 'BJJ': 8, 'Wrestling': 8, 'Judo': 8, 'Taekwondo': 9, 'Karate': 8 };
  const logSession = (style, type, seconds, roundsDone) => {
    const met = METS[style] || 8;
    const hours = seconds / 3600;
    const kcal = Math.round(met * weightKg * hours);
    const entry = {
      date: todayStr(),
      style, type, seconds, rounds: roundsDone, kcal,
    };
    const isFirstSession = sessions.length === 0;
    setSessions(prev => [...prev.slice(-199), entry]);
    track('session_completed', { style, type, seconds, rounds: roundsDone, kcal });

    // ---------- Gamification hooks ----------
    const rounds = roundsDone || 0;
    if (rounds > 0) {
      addXp(rounds * XP_PER_ROUND + XP_PER_SESSION, { badge: isFirstSession ? 'first_workout' : null });
      if (isFirstSession) recordWorkout();
      // Badges: combo milestones
      const newTotal = combosCompleted + rounds;
      if (newTotal >= 100) earnBadge('combos_100');
      if (newTotal >= 500) earnBadge('combos_500');
    }
    // Streak badges + freeze milestones are handled by the streak-watch effect
    // below (the value here is stale until the workout-date state lands).
    // Weekly goal badge
    if (weekRounds + rounds >= WEEKLY_GOAL_ROUNDS && !weeklyGoalMet[weekKey()]) {
      setWeeklyGoalMet(prev => ({ ...prev, [weekKey()]: true }));
      earnBadge('weekly_goal');
    }

    // ---------- Day-0 paywall: once, right after the first real session ----------
    if (isFirstSession && rounds > 0 && !day0PaywallShown && !effectivePro) {
      setDay0PaywallShown(true);
      setTimeout(() => {
        setPendingProAction('full library');
        setPaywallVisible(true);
        track('day0_paywall_shown');
      }, 3000);
    }

    // Re-schedule the re-engagement reminder after every session
    scheduleReminder();

    // Ask for a review after the session lands (only once, after 3+ sessions)
    setTimeout(() => { maybeRequestReview(); }, 2500);
  };
  const totalKcal = sessions.reduce((sum, s) => sum + (s.kcal || 0), 0);
  const totalWorkoutSeconds = sessions.reduce((sum, s) => sum + (s.seconds || 0), 0);
  const combosCompleted = sessions.reduce((sum, s) => sum + (s.rounds || 0), 0);
  const monthKey = todayStr().slice(0, 7);
  const monthlyCombos = sessions.filter(s => (s.date || '').slice(0, 7) === monthKey).reduce((sum, s) => sum + (s.rounds || 0), 0);

  // ---------- Combo modifiers (defensive / stance / target zones) ----------
  // Coach's fix: defensive moves are NOT chain prependers — Slip/Roll/Duck/Pivot are
  // REACTIVE cues (between-repeat reminders), not active techniques to prepend to a combo.
  // Target modifiers still apply as suffixes. Stance switches apply between combos, not inside them.
  const applyModifiers = (combo) => {
    if (!modifiersEnabled || !combo) return combo;
    let out = combo;
    // Only suffix targets — "to the body" / "to the liver" / etc.
    if (Math.random() < 0.4) {
      const target = COMBO_MODIFIERS.target[Math.floor(Math.random() * COMBO_MODIFIERS.target.length)];
      out = out + ' (' + target + ')';
    }
    return out;
  };

  // ---------- Program apply ----------
  const applyProgram = (program) => {
    hapticIf('medium');
    // Programs load a style — locked styles must stay gated here too.
    if (requireStyle(program.style)) return;
    setActiveProgram(program.id);
    setTotalRounds(program.rounds);
    setWorkPeriod(program.work);
    setHiitRestPeriod(program.rest);
    setDifficultyFilter('all');
    setSelectedCategory(program.style);
  };

  // Custom styles: { name: [combo, ...] }
  const [customStyles, setCustomStyles] = usePersistedState('customStyles', {});
  const [styleOrder, setStyleOrder] = usePersistedState('styleOrder', null);
  // Favorites: array of `${category}::${task}`
  const [favorites, setFavorites] = usePersistedState('favorites', []);

  // UI / session state
  const [isTraining, setIsTraining] = useState(false);
  const [isDrilling, setIsDrilling] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(null);
  const [drillTask, setDrillTask] = useState(null);
  const [trainingInterval, setTrainingInterval] = useState(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  // Help / how-to modal
  const [helpVisible, setHelpVisible] = useState(false);
  // UX: first-run onboarding — show the "Start my first workout" CTA until a task exists
  const [onboardDismissed, setOnboardDismissed] = usePersistedState('onboardDismissed', false);
  const isFirstRun = !onboardDismissed && Object.keys(generatedTasks).length === 0;
  // Arsenal view: only show favorites
  const [arsenalView, setArsenalView] = usePersistedState('arsenalView', false);
  // Learn mode: { style, combo, visible }
  const [learnModal, setLearnModal] = useState({ visible: false, style: null, combo: null });
  // Combo builder: { visible, style, sequence }
  const [builder, setBuilder] = useState({ visible: false, style: null, sequence: [] });

  // Timer state (ref-based)
  const timerRef = useRef({ mode: 'rest', round: 1, remaining: 0 });
  const [timerMode, setTimerMode] = useState('rest');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  // Speech queue
  const [speechQueue, setSpeechQueue] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(false);

  // Animation
  const taskOpacity = useRef(new Animated.Value(0)).current;
  const currentTaskRef = useRef(null);
  const repeatCounterRef = useRef(0);
  const sessionStartRef = useRef(null);
  const sessionRoundsRef = useRef(0);
  // Cadence: keep combo rest period in sync when a non-custom cadence is active
  const cadenceGap = CADENCES.find(c => c.id === cadence);
  const effectiveComboRest = cadenceGap && cadenceGap.gap != null ? cadenceGap.gap : comboRestPeriod;

  // All styles = built-in + custom
  const allStyles = useMemo(() => {
    const merged = { ...taskDifficulties };
    Object.entries(customStyles).forEach(([name, combos]) => {
      if (Array.isArray(combos)) {
        const obj = {};
        combos.forEach((c, i) => { obj[i + 1] = c; });
        merged[name] = obj;
      }
    });
    return merged;
  }, [customStyles]);

  const orderedStyles = useMemo(() => {
    const names = styleOrder && styleOrder.length ? styleOrder : Object.keys(allStyles);
    return names.filter(n => allStyles[n]);
  }, [styleOrder, allStyles]);

  // Display text with southpaw swap applied
  const displayText = (text) => southpaw ? swapStance(text) : text;

  const isFavorite = (category, task) => favorites.includes(`${category}::${task}`);
  const toggleFavorite = (category, task) => {
    hapticIf('medium');
    const key = `${category}::${task}`;
    setFavorites(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // ---------- Streak ----------
  const yesterdayStr = () => {
    const d = new Date(); d.setDate(d.getDate() - 1); return localDateStr(d);
  };
  const streak = useMemo(() => {
    const dates = new Set(workoutDates);
    let count = 0;
    let cursor = todayStr();
    if (!dates.has(cursor)) cursor = yesterdayStr();
    while (dates.has(cursor)) {
      count += 1;
      // BUG10: parse YYYY-MM-DD as LOCAL midnight (new Date('YYYY-MM-DD') is UTC
      // midnight — in the Americas it's already the previous day, breaking the count)
      const [y, m, d] = cursor.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - 1);
      cursor = localDateStr(dt);
    }
    return count;
  }, [workoutDates]);

  // Streak watch: award streak badges + grant a freeze at every 7-day milestone
  useEffect(() => {
    if (streak <= 0) return;
    if (streak >= 3) earnBadge('streak_3');
    if (streak >= 7) earnBadge('streak_7');
    if (streak >= 30) earnBadge('streak_30');
    maybeGrantFreeze(streak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  // On open: after persisted state rehydrates, consume a freeze if yesterday
  // was missed and schedule the re-engagement reminder. Deferred so
  // usePersistedState has resolved (local AsyncStorage is fast). The
  // permission prompt only fires for users with workout history — never on a
  // cold first launch.
  useEffect(() => {
    const t = setTimeout(() => {
      maybeConsumeFreeze();
      if (sessions.length > 0) scheduleReminder();
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordWorkout = () => {
    const today = todayStr();
    setWorkoutDates(prev => prev.includes(today) ? prev : [...prev, today]);
  };

  // ---------- Gamification: XP, levels, badges, streak freezes, weekly goal ----------
  const XP_PER_ROUND = 10;
  const XP_PER_SESSION = 25;
  const WEEKLY_GOAL_ROUNDS = 50;
  const BADGES = [
    { id: 'first_workout', label: 'First Blood', desc: 'Complete your first session', icon: 'flame' },
    { id: 'streak_3', label: 'On A Roll', desc: '3-day streak', icon: 'flash' },
    { id: 'streak_7', label: 'Week Warrior', desc: '7-day streak', icon: 'calendar' },
    { id: 'streak_30', label: 'Unstoppable', desc: '30-day streak', icon: 'trophy' },
    { id: 'combos_100', label: 'Century Club', desc: '100 combos completed', icon: 'stats-chart' },
    { id: 'combos_500', label: 'Heavy Hitter', desc: '500 combos completed', icon: 'ribbon' },
    { id: 'weekly_goal', label: 'Goal Crusher', desc: 'Hit your weekly goal', icon: 'flag' },
  ];
  const levelFromXp = (total) => Math.floor(total / 250) + 1;
  const level = levelFromXp(xp);

  const earnBadge = (badgeId) => {
    if (!BADGES.some(b => b.id === badgeId)) return;
    setBadges(prev => {
      if (prev.includes(badgeId)) return prev;
      track('badge_earned', { badge: badgeId });
      hapticIf('medium');
      return [...prev, badgeId];
    });
  };

  const addXp = (amount, opts = {}) => {
    setXp(prev => prev + amount);
    if (opts.badge) earnBadge(opts.badge);
  };

  // Grant streak milestones: +1 freeze every 7-day streak (7, 14, 21…)
  // Milestones map: which streak lengths already granted a freeze
  const [freezeMilestones, setFreezeMilestones] = usePersistedState('freezeMilestones', []);
  const maybeGrantFreeze = (streakCount) => {
    if (streakCount > 0 && streakCount % 7 === 0) {
      const key = `s${streakCount}`;
      setFreezeMilestones(prev => {
        if (prev.includes(key)) return prev;
        const next = [...prev, key];
        setStreakFreezes(f => f + 1);
        track('streak_freeze_granted', { streak: streakCount });
        return next;
      });
    }
  };

  // Auto-consume a freeze for yesterday if the streak would have broken and we
  // have one available. Call on app open / after a missed-day gap is detected.
  const maybeConsumeFreeze = () => {
    const dates = new Set(workoutDates);
    const today = todayStr();
    const yest = yesterdayStr();
    // Streak would break only if yesterday is missing but the day before isn't.
    if (!dates.has(today) && !dates.has(yest)) {
      const twoDays = localDateStr(new Date(new Date().getTime() - 2 * 86400000));
      if (dates.has(twoDays) && freezeUsedFor !== yest && streakFreezes > 0) {
        setFreezeUsedFor(yest);
        setStreakFreezes(f => f - 1);
        setWorkoutDates(prev => prev.includes(yest) ? prev : [...prev, yest]);
        track('streak_freeze_used', { date: yest });
      }
    }
  };

  // Weekly goal: rounds completed in the current calendar week (Mon–Sun)
  const weekKey = () => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Mon=0
    const mon = new Date(now); mon.setDate(now.getDate() - day);
    return localDateStr(mon);
  };
  const weekRounds = sessions.filter(s => {
    const wk = weekKey();
    const date = s.date || '';
    return date >= wk && date <= todayStr();
  }).reduce((sum, s) => sum + (s.rounds || 0), 0);
  const weeklyGoalPct = Math.min(100, Math.round((weekRounds / WEEKLY_GOAL_ROUNDS) * 100));

  // ---------- Push notifications (re-engagement, Day 4-7 cohort) ----------
  // expo-notifications has native modules that requireNativeModule() eagerly
  // (e.g. ExpoNotificationScheduler) — probe availability first so Expo Go or
  // web never crashes; the feature just no-ops.
  const notificationsAvailable = (() => {
    try {
      const { TurboModuleRegistry } = require('react-native');
      return TurboModuleRegistry.get('ExpoNotificationScheduler') != null;
    } catch (e) {
      return false;
    }
  })();
  const getNotifications = () => {
    if (!notificationsAvailable) return null;
    try {
      return require('expo-notifications');
    } catch (e) {
      return null;
    }
  };
  const [reminderEnabled, setReminderEnabled] = usePersistedState('reminderEnabled', true);
  const scheduleReminder = async (opts = {}) => {
    if (!reminderEnabled) return;
    const Notifications = getNotifications();
    if (!Notifications) return;
    try {
      const perm = await Notifications.getPermissionsAsync();
      // Only request permission on explicit user intent (toggle ON). Background
      // auto-scheduling (e.g. AppState auto-stop) never prompts — it just skips
      // silently if the user hasn't already granted access.
      if (!perm.granted) {
        if (!opts.requestPermission) return;
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      // Nudge the Day 4-7 converter: 24h from now if no workout today.
      if (!workoutDates.includes(todayStr())) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Your gloves are waiting 🥊',
            body: streak > 0 ? `Keep your ${streak}-day streak alive — one round is all it takes.` : 'One quick round today keeps the momentum going.',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 86400, repeats: false },
        });
      }
    } catch (e) { /* notifications are best-effort */ }
  };

  // ---------- Curriculum ----------
  const learnedCount = (style) => curriculumProgress[style] || 0;
  const learnedTechniques = (style) => (CURRICULUM[style] || []).slice(0, learnedCount(style));
  const nextTechnique = (style) => {
    const list = CURRICULUM[style] || [];
    const idx = learnedCount(style);
    return idx < list.length ? list[idx] : null;
  };
  const curriculumTotal = (style) => (CURRICULUM[style] || []).length;
  const markTechniqueLearned = (style) => {
    hapticIf('medium');
    setCurriculumProgress(prev => {
      const list = CURRICULUM[style] || [];
      const next = Math.min((prev[style] || 0) + 1, list.length);
      return { ...prev, [style]: next };
    });
  };

  // ---------- Speech queue ----------
  useEffect(() => {
    const processSpeechQueue = async () => {
      if (speechQueue.length > 0 && !isSpeaking) {
        setIsSpeaking(true);
        const speechItem = speechQueue[0];
        try {
          const rate = speechItem.type === 'combo' ? effectiveSpeechRate * 0.8 : effectiveSpeechRate;
          const speakText = speechItem.text.replace(/\s*[>→]\s*/g, ', ').replace(/\s+/g, ' ').trim();
          // Technique/coaching uses the technique voice; combos/timer use the command voice
          const voice = speechItem.type === 'technique' ? techniqueVoice : speechVoice;
          await Speech.speak(speakText, {
            rate,
            pitch: effectiveSpeechPitch,
            ...(voice ? { voice } : {}),
            onDone: () => { setSpeechQueue(prev => prev.slice(1)); setIsSpeaking(false); },
            onError: () => { setSpeechQueue(prev => prev.slice(1)); setIsSpeaking(false); }
          });
        } catch (error) {
          console.log('Speech error:', error);
          setIsSpeaking(false);
          // Visible feedback instead of silent failure — the user needs to know
          // the voice isn't working (e.g. no TTS engine installed on device)
          setSpeechError(true);
          setSpeechQueue(prev => prev.slice(1));
        }
      }
    };
    processSpeechQueue();
  }, [speechQueue, isSpeaking, effectiveSpeechRate, effectiveSpeechPitch, speechVoice, techniqueVoice]);

  const addToSpeechQueue = useCallback((text, type = 'timer') => {
    const shouldAdd = type === 'timer' ? !timerSpeechPaused : !comboSpeechPaused;
    if (!shouldAdd) return;
    setSpeechQueue(prev => {
      if (type === 'combo' || type === 'technique') {
        // Voice-queue race fix: a NEW combo must REPLACE stale combo/technique
        // announcements (they'd otherwise be spoken after the display already
        // moved on — user hears an outdated combo). Timer callouts ("Round 2",
        // "Rest now") are kept so the round structure still announces.
        //
        // But REPEATS of the SAME combo (Repeats Per Combo > 1) must be QUEUED
        // behind the in-flight announcement — replacing there swallows the
        // repeat and the coach goes silent for the rest of the set.
        const lastCombo = [...prev].reverse().find(i => i.type === 'combo' || i.type === 'technique');
        if (lastCombo && lastCombo.text === text) {
          return [...prev, { text, type }];
        }
        const kept = prev.filter(i => i.type === 'timer');
        return [{ text, type }, ...kept];
      }
      return [...prev, { text, type }];
    });
  }, [timerSpeechPaused, comboSpeechPaused]);

  const speakCombination = useCallback((combination) => {
    addToSpeechQueue(combination, 'combo');
    return true;
  }, [addToSpeechQueue]);

  // BUG4: ref mirrors speakCombination so the training interval always calls the
  // LATEST closure (mid-session pause toggles take effect immediately, not next session)
  const speakCombinationRef = useRef(speakCombination);
  useEffect(() => { speakCombinationRef.current = speakCombination; }, [speakCombination]);
  const speakFormCueRef = useRef(null);
  useEffect(() => { speakFormCueRef.current = speakFormCue; });

  // Form cue between sets: speak a random technique cue for the current style
  const speakFormCue = (style) => {
    if (!formCuesEnabled) return;
    const list = CURRICULUM[style] || [];
    const learned = learnedTechniques(style);
    const pool = learned.length > 0 ? learned : list;
    if (pool.length === 0) return;
    const name = pool[Math.floor(Math.random() * pool.length)];
    const tech = TECHNIQUES[style] && TECHNIQUES[style][name];
    if (tech && tech.cue) {
      addToSpeechQueue(`Form: ${tech.cue}`, 'technique');
    }
  };

  const loadAvailableVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const english = voices.filter(v => (v.language || '').toLowerCase().startsWith('en'));
      const seen = new Set();
      const deduped = english.filter(v => {
        const key = v.name || v.identifier || '';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setAvailableVoices(deduped.length > 0 ? deduped : voices);
    } catch (error) {
      console.log('Error loading voices:', error);
    }
  };

  // Friendly voice label: "en-us-x-tpf-local" → "English (US)", "Google US English" stays as-is
  const voiceLabel = (voice) => {
    const raw = (voice.name || voice.identifier || '').trim();
    if (!raw) return 'Default';
    let gender = '';
    // Detect gender from the name/identifier (Google voices: "...Female", "...Male", or
    // identifier variants like tpf = female, tpm = male)
    if (/\b(female|feminine)\b/i.test(raw)) gender = ' ♀';
    else if (/\b(male|masculine)\b/i.test(raw)) gender = ' ♂';
    else if (/[-_](?:tpf|f|w)\b/i.test(raw.toLowerCase())) gender = ' ♀';
    else if (/[-_](?:tpm|m)\b/i.test(raw.toLowerCase())) gender = ' ♂';
    // If the name looks like a raw language code (e.g. en-us-x-tpf, en-US-female), decode it
    if (/^[a-z]{2,3}[-_][a-z]{2,3}([-_][a-z0-9]+)*$/i.test(raw)) {
      const langMap = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi' };
      const parts = raw.split(/[-_]/);
      const lang = langMap[(parts[0] || '').toLowerCase()] || parts[0];
      const region = (parts[1] || '').toUpperCase();
      const variant = parts.length > 2 ? parts[2] : '';
      let label = region ? `${lang} (${region})` : lang;
      if (variant && !/^(x|local|female|male)$/i.test(variant)) label += ` — ${variant}`;
      return label + gender;
    }
    // Replace identifier-ish suffixes and clean up
    return raw.replace(/_/g, ' ') + gender;
  };

  useEffect(() => {
    loadAvailableVoices();
    return () => { Speech.stop(); };
  }, []);

  // Validate persisted voices against what the device actually has — a stale
  // identifier (SDK migration, device change) makes Speech.speak error silently
  // and drain the queue → no voice. Fall back to the default engine voice.
  useEffect(() => {
    if (availableVoices.length === 0) return;
    const ids = new Set(availableVoices.map(v => v.identifier));
    if (speechVoice && !ids.has(speechVoice)) setSpeechVoice(null);
    if (techniqueVoice && !ids.has(techniqueVoice)) setTechniqueVoice(null);
  }, [availableVoices, speechVoice, techniqueVoice]);

  // ---------- HIIT / Drill timer ----------
  // Refs so the interval callback never closes over stale values
  const playCueSoundRef = useRef(playCueSound);
  const logSessionRef = useRef(logSession);
  const currentStyleRef = useRef(null);
  const drillTaskRef = useRef(null);
  useEffect(() => { playCueSoundRef.current = playCueSound; }, [playCueSound]);
  useEffect(() => { logSessionRef.current = logSession; }, [logSession]);
  useEffect(() => { currentStyleRef.current = currentStyle; }, [currentStyle]);
  useEffect(() => { drillTaskRef.current = drillTask; }, [drillTask]);

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      const s = timerRef.current;
      let next = s.remaining - 1;
      let mode = s.mode;
      let round = s.round;
      let active = true;
      const curStyle = currentStyleRef.current;
      const curDrill = drillTaskRef.current;

      if (s.remaining <= 1) {
        if (s.mode === 'work') {
          if (s.round >= totalRounds) {
            addToSpeechQueue("Workout complete!", 'timer');
            hapticIf('heavy');
            playCueSoundRef.current();
            active = false;
            round = 1;
            next = 0;
            recordWorkout();
            logSessionRef.current(curStyle || curDrill ? (curStyle || 'Drill') : 'HIIT', isDrilling ? 'drill' : 'hiit', workPeriod * s.round, s.round);
          } else {
            mode = 'rest';
            addToSpeechQueue("Rest now", 'timer');
            hapticIf('light');
            playCueSoundRef.current();
            next = hiitRestPeriod;
          }
        } else {
          mode = 'work';
          round = s.round + 1;
          hapticIf('medium');
          playCueSoundRef.current();
          if (isDrilling && curDrill) {
            addToSpeechQueue(displayText(curDrill), 'combo');
          }
          addToSpeechQueue(`Round ${round}`, 'timer');
          next = workPeriod;
        }
      } else if (next <= 3 && next > 0) {
        addToSpeechQueue(String(next), 'timer');
        hapticIf('light');
        playCueSoundRef.current();
      }

      timerRef.current = { mode, round, remaining: next };
      setTimerMode(mode);
      setCurrentRound(round);
      setTimeRemaining(next);
      if (!active) {
        setKeepAwake(false);
        setTimerActive(false);
        setIsDrilling(false);
        setDrillTask(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, workPeriod, hiitRestPeriod, totalRounds, isDrilling, addToSpeechQueue, formCuesEnabled, southpaw]);

  const startHiitTimer = () => {
    hapticIf('medium');
    if (isTraining) stopTrainingSession();
    setKeepAwake(true);
    timerRef.current = { mode: 'work', round: 1, remaining: workPeriod };
    setTimerMode('work');
    setCurrentRound(1);
    setTimeRemaining(workPeriod);
    setTimerActive(true);
    addToSpeechQueue("Starting workout. Round 1", 'timer');
  };

  const stopHiitTimer = () => {
    hapticIf('light');
    setKeepAwake(false);
    setTimerActive(false);
    setIsDrilling(false);
    setDrillTask(null);
    timerRef.current = { mode: 'rest', round: 1, remaining: 0 };
    setTimeRemaining(0);
    Speech.stop();
  };

  // Drill mode: repeat ONE combo for totalRounds rounds
  const startDrill = (style, task) => {
    hapticIf('medium');
    if (requireStyle(style)) return;
    if (isTraining) stopTrainingSession();
    if (timerActive) stopHiitTimer();  // BUG1: don't silently kill an active HIIT session
    setKeepAwake(true);
    track('drill_started', { style });
    setDrillTask(task);
    setIsDrilling(true);
    timerRef.current = { mode: 'work', round: 1, remaining: workPeriod };
    setTimerMode('work');
    setCurrentRound(1);
    setTimeRemaining(workPeriod);
    setTimerActive(true);
    addToSpeechQueue(displayText(task), 'combo');
    addToSpeechQueue('Drill. Round 1', 'timer');
  };

  // ---------- Combo training session ----------
  const startTrainingSession = (style) => {
    hapticIf('medium');
    if (requireStyle(style)) return;
    if (timerActive) stopHiitTimer();
    setKeepAwake(true);
    // BUG2: clear any orphaned interval from a prior double-tap before arming a new one
    if (trainingInterval) {
      clearInterval(trainingInterval);
      setTrainingInterval(null);
    }
    setIsTraining(true);
    setCurrentStyle(style);
    currentTaskRef.current = null;
    repeatCounterRef.current = 0;
    sessionStartRef.current = Date.now();
    sessionRoundsRef.current = 0;

    const generateAndSpeak = () => {
      if (!currentTaskRef.current || repeatCounterRef.current >= comboRepeatCount) {
        const rawTask = pickRandomTask(style, allStyles, difficultyFilter);
        if (!rawTask) {
          // BUG9/11: style deleted mid-session or no combos at this difficulty — stop cleanly
          Alert.alert('No combos available', `No ${difficultyFilter === 'all' ? '' : difficultyFilter + ' '}combos for ${style}. Stopping the session.`);
          stopTrainingSession();
          return;
        }
        const task = applyModifiers(rawTask);
        currentTaskRef.current = task;
        repeatCounterRef.current = 1;
        sessionRoundsRef.current += 1;
        setGeneratedTasks(prev => ({ ...prev, [style]: task }));
        animateTaskGeneration();
        speakCombinationRef.current(displayText(task));
      } else {
        repeatCounterRef.current += 1;
        sessionRoundsRef.current += 1;
        speakCombinationRef.current(displayText(currentTaskRef.current));
        // Form cue on every 3rd repeat of the same combo
        if (repeatCounterRef.current % 3 === 0 && speakFormCueRef.current) speakFormCueRef.current(style);
      }
    };

    generateAndSpeak();
    const interval = setInterval(generateAndSpeak, effectiveComboRest * 1000);
    setTrainingInterval(interval);
  };

  // Restart the training interval if cadence/rest period changes mid-session
  const lastGapRef = useRef(effectiveComboRest);
  useEffect(() => {
    if (!isTraining || !trainingInterval) return;
    if (lastGapRef.current === effectiveComboRest) return;
    lastGapRef.current = effectiveComboRest;
    clearInterval(trainingInterval);
    const style = currentStyleRef.current || currentStyle;
    const generateAndSpeak = () => {
      if (!currentTaskRef.current || repeatCounterRef.current >= comboRepeatCount) {
        const rawTask = pickRandomTask(style, allStyles, difficultyFilter);
        if (!rawTask) {
          // BUG9/11: same guard as the main training loop
          Alert.alert('No combos available', `No ${difficultyFilter === 'all' ? '' : difficultyFilter + ' '}combos for ${style}. Stopping the session.`);
          stopTrainingSession();
          return;
        }
        const task = applyModifiers(rawTask);
        currentTaskRef.current = task;
        repeatCounterRef.current = 1;
        sessionRoundsRef.current += 1;
        setGeneratedTasks(prev => ({ ...prev, [style]: task }));
        animateTaskGeneration();
        speakCombinationRef.current(displayText(task));
      } else {
        repeatCounterRef.current += 1;
        sessionRoundsRef.current += 1;
        speakCombinationRef.current(displayText(currentTaskRef.current));
        if (repeatCounterRef.current % 3 === 0 && speakFormCueRef.current) speakFormCueRef.current(style);
      }
    };
    const interval = setInterval(generateAndSpeak, effectiveComboRest * 1000);
    setTrainingInterval(interval);
  }, [effectiveComboRest, isTraining, trainingInterval, allStyles, difficultyFilter]);

  const stopTrainingSession = () => {
    if (!isTraining && !trainingInterval) return;  // BUG2: reentrancy guard — double-Stop must not double-log
    setKeepAwake(false);
    setIsTraining(false);
    recordWorkout();
    logSession(currentStyle || 'Training', 'combo', Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000), sessionRoundsRef.current || 0);
    Speech.stop();
    if (trainingInterval) {
      clearInterval(trainingInterval);
      setTrainingInterval(null);
    }
  };

  // BUG5: AppState — backgrounding mid-workout must stop sessions (JS timers throttle
  // in background → silent drift + stale workout on return). Auto-stop instead.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        if (timerActive && stopTimerRef.current) stopTimerRef.current();
        if (isTraining && stopTrainingRef.current) stopTrainingRef.current();
      }
    });
    return () => sub.remove();
  }, [timerActive, isTraining]);

  // BUG6: Android back during an active session — consume it and stop cleanly
  // (otherwise user exits/stalls silently with a running interval).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (timerActive) { stopTimerRef.current && stopTimerRef.current(); return true; }
      if (isTraining) { stopTrainingRef.current && stopTrainingRef.current(); return true; }
      return false; // let default (exit) happen when idle
    });
    return () => sub.remove();
  }, [timerActive, isTraining]);

  const generateTask = (stat) => {
    hapticIf('light');
    if (requireStyle(stat)) return;
    const rawTask = pickRandomTask(stat, allStyles, difficultyFilter);
    if (!rawTask) {
      // BUG9/11: no combo matches the filter (or style was deleted mid-session)
      Alert.alert('No combos available', `No ${difficultyFilter === 'all' ? '' : difficultyFilter + ' '}combos for ${stat}. Try a different difficulty or style.`);
      return;
    }
    const task = applyModifiers(rawTask);
    setGeneratedTasks(prev => ({ ...prev, [stat]: task }));
    // Sync fix: if the user refreshes while training THIS style, the voice must
    // announce the new combo (not keep saying the stale one). Reset the repeat
    // counter so the next interval tick speaks the refreshed combo.
    if (isTraining && currentStyle === stat) {
      currentTaskRef.current = task;
      repeatCounterRef.current = 0;
      sessionRoundsRef.current += 1;
      speakCombinationRef.current(displayText(task));
    }
    animateTaskGeneration();
  };

  const animateTaskGeneration = () => {
    taskOpacity.setValue(0);
    Animated.timing(taskOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleZoomIn = () => {
    hapticIf('light');
    const newFontSize = Math.min(fontSize + (fontSize * 0.1), width / 5);
    setFontSize(newFontSize);
  };
  const handleZoomOut = () => {
    hapticIf('light');
    const newFontSize = Math.max(fontSize - (fontSize * 0.1), 12);
    setFontSize(newFontSize);
  };

  // UX: first-run CTA — start the user with a Beginner Boxing combo: generate it,
  // voice it, open Learn mode, and mark onboarding done.
  const startFirstWorkout = () => {
    hapticIf('medium');
    setOnboardDismissed(true);
    setDifficultyFilter('beginner');
    setSelectedCategory('Boxing');
    const raw = pickRandomTask('Boxing', allStyles, 'beginner');
    if (!raw) { setDifficultyFilter('all'); return; }
    const task = applyModifiers(raw);
    setGeneratedTasks(prev => ({ ...prev, 'Boxing': task }));
    animateTaskGeneration();
    speakCombination(displayText(task));
    setLearnModal({ visible: true, style: 'Boxing', combo: task });
    track('onboarding_started', { style: 'Boxing' });
  };

  // ---------- Custom styles ----------
  const [customStyleName, setCustomStyleName] = useState('');
  const [customStyleCombos, setCustomStyleCombos] = useState('');
  const [isCustomStyleModalVisible, setIsCustomStyleModalVisible] = useState(false);

  const addCustomStyle = () => {
    if (!requirePro('custom_style')) return;
    const name = customStyleName.trim();
    const combos = customStyleCombos.split('\n').map(c => c.trim()).filter(Boolean);
    if (!name) { Alert.alert('Style name required'); return; }
    if (combos.length === 0) { Alert.alert('Add at least one combo'); return; }
    hapticIf('medium');
    track('custom_style_created', { name });
    setCustomStyles(prev => ({ ...prev, [name]: combos }));
    setCustomStyleName('');
    setCustomStyleCombos('');
    setIsCustomStyleModalVisible(false);
  };

  const deleteCustomStyle = (name) => {
    hapticIf('medium');
    // BUG8: deleting a custom style must not orphan its favorites
    setFavorites(prev => prev.filter(f => !f.startsWith(name + '::')));
    setCustomStyles(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // ---------- Combo builder ----------
  const builderTechniques = () => {
    if (!builder.style) return [];
    const techs = TECHNIQUES[builder.style] || {};
    return Object.keys(techs);
  };
  const openBuilder = (style) => {
    if (requireStyle(style)) return;
    setBuilder({ visible: true, style, sequence: [] });
  };
  const closeBuilder = () => setBuilder({ visible: false, style: null, sequence: [] });
  const builderAddTechnique = (name) => {
    hapticIf('light');
    setBuilder(prev => ({ ...prev, sequence: [...prev.sequence, name] }));
  };
  const builderRemoveLast = () => {
    hapticIf('light');
    setBuilder(prev => ({ ...prev, sequence: prev.sequence.slice(0, -1) }));
  };
  const builderSaveCombo = () => {
    if (builder.sequence.length === 0) return;
    if (!requirePro('combo_builder')) return;
    const combo = builder.sequence.map(n => {
      const tech = TECHNIQUES[builder.style] && TECHNIQUES[builder.style][n];
      return tech ? n.charAt(0).toUpperCase() + n.slice(1) : n;
    }).join(' > ');
    hapticIf('medium');
    track('combo_built', { style: builder.style });
    // Save to a "My Combos" custom style
    setCustomStyles(prev => ({
      ...prev,
      'My Combos': [...(prev['My Combos'] || []), combo],
    }));
    setGeneratedTasks(prev => ({ ...prev, [builder.style]: combo }));
    closeBuilder();
    Alert.alert('Combo saved', `Added to "My Combos": ${combo}`);
  };

  // ---------- Learn mode ----------
  const learnMoves = () => {
    if (!learnModal.combo) return [];
    // Feature-intersection fix: strip the modifier prefix ("Slip, Switch stance - ")
    // before splitting, so Learn Mode sees the real combo moves — not broken
    // fragments from comma-separated modifiers (mirrors comboLevelOf's recovery).
    const baseCombo = learnModal.combo.replace(/^.*? - (?=[A-Za-z])/, '');
    // Build a normalized-key lookup so irregular keys match: "O Goshi (Major Hip Throw)"
    // -> norm "o goshi" -> finds key "ogoshi" or "seoi nage" regardless of spacing.
    // Keys are registered under BOTH the spaced and collapsed forms.
    const buildLookup = (dict) => {
      const map = {};
      Object.keys(dict || {}).forEach(k => {
        const n = normalizeMove(k);
        map[n] = dict[k];
        map[n.replace(/ /g, '')] = dict[k];
      });
      return map;
    };
    const styleTechs = TECHNIQUES[learnModal.style] || {};
    const styleLookup = buildLookup(styleTechs);
    const sharedLookup = buildLookup(SHARED_TECHNIQUES);
    const tryMatch = (candidate) => {
      if (!candidate) return null;
      return styleLookup[candidate] || sharedLookup[candidate] ||
             styleLookup[candidate.replace(/ /g, '')] || sharedLookup[candidate.replace(/ /g, '')];
    };
    return splitCombo(baseCombo).map(move => {
      const norm = normalizeMove(move);
      let tech = tryMatch(norm);
      // Fallbacks: strip 'double/single' prefixes, or try the first two words
      if (!tech) {
        const stripped = norm.replace(/^(double|single|triple)\s+/, '');
        tech = tryMatch(stripped);
      }
      if (!tech) {
        const firstTwo = norm.split(' ').slice(0, 2).join(' ');
        tech = tryMatch(firstTwo);
      }
      return { move, norm, tech };
    });
  };

  // ---------- Style reorder ----------
  const moveStyle = (index, dir) => {
    hapticIf('light');
    setStyleOrder(prev => {
      const list = (prev && prev.length ? prev : Object.keys(allStyles)).filter(n => allStyles[n]);
      const target = index + dir;
      if (target < 0 || target >= list.length) return prev;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateSetting = (setter, value) => {
    hapticIf('light');
    setter(value);
  };

  // ---------- UI ----------
  const TimerDisplay = () => {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    const workColor = isDrilling ? theme.test : theme.danger;

    return (
      <View style={styles.timerContainer}>
        {isDrilling && <Text style={[styles.drillBadge, { color: theme.test }]}>DRILL MODE</Text>}
        <View style={[styles.timerCircle, { borderColor: timerMode === 'work' ? workColor : theme.success }]}>
          <Text style={[styles.timerText, { color: timerMode === 'work' ? workColor : theme.success }]}>
            {formatTime(timeRemaining)}
          </Text>
          <Text style={styles.timerModeText}>
            {timerActive ? (timerMode === 'work' ? 'WORK' : 'REST') : 'READY'}
          </Text>
        </View>
        <Text style={styles.roundsText}>
          Round {currentRound}/{totalRounds}
        </Text>
        {isDrilling && drillTask ? (
          <View style={styles.drillTaskBox}>
            <Text style={[styles.drillTaskText, { fontSize }]}>{displayText(drillTask)}</Text>
          </View>
        ) : null}
        <View style={styles.timerControls}>
          {!timerActive ? (
            <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.success }]} onPress={startHiitTimer}>
              <Ionicons name="play" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.danger }]} onPress={stopHiitTimer}>
              <Ionicons name="stop" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ---------- Visual combo preview strip (move chips flow) ----------
  const ComboPreview = ({ combo, styleName }) => {
    if (!combo) return null;
    // Feature-intersection fix: strip modifier prefix before splitting so the
    // chips show real moves, not "Switch stance - Jab" fragments
    const baseCombo = combo.replace(/^.*? - (?=[A-Za-z])/, '');
    const moves = splitCombo(baseCombo);
    if (moves.length < 2) return null;
    return (
      <View style={styles.previewStrip}>
        {moves.map((move, idx) => (
          <View key={idx} style={styles.previewStep}>
            <View style={[styles.previewChip, { backgroundColor: theme.taskContainer, borderColor: theme.accent }]}>
              <Text style={[styles.previewChipText, { color: theme.text }]}>{displayText(move)}</Text>
            </View>
            {idx < moves.length - 1 && (
              <Ionicons name="arrow-forward" size={14} color={theme.accent} style={styles.previewArrow} />
            )}
          </View>
        ))}
      </View>
    );
  };

  // ---------- Share / export combo (native share + QR) ----------
  const [shareModal, setShareModal] = useState({ visible: false, combo: null, styleName: null });
  const shareCombo = async (combo, styleName) => {
    if (!combo) return;
    try {
      const message = `MyCombat — ${styleName} combo:\n\n${combo}\n\nTrain it with MyCombat: voice-guided combos, rounds, drills.`;
      await Share.share({ message });
    } catch (e) { console.log('share error', e); }
  };
  const showQR = (combo, styleName) => {
    hapticIf('light');
    setShareModal({ visible: true, combo, styleName });
  };
  const exportProgram = async (program) => {
    try {
      const message = `MyCombat program: ${program.name}\n${program.style} · ${program.rounds} rounds · ${program.work}s work / ${program.rest}s rest\n${program.desc}`;
      await Share.share({ message });
    } catch (e) { console.log('share error', e); }
  };

  const comboLevelOf = (cat, task) => {
    if (!task) return 1;
    const levels = allStyles[cat] || {};
    // Exact match first (unmodified combo)
    const exact = Object.keys(levels).find(l => levels[l] === task);
    if (exact) return Number(exact);
    // Modified combos: strip "Slip, Switch stance - " prefix and "(to the body)" suffix,
    // then try to match against the raw catalog to recover the true difficulty
    let stripped = task.replace(/^[^>→,]*-\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const byStripped = Object.keys(levels).find(l => levels[l] === stripped);
    if (byStripped) return Number(byStripped);
    // Combo builder output ("Jab > Cross > Hook") won't match either; try prefix match on first move
    const firstMove = stripped.split(/\s*(?:>|→|,)\s*/)[0];
    for (const l of Object.keys(levels)) {
      if (String(levels[l]).split(/\s*(?:>|→|,)\s*/)[0] === firstMove) return Number(l);
    }
    return 1;
  };
  const difficultyColor = (cat, task) => {
    const diff = difficultyOf(cat, comboLevelOf(cat, task));
    return diff === 'beginner' ? theme.success : diff === 'intermediate' ? '#FB923C' : theme.danger;
  };

  const CategoryCard = ({ category, dragHandlers }) => {
    const task = generatedTasks[category] || null;
    const isSelected = selectedCategory === category;
    const locked = isStyleLocked(category);
    const cardScale = useRef(new Animated.Value(1)).current;
    const fav = isFavorite(category, task);
    const learnCount = learnedCount(category);
    const total = curriculumTotal(category);
    // BUG8: arsenal shows the card if the STYLE has any favorites (not just the
    // current random task) — otherwise refresh hides favorited cards and "No favorites"
    // displays while favorites exist.
    const categoryHasFavorites = favorites.some(f => f.startsWith(category + '::'));
    const showCard = arsenalView ? categoryHasFavorites : true;

    useEffect(() => {
      Animated.spring(cardScale, { toValue: isSelected ? 1.05 : 1, friction: 3, useNativeDriver: true }).start();
    }, [isSelected]);

    if (!showCard) return null;

    return (
      <TouchableOpacity
        onPress={() => {
          hapticIf('light');
          if (locked) { requirePro(category); return; }
          setSelectedCategory(category);
        }}
        onLongPress={dragHandlers && dragHandlers.onLongPress}
        onPressOut={dragHandlers && dragHandlers.onPressOut}
        delayLongPress={280}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.categoryCard, { transform: [{ scale: cardScale }], backgroundColor: isSelected ? theme.cardBgSelected : theme.cardBg }]}>
          <LinearGradient
            colors={isSelected ? theme.cardGradSelected : theme.cardGradNormal}
            style={styles.categoryGradient}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleGroup}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                {locked ? (
                  <View style={styles.lockedBadgeRow}>
                    <Ionicons name="lock-closed" size={13} color={theme.accent} />
                    <Text style={[styles.lockedBadgeText, { color: theme.accent }]}>PRO</Text>
                  </View>
                ) : total > 0 && (
                  <Text style={[styles.progressText, { color: theme.textMuted }]}>
                    Learned {learnCount}/{total}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.favButton}
                accessibilityRole="button"
                accessibilityLabel={locked ? `Unlock ${category}` : fav ? `Remove ${category} from favorites` : `Add ${category} to favorites`}
                onPress={() => { if (locked) { requirePro(category); return; } task && toggleFavorite(category, task); }}
              >
                <Ionicons name={locked ? 'lock-closed' : fav ? 'star' : 'star-outline'} size={22} color={locked ? theme.accent : fav ? '#FFD700' : theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.taskContainer, { backgroundColor: theme.taskContainer }]}>
              {locked ? (
                <View style={styles.lockedContainer}>
                  <Ionicons name="lock-closed" size={22} color={theme.accent} />
                  <Text style={[styles.lockedText, { color: theme.textMuted }]}>
                    {Object.keys(allStyles[category] || {}).length} combos — unlock with Pro
                  </Text>
                </View>
              ) : (
                <>
                  {task && (
                    <View style={styles.diffRow}>
                      <View style={[styles.diffDot, { backgroundColor: difficultyColor(category, task) }]} />
                      <Text style={[styles.diffLabel, { color: theme.textMuted }]}>
                        {DIFFICULTY_LABELS[difficultyOf(category, comboLevelOf(category, task))]}
                      </Text>
                    </View>
                  )}
                  {task && <ComboPreview combo={task} styleName={category} />}
                </>
              )}
            </View>
            <View style={styles.cardControls}>
              <TouchableOpacity style={styles.controlButton} accessibilityRole="button" accessibilityLabel={`New ${category} combination`} onPress={() => generateTask(category)}>
                <Ionicons name={locked ? 'lock-closed' : 'refresh'} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.accentBg }]}
                accessibilityRole="button"
                accessibilityLabel={`Build a ${category} combo`}
                onPress={() => openBuilder(category)}
              >
                <Ionicons name={locked ? 'lock-closed' : 'hammer'} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.test }]}
                accessibilityRole="button"
                accessibilityLabel={`Drill ${category} combination`}
                onPress={() => { if (locked) { requirePro(category); return; } task && startDrill(category, task); }}
              >
                <Ionicons name={locked ? 'lock-closed' : 'locate'} size={22} color="#fff" />
              </TouchableOpacity>
              {task && !locked && (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: theme.accentDark }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${category} combination`}
                  onPress={() => { hapticIf('light'); shareCombo(task, category); }}
                >
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
              {task && !locked && (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: theme.test }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show QR code for ${category} combination`}
                  onPress={() => showQR(task, category)}
                >
                  <Ionicons name="qr-code-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
              {!locked && !isTraining && !timerActive ? (
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.success }]} accessibilityRole="button" accessibilityLabel={`Start ${category} training`} onPress={() => startTrainingSession(category)}>
                  <Ionicons name="play" size={22} color="#fff" />
                </TouchableOpacity>
              ) : currentStyle === category && isTraining ? (
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.danger }]} accessibilityRole="button" accessibilityLabel="Stop training" onPress={stopTrainingSession}>
                  <Ionicons name="stop" size={22} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.learnButton, { borderColor: theme.accent }]}
              accessibilityRole="button"
              accessibilityLabel={locked ? `Unlock ${category}` : task ? `Learn ${category} combo breakdown` : `Learn ${category} techniques`}
              onPress={() => { if (locked) { requirePro(category); return; } setLearnModal({ visible: true, style: category, combo: task }); }}
            >
              <Ionicons name={locked ? 'lock-closed' : 'book-outline'} size={18} color={theme.accent} />
              <Text style={[styles.learnButtonText, { color: theme.accent }]}>
                {locked ? 'Unlock with Pro' : task ? 'Learn This Combo' : 'Learn Techniques'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: theme.container }} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.container }]}>
      <StatusBar barStyle={themeName === 'dark' ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={[theme.bgTop, theme.bgBottom]} style={styles.gradient}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Martial Arts Training</Text>
            <View style={styles.headerMeta}>
              {xp > 0 && (
                <View style={styles.streakRow}>
                  <Ionicons name="shield" size={16} color={theme.accent} />
                  <Text style={[styles.streakText, { color: theme.accent }]}>Lv {level}</Text>
                </View>
              )}
              {streak > 0 && (
                <View style={styles.streakRow}>
                  <Ionicons name="flame" size={16} color="#F97316" />
                  <Text style={[styles.streakText, { color: '#F97316' }]}>{streak} day{streak > 1 ? 's' : ''}</Text>
                </View>
              )}
              {difficultyFilter !== 'all' && (
                <Text style={[styles.filterBadge, { color: theme.accent }]}>{DIFFICULTY_LABELS[difficultyFilter]}</Text>
              )}
              {southpaw && <Text style={[styles.filterBadge, { color: theme.test }]}>Southpaw</Text>}
            </View>
          </View>
          <View style={styles.headerControls}>
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel={arsenalView ? "Show all styles" : "Show favorites"} onPress={() => { hapticIf('light'); setArsenalView(!arsenalView); }}>
              <Ionicons name={arsenalView ? 'star' : 'star-outline'} size={22} color={arsenalView ? '#FFD700' : theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => { hapticIf('light'); setIsSettingsVisible(true); }}>
              <Ionicons name="settings-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Toggle light or dark theme" onPress={() => { hapticIf('light'); setThemeName(themeName === 'dark' ? 'light' : 'dark'); }}>
              <Ionicons name={themeName === 'dark' ? 'sunny-outline' : 'moon-outline'} size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, landscapeMode && styles.landscapeScroll]} showsVerticalScrollIndicator={false}>
          {isFirstRun && !arsenalView && (
            <View style={[styles.onboardCard, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
              <Text style={[styles.onboardTitle, { color: theme.text }]}>Your voice-guided fight coach</Text>
              <Text style={[styles.onboardBody, { color: theme.textMuted }]}>
                MyCombat calls out real combinations for 10 martial arts with a round timer, drills, and a technique library. No gym needed. Start free with Boxing, Muay Thai & Karate.
              </Text>
              <TouchableOpacity style={[styles.onboardButton, { backgroundColor: theme.accentBg }]} onPress={startFirstWorkout} accessibilityRole="button" accessibilityLabel="Start my first workout">
                <Text style={styles.onboardButtonText}>Start my first workout — Boxing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOnboardDismissed(true)} accessibilityRole="button" accessibilityLabel="Skip onboarding">
                <Text style={[styles.onboardSkip, { color: theme.textMuted }]}>Skip, just show me the app</Text>
              </TouchableOpacity>
            </View>
          )}
          {!arsenalView && <TimerDisplay />}
          {speechError && (
            <TouchableOpacity style={[styles.speechErrorBanner, { backgroundColor: theme.danger }]} onPress={() => setSpeechError(false)} accessibilityRole="button" accessibilityLabel="Dismiss voice error">
              <Ionicons name="volume-mute" size={16} color="#fff" />
              <Text style={styles.speechErrorText}>Voice unavailable — check your device text-to-speech settings (Settings → Voice → Test)</Text>
            </TouchableOpacity>
          )}
          {!arsenalView && sessions.length > 0 && (
            <View style={[styles.kcalStrip, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={[styles.kcalStripText, { color: theme.text }]}>
                <Text style={{ fontFamily: FONT.bodyBold, color: theme.accent }}>{totalKcal}</Text> kcal burned · {workoutDates.length} workout{workoutDates.length === 1 ? '' : 's'} · {streak} day streak
              </Text>
            </View>
          )}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            {arsenalView ? 'My Arsenal' : (difficultyFilter !== 'all' ? `Showing ${DIFFICULTY_LABELS[difficultyFilter].toLowerCase()} combos` : 'All Styles')}
          </Text>
          {!arsenalView && (
            <Text style={[styles.dragHint, { color: theme.textMuted }]}>Hold & drag a card to reorder</Text>
          )}
          {orderedStyles.map((category, cardIndex) => (
            <DraggableCard
              key={category}
              category={category}
              index={cardIndex}
              onReorder={(from, to) => {
                const list = [...orderedStyles];
                const [moved] = list.splice(from, 1);
                const clamped = Math.max(0, Math.min(to, list.length));
                list.splice(clamped, 0, moved);
                setStyleOrder(list);
              }}
            >
              {({ onLongPress, onPressOut }) => (
                <CategoryCard category={category} dragHandlers={{ onLongPress, onPressOut }} />
              )}
            </DraggableCard>
          ))}
          {arsenalView && favorites.length === 0 && (
            <Text style={styles.emptyText}>No favorites yet. Tap the star on any combo.</Text>
          )}
          {orderedStyles.length === 0 && (
            <Text style={styles.emptyText}>No styles. Create one in Settings.</Text>
          )}
        </ScrollView>

        <Modal animationType="slide" transparent={true} visible={isSettingsVisible} onRequestClose={() => setIsSettingsVisible(false)}>
          <BlurView intensity={100} style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Training Settings</Text>
              {!effectivePro && (
                <TouchableOpacity style={[styles.proBanner, { backgroundColor: theme.accentBg }]} onPress={() => requirePro('settings_banner')}>
                  <Ionicons name="diamond" size={18} color="#fff" />
                  <Text style={styles.proBannerText}>Unlock MyCombat Pro — all 10 styles, 825 combos, premium voices, no ads</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.helpButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setHelpVisible(true)}>
                <Ionicons name="help-circle-outline" size={18} color={theme.accent} />
                <Text style={[styles.helpButtonText, { color: theme.text }]}>How to use MyCombat · Free vs Pro</Text>
              </TouchableOpacity>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Programs</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Coach templates — tap to load</Text>
                {PROGRAMS.map((program) => (
                  <TouchableOpacity key={program.id} style={[styles.programRow, { borderColor: theme.border, backgroundColor: activeProgram === program.id ? theme.cardBgSelected : theme.cardBg }]} onPress={() => applyProgram(program)}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.programName, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
                      <Text style={[styles.programMeta, { color: theme.textMuted }]}>{program.style} · {program.rounds}r × {program.work}s/{program.rest}s rest</Text>
                      <Text style={[styles.programDesc, { color: theme.textMuted }]} numberOfLines={1}>{program.desc}</Text>
                    </View>
                    <View style={styles.programActions}>
                      <TouchableOpacity onPress={() => exportProgram(program)} accessibilityLabel={`Share ${program.name}`}>
                        <Ionicons name="share-social-outline" size={20} color={theme.accent} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Display</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Dark theme</Text>
                  <TouchableOpacity style={[styles.toggleButton, themeName === 'dark' && styles.toggleActive]} onPress={() => { hapticIf('light'); setThemeName(themeName === 'dark' ? 'light' : 'dark'); }}>
                    <Text style={styles.toggleText}>{themeName === 'dark' ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Text size</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity style={[styles.zoomButton, { backgroundColor: theme.buttonDefault }]} onPress={handleZoomOut} accessibilityLabel="Decrease text size">
                      <Ionicons name="remove-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.toggleLabel, { color: theme.textMuted }]}>{Math.round(fontSize)}px</Text>
                    <TouchableOpacity style={[styles.zoomButton, { backgroundColor: theme.buttonDefault }]} onPress={handleZoomIn} accessibilityLabel="Increase text size">
                      <Ionicons name="add-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Voice Packs</Text>
                <View style={styles.restButtons}>
                  {VOICE_PACKS.map((pack) => (
                    <TouchableOpacity key={pack.id} style={[styles.restButton, voicePack === pack.id && styles.restButtonActive]} onPress={() => {
                      if (pack.id !== 'coach' && !effectivePro && !requirePro('voice_packs')) return;
                      hapticIf('light');
                      updateSetting(setVoicePack, pack.id);
                    }}>
                      <Text style={[styles.restButtonText, voicePack === pack.id && styles.restButtonTextActive]}>{pack.label}</Text>
                      {pack.id !== 'coach' && !effectivePro ? (
                        <Ionicons name="lock-closed" size={12} color={theme.textMuted} style={{ marginLeft: 4 }} />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Speech speed (0.8x–1.5x)</Text>
                <View style={styles.restButtons}>
                  {[0.8, 0.9, 1.0, 1.15, 1.3, 1.5].map((rate) => (
                    <TouchableOpacity key={rate} style={[styles.restButton, speechRate === rate && styles.restButtonActive]} onPress={() => updateSetting(setSpeechRate, rate)}>
                      <Text style={[styles.restButtonText, speechRate === rate && styles.restButtonTextActive]}>{rate}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Round Cue Sounds</Text>
                <View style={styles.restButtons}>
                  <TouchableOpacity style={[styles.restButton, !cueSound && styles.restButtonActive]} onPress={() => updateSetting(setCueSound, null)}>
                    <Text style={[styles.restButtonText, !cueSound && styles.restButtonTextActive]}>Off</Text>
                  </TouchableOpacity>
                  {CUE_SOUND_NAMES.map((name) => (
                    <TouchableOpacity key={name} style={[styles.restButton, cueSound === name && styles.restButtonActive]} onPress={() => { updateSetting(setCueSound, name); playCueSound(); }}>
                      <Text style={[styles.restButtonText, cueSound === name && styles.restButtonTextActive]}>{CUE_SOUND_LABELS[name]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Music keeps playing — cues duck over Spotify/YouTube.</Text>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Cadence / Rhythm</Text>
                <View style={styles.restButtons}>
                  {CADENCES.map((c) => (
                    <TouchableOpacity key={c.id} style={[styles.restButton, cadence === c.id && styles.restButtonActive]} onPress={() => updateSetting(setCadence, c.id)}>
                      <Text style={[styles.restButtonText, cadence === c.id && styles.restButtonTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Cadence sets the combo call-out gap (explosive ≈3s, endurance ≈6s). Custom uses your rest period below.</Text>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Combo Modifiers</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Add defensive/stance/target modifiers</Text>
                  <TouchableOpacity style={[styles.toggleButton, modifiersEnabled && styles.toggleActive]} onPress={() => { hapticIf('light'); setModifiersEnabled(!modifiersEnabled); }}>
                    <Text style={styles.toggleText}>{modifiersEnabled ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Hands-Free</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Tap-to-stop (accelerometer, gloved hand)</Text>
                  <TouchableOpacity style={[styles.toggleButton, tapControls && styles.toggleActive]} onPress={() => {
                    if (!tapControls && !effectivePro && !requirePro('tap_controls')) return;
                    hapticIf('light'); setTapControls(!tapControls);
                  }}>
                    <Text style={styles.toggleText}>{tapControls ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Voice commands (say "stop" or "next")</Text>
                  <TouchableOpacity style={[styles.toggleButton, voiceCommands && styles.toggleActive]} onPress={() => {
                    if (!voiceCommands && !effectivePro && !requirePro('voice_commands')) return;
                    hapticIf('light'); setVoiceCommands(!voiceCommands);
                  }}>
                    <Text style={styles.toggleText}>{voiceCommands ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                {voiceCommands && (
                  <Text style={[styles.settingLabel, { color: theme.textMuted }]}>
                    {voiceCmdListening ? '🎙️ Listening — say "stop" or "next" during a workout' : 'Voice listening starts when a workout begins'}
                  </Text>
                )}
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Landscape mode (wall-propped display)</Text>
                  <TouchableOpacity style={[styles.toggleButton, landscapeMode && styles.toggleActive]} onPress={() => { hapticIf('light'); setLandscapeMode(!landscapeMode); }}>
                    <Text style={styles.toggleText}>{landscapeMode ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Tracking & Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.accent }]}>{totalKcal}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>kcal</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.accent }]}>{Math.round(totalWorkoutSeconds / 60)}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>min trained</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.accent }]}>{combosCompleted}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>combos</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.accent }]}>{monthlyCombos}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>this month</Text>
                  </View>
                </View>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Body weight (kg) — for calorie estimate</Text>
                <View style={styles.restButtons}>
                  {[55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((kg) => (
                    <TouchableOpacity key={kg} style={[styles.restButton, weightKg === kg && styles.restButtonActive]} onPress={() => updateSetting(setWeightKg, kg)}>
                      <Text style={[styles.restButtonText, weightKg === kg && styles.restButtonTextActive]}>{kg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Difficulty</Text>
                <View style={styles.restButtons}>
                  {[{ label: 'All', value: 'all' }, { label: 'Beginner', value: 'beginner' }, { label: 'Intermediate', value: 'intermediate' }, { label: 'Advanced', value: 'advanced' }].map((opt) => (
                    <TouchableOpacity key={opt.value} style={[styles.restButton, difficultyFilter === opt.value && styles.restButtonActive]} onPress={() => updateSetting(setDifficultyFilter, opt.value)}>
                      <Text style={[styles.restButtonText, difficultyFilter === opt.value && styles.restButtonTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Combinations Settings</Text>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Combinations Rest Period</Text>
                <View style={styles.restButtons}>
                  {[5, 10, 15, 20, 25, 30, 35].map((seconds) => (
                    <TouchableOpacity key={seconds} style={[styles.restButton, comboRestPeriod === seconds && styles.restButtonActive]} onPress={() => updateSetting(setComboRestPeriod, seconds)}>
                      <Text style={[styles.restButtonText, comboRestPeriod === seconds && styles.restButtonTextActive]}>{seconds}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Repeats Per Combo</Text>
                <View style={styles.restButtons}>
                  {[1, 2, 3, 5, 10].map((count) => (
                    <TouchableOpacity key={count} style={[styles.restButton, comboRepeatCount === count && styles.restButtonActive]} onPress={() => updateSetting(setComboRepeatCount, count)}>
                      <Text style={[styles.restButtonText, comboRepeatCount === count && styles.restButtonTextActive]}>{count === 1 ? 'Once' : `${count}x`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Form Cues Between Sets</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Speak technique cues every 3rd repeat</Text>
                  <TouchableOpacity style={[styles.toggleButton, formCuesEnabled && styles.toggleActive]} onPress={() => { hapticIf('light'); setFormCuesEnabled(!formCuesEnabled); }}>
                    <Text style={styles.toggleText}>{formCuesEnabled ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Stance</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Southpaw (swap left/right)</Text>
                  <TouchableOpacity style={[styles.toggleButton, southpaw && styles.toggleActive]} onPress={() => { hapticIf('light'); setSouthpaw(!southpaw); }}>
                    <Text style={styles.toggleText}>{southpaw ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>HIIT Timer Settings</Text>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Work Period Duration</Text>
                <View style={styles.restButtons}>
                  {[20, 30, 45, 60, 90, 120, 180].map((seconds) => (
                    <TouchableOpacity key={`work-${seconds}`} style={[styles.restButton, workPeriod === seconds && styles.restButtonActive]} onPress={() => updateSetting(setWorkPeriod, seconds)}>
                      <Text style={[styles.restButtonText, workPeriod === seconds && styles.restButtonTextActive]}>{seconds}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>HIIT Rest Period Duration</Text>
                <View style={styles.restButtons}>
                  {[10, 15, 20, 30, 45, 60].map((seconds) => (
                    <TouchableOpacity key={`hiit-rest-${seconds}`} style={[styles.restButton, hiitRestPeriod === seconds && styles.restButtonActive]} onPress={() => updateSetting(setHiitRestPeriod, seconds)}>
                      <Text style={[styles.restButtonText, hiitRestPeriod === seconds && styles.restButtonTextActive]}>{seconds}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Total Rounds</Text>
                <View style={styles.restButtons}>
                  {[3, 5, 8, 10, 12, 15].map((rounds) => (
                    <TouchableOpacity key={`rounds-${rounds}`} style={[styles.restButton, totalRounds === rounds && styles.restButtonActive]} onPress={() => updateSetting(setTotalRounds, rounds)}>
                      <Text style={[styles.restButtonText, totalRounds === rounds && styles.restButtonTextActive]}>{rounds}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Custom Styles</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Create your own style and combos</Text>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.test }]} onPress={() => { hapticIf('light'); setIsCustomStyleModalVisible(true); }}>
                  <Text style={styles.closeButtonText}>+ New Custom Style</Text>
                </TouchableOpacity>
                {Object.entries(customStyles).map(([name, combos]) => (
                  <View key={name} style={styles.customStyleRow}>
                    <Text style={[styles.customStyleName, { color: theme.text }]} numberOfLines={1}>{name} ({combos.length})</Text>
                    <TouchableOpacity onPress={() => deleteCustomStyle(name)}>
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Style Order</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Reorder styles on the main screen</Text>
                {orderedStyles.map((name, idx) => (
                  <View key={name} style={styles.customStyleRow}>
                    <Text style={[styles.customStyleName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity disabled={idx === 0} onPress={() => moveStyle(idx, -1)}>
                        <Ionicons name="arrow-up-circle" size={24} color={idx === 0 ? theme.textMuted : theme.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity disabled={idx === orderedStyles.length - 1} onPress={() => moveStyle(idx, 1)}>
                        <Ionicons name="arrow-down-circle" size={24} color={idx === orderedStyles.length - 1 ? theme.textMuted : theme.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Workout History</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>
                  {workoutDates.length} workout{workoutDates.length === 1 ? '' : 's'} · {streak} day streak
                </Text>
                {effectivePro ? (
                  workoutDates.slice(-7).reverse().map((d) => (
                    <View key={d} style={styles.customStyleRow}>
                      <Text style={[styles.customStyleName, { color: theme.text }]}>{d}</Text>
                      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                    </View>
                  ))
                ) : (
                  <TouchableOpacity style={[styles.programRow, { borderColor: theme.accent }]} onPress={() => requirePro('history')}>
                    <Ionicons name="lock-closed" size={18} color={theme.accent} style={{ marginRight: 8 }} />
                    <Text style={[styles.programName, { color: theme.text }]}>Unlock full workout history with Pro</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Speech Settings</Text>

                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Timer Announcements</Text>
                  <TouchableOpacity style={[styles.toggleButton, !timerSpeechPaused && styles.toggleActive]} onPress={() => { hapticIf('light'); setTimerSpeechPaused(!timerSpeechPaused); }}>
                    <Text style={styles.toggleText}>{timerSpeechPaused ? 'OFF' : 'ON'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Combination Announcements</Text>
                  <TouchableOpacity style={[styles.toggleButton, !comboSpeechPaused && styles.toggleActive]} onPress={() => { hapticIf('light'); setComboSpeechPaused(!comboSpeechPaused); }}>
                    <Text style={styles.toggleText}>{comboSpeechPaused ? 'OFF' : 'ON'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Voice Options</Text>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Command Voice (combos & timer)</Text>
                <View style={styles.restButtons}>
                  <TouchableOpacity style={[styles.restButton, !speechVoice && styles.restButtonActive]} onPress={() => updateSetting(setSpeechVoice, null)}>
                    <Text style={[styles.restButtonText, !speechVoice && styles.restButtonTextActive]}>Default</Text>
                  </TouchableOpacity>
                  {availableVoices.slice(0, 10).map((voice) => (
                    <TouchableOpacity key={`cmd-${voice.identifier}`} style={[styles.voiceButton, speechVoice === voice.identifier && styles.restButtonActive]} onPress={() => updateSetting(setSpeechVoice, voice.identifier)}>
                      <Text style={[styles.restButtonText, speechVoice === voice.identifier && styles.restButtonTextActive]} numberOfLines={1}>{voiceLabel(voice)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Technique Voice (form cues & learning)</Text>
                <View style={styles.restButtons}>
                  <TouchableOpacity style={[styles.restButton, !techniqueVoice && styles.restButtonActive]} onPress={() => updateSetting(setTechniqueVoice, null)}>
                    <Text style={[styles.restButtonText, !techniqueVoice && styles.restButtonTextActive]}>Default</Text>
                  </TouchableOpacity>
                  {availableVoices.slice(0, 10).map((voice) => (
                    <TouchableOpacity key={`tech-${voice.identifier}`} style={[styles.voiceButton, techniqueVoice === voice.identifier && styles.restButtonActive]} onPress={() => updateSetting(setTechniqueVoice, voice.identifier)}>
                      <Text style={[styles.restButtonText, techniqueVoice === voice.identifier && styles.restButtonTextActive]} numberOfLines={1}>{voiceLabel(voice)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {voicePack === 'custom' && (
                  <>
                    <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Custom Speech Rate</Text>
                    <View style={styles.restButtons}>
                      {[{ label: 'Slow', value: 0.7 }, { label: 'Normal', value: 0.9 }, { label: 'Fast', value: 1.1 }].map((opt) => (
                        <TouchableOpacity key={opt.label} style={[styles.restButton, speechRate === opt.value && styles.restButtonActive]} onPress={() => updateSetting(setSpeechRate, opt.value)}>
                          <Text style={[styles.restButtonText, speechRate === opt.value && styles.restButtonTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Custom Pitch</Text>
                    <View style={styles.restButtons}>
                      {[{ label: 'Low', value: 0.8 }, { label: 'Normal', value: 1.0 }, { label: 'High', value: 1.3 }].map((opt) => (
                        <TouchableOpacity key={opt.label} style={[styles.restButton, speechPitch === opt.value && styles.restButtonActive]} onPress={() => updateSetting(setSpeechPitch, opt.value)}>
                          <Text style={[styles.restButtonText, speechPitch === opt.value && styles.restButtonTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                {voicePack !== 'custom' && (
                  <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Rate & pitch are set by the voice pack. Choose Custom to tune them manually.</Text>
                )}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Motivation</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Workout reminders</Text>
                  <TouchableOpacity style={[styles.toggleButton, reminderEnabled && styles.toggleActive]} onPress={() => {
                    hapticIf('light');
                    const next = !reminderEnabled;
                    setReminderEnabled(next);
                    if (next) scheduleReminder({ requestPermission: true });
                  }}>
                    <Text style={styles.toggleText}>{reminderEnabled ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Dim screen during workouts</Text>
                  <TouchableOpacity style={[styles.toggleButton, dimScreen && styles.toggleActive]} onPress={() => { hapticIf('light'); setDimScreen(!dimScreen); }}>
                    <Text style={styles.toggleText}>{dimScreen ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Keeps the screen on but drops brightness for long bag sessions — saves battery, still hear every callout.</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Weekly goal: {weekRounds}/{WEEKLY_GOAL_ROUNDS} rounds ({weeklyGoalPct}%)</Text>
                <View style={[styles.goalBar, { backgroundColor: theme.taskContainer, borderColor: theme.border }]}>
                  <View style={[styles.goalBarFill, { width: `${weeklyGoalPct}%`, backgroundColor: theme.accent }]} />
                </View>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Streak freezes: {streakFreezes} available — a freeze keeps your streak alive when you miss a day (earn +1 every 7-day streak)</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Badges: {badges.length}/{BADGES.length}</Text>
                <View style={styles.badgeRow}>
                  {BADGES.map((b) => {
                    const earned = badges.includes(b.id);
                    return (
                      <View key={b.id} style={[styles.badgeChip, { backgroundColor: theme.cardBg, borderColor: earned ? theme.accent : theme.border, opacity: earned ? 1 : 0.45 }]}>
                        <Ionicons name={b.icon} size={14} color={earned ? theme.accent : theme.textMuted} />
                        <Text style={[styles.badgeChipText, { color: earned ? theme.text : theme.textMuted }]} numberOfLines={1}>{b.label}</Text>
                      </View>
                    );
                  })}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Haptics</Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Vibration feedback</Text>
                  <TouchableOpacity style={[styles.toggleButton, hapticsEnabled && styles.toggleActive]} onPress={() => { setHapticsEnabled(!hapticsEnabled); }}>
                    <Text style={styles.toggleText}>{hapticsEnabled ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.closeButton} onPress={() => setIsSettingsVisible(false)}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Modal>

        {/* Custom style creator */}
        <Modal animationType="slide" transparent={true} visible={isCustomStyleModalVisible} onRequestClose={() => setIsCustomStyleModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Custom Style</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Style name</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.textMuted }]}
                  placeholder="e.g. My Hybrid Style"
                  placeholderTextColor={theme.textMuted}
                  value={customStyleName}
                  onChangeText={setCustomStyleName}
                />
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Combos (one per line)</Text>
                <TextInput
                  style={[styles.textInputMultiline, { color: theme.text, borderColor: theme.textMuted }]}
                  placeholder={'Jab > Right cross\nLeft hook > Right cross\n...'}
                  placeholderTextColor={theme.textMuted}
                  value={customStyleCombos}
                  onChangeText={setCustomStyleCombos}
                  multiline
                />
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.success }]} onPress={addCustomStyle}>
                  <Text style={styles.closeButtonText}>Save Style</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.danger, marginTop: 8 }]} onPress={() => setIsCustomStyleModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Learn modal */}
        <Modal animationType="slide" transparent={true} visible={learnModal.visible} onRequestClose={() => setLearnModal({ visible: false, style: null, combo: null })}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Learn — {learnModal.style}</Text>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {learnModal.combo ? (
                  <>
                    <Text style={[styles.learnComboText, { color: theme.text }]}>{displayText(learnModal.combo)}</Text>
                    <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Move breakdown:</Text>
                    {learnMoves().map(({ move, tech }, idx) => (
                      <View key={idx} style={[styles.learnMoveCard, { backgroundColor: theme.taskContainer }]}>
                        <Text style={[styles.learnMoveName, { color: theme.text }]}>{displayText(move)}</Text>
                        {tech ? (
                          <Text style={[styles.learnMoveHow, { color: theme.textMuted }]}>{tech.how}</Text>
                        ) : (
                          <Text style={[styles.learnMoveHow, { color: theme.textMuted }]}>No technique entry yet for this move.</Text>
                        )}
                      </View>
                    ))}
                  </>
                ) : null}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Curriculum</Text>
                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>
                  Learned {learnedCount(learnModal.style)}/{curriculumTotal(learnModal.style)} techniques
                </Text>
                {nextTechnique(learnModal.style) ? (
                  (() => {
                    const next = nextTechnique(learnModal.style);
                    const tech = TECHNIQUES[learnModal.style] && TECHNIQUES[learnModal.style][next];
                    return (
                      <View style={[styles.learnMoveCard, { backgroundColor: theme.taskContainer }]}>
                        <Text style={[styles.learnMoveName, { color: theme.text }]}>Next: {next.charAt(0).toUpperCase() + next.slice(1)}</Text>
                        {tech && <Text style={[styles.learnMoveHow, { color: theme.textMuted }]}>{tech.how}</Text>}
                        <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.success }]} onPress={() => markTechniqueLearned(learnModal.style)}>
                          <Text style={styles.closeButtonText}>✓ Mark Learned</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()
                ) : (
                  <View style={styles.completeRow}>
                    <Ionicons name="trophy" size={20} color={theme.success} />
                    <Text style={[styles.learnMoveHow, { color: theme.success }]}>Curriculum complete!</Text>
                  </View>
                )}

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Technique Library</Text>
                {Object.entries(TECHNIQUES[learnModal.style] || {}).map(([name, tech]) => (
                  <View key={name} style={[styles.learnMoveCard, { backgroundColor: theme.taskContainer }]}>
                    <Text style={[styles.learnMoveName, { color: theme.text }]}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
                    <Text style={[styles.learnMoveHow, { color: theme.textMuted }]}>{tech.how}</Text>
                    <TouchableOpacity
                      style={[styles.cueButton, { borderColor: theme.test }]}
                      onPress={() => addToSpeechQueue(`Form: ${tech.cue}`, 'technique')}
                    >
                      <Ionicons name="volume-high" size={16} color={theme.test} />
                      <Text style={[styles.cueButtonText, { color: theme.test }]}>Hear cue</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeButton} onPress={() => setLearnModal({ visible: false, style: null, combo: null })}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Combo builder modal */}
        <Modal animationType="slide" transparent={true} visible={builder.visible} onRequestClose={closeBuilder}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Combo Builder — {builder.style}</Text>
              <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Tap techniques to build a combo</Text>
              <View style={[styles.taskContainer, { backgroundColor: theme.taskContainer }]}>
                <Text style={[styles.taskText, { color: theme.text }]}>
                  {builder.sequence.length > 0
                    ? builder.sequence.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' > ')
                    : 'Tap below to add moves'}
                </Text>
              </View>
              <ScrollView style={styles.builderScroll}>
                <View style={styles.restButtons}>
                  {builderTechniques().map((name) => (
                    <TouchableOpacity key={name} style={[styles.builderChip, { borderColor: theme.accent }]} onPress={() => builderAddTechnique(name)}>
                      <Text style={[styles.builderChipText, { color: theme.text }]}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.builderControls}>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.danger }]} onPress={builderRemoveLast}>
                  <Text style={styles.closeButtonText}>Undo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.success }]} onPress={builderSaveCombo}>
                  <Text style={styles.closeButtonText}>Save Combo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.textMuted }]} onPress={closeBuilder}>
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* QR share modal */}
        <Modal animationType="fade" transparent={true} visible={shareModal.visible} onRequestClose={() => setShareModal({ visible: false, combo: null, styleName: null })}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Share Combo</Text>
                {shareModal.combo ? (
                  <>
                    <View style={styles.qrWrap}>
                      <QRCode
                        value={`MyCombat combo (${shareModal.styleName || 'style'}): ${shareModal.combo}`}
                        size={180}
                        backgroundColor="#fff"
                        color="#0F172A"
                      />
                    </View>
                    <Text style={[styles.qrLabel, { color: theme.textMuted }]}>
                      {shareModal.styleName} — scan to read this combo on any phone
                    </Text>
                    <Text style={[styles.learnComboText, { color: theme.text }]}>{displayText(shareModal.combo)}</Text>
                    <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.accentBg }]} onPress={() => shareCombo(shareModal.combo, shareModal.styleName)}>
                      <Text style={styles.closeButtonText}>Share via native sheet</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.textMuted, marginTop: 8 }]} onPress={() => setShareModal({ visible: false, combo: null, styleName: null })}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Paywall preview (soft gate) */}
        {/* How-to / Free vs Pro modal */}
        <Modal animationType="slide" transparent={true} visible={helpVisible} onRequestClose={() => setHelpVisible(false)}>
          <BlurView intensity={100} style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>How to use MyCombat</Text>

                <Text style={[styles.modalSubtitle, { color: theme.accent }]}>🎯 Quick start</Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  1. Tap a style card (Boxing, Muay Thai…) and hit ▶ to train — the voice coach calls out real combinations.\n
                  2. Tap 🔄 for a new combo. Tap 🎯 to drill one combo for rounds. Tap the star ⭐ to favorite it.\n
                  3. Tap "Learn This Combo" for a move-by-move breakdown and a curriculum to follow.\n
                  4. Use the timer panel: Start/Stop rounds, tap ⚙️ to adjust work/rest/rounds.
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.accent }]}>⏱ Timer</Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  The round timer announces work/rest transitions with cue sounds. Coach templates (Settings → Programs) load preset round structures for specific training goals — tap one to apply it.
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.accent }]}>🖐 Hands-free</Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  Settings → Hands-Free → ON, then during a workout thump the phone to stop the session. No buttons needed when your hands are wrapped.
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.accent }]}>🤸 Southpaw</Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  Switches all combos to the opposite stance — left becomes right, lead becomes rear. For southpaw fighters or to train both sides.
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.accent }]}>🔥 Calories</Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  Each session estimates calories burned (based on style + your weight in Settings). See totals in the stats section.
                </Text>

                <Text style={[styles.modalSubtitle, { color: theme.accent }]}>💎 Free vs Pro</Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  <Text style={{ fontFamily: FONT.bodyBold }}>Free (forever):</Text> Boxing, Muay Thai & Karate — 180+ combinations, voice coach, round timer, drill mode, Learn Mode, favorites, streaks, themes, calorie tracking.
                </Text>
                <Text style={[styles.helpBody, { color: theme.text }]}>
                  <Text style={{ fontFamily: FONT.bodyBold }}>Pro:</Text> all 10 styles and the full 825-combination library, custom styles, combo builder saves, premium voice packs, hands-free tap controls, full workout history. Try the annual plan with a {TRIAL_DAYS}-day free trial — monthly or annual both unlock the same features.
                </Text>

                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.accentBg, marginTop: 12 }]} onPress={() => setHelpVisible(false)}>
                  <Text style={styles.closeButtonText}>Got it</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </BlurView>
        </Modal>

        {/* Paywall modal */}
        <Modal animationType="slide" transparent={true} visible={paywallVisible} onRequestClose={() => setPaywallVisible(false)}>
          <BlurView intensity={100} style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
                <Text style={[styles.paywallTitle, { color: theme.text }]}>MyCombat Pro</Text>
                <Text style={[styles.paywallSub, { color: theme.textMuted }]}>
                  {pendingProAction ? `Unlock "${pendingProAction.replace(/_/g, ' ')}"` : 'Unlock everything'}
                </Text>
                {PRO_FEATURES.map((f) => (
                  <View key={f} style={styles.paywallFeature}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                    <Text style={[styles.paywallFeatureText, { color: theme.text }]}>{f}</Text>
                  </View>
                ))}
                <TouchableOpacity style={[styles.paywallTier, { backgroundColor: theme.accentBg, borderColor: theme.accent }]} onPress={() => purchasePro('annual')}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paywallTierName, { color: '#fff' }]}>Annual — best value</Text>
                    <Text style={[styles.paywallTierTrial, { color: '#fff' }]}>Start your {TRIAL_DAYS}-day free trial</Text>
                  </View>
                  <Text style={[styles.paywallTierPrice, { color: '#fff' }]}>${PRO_PRICING.annual}/yr (${(PRO_PRICING.annual / 12).toFixed(2)}/mo)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.paywallTier, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => purchasePro('monthly')}>
                  <Text style={[styles.paywallTierName, { color: theme.text }]}>Monthly</Text>
                  <Text style={[styles.paywallTierPrice, { color: theme.accent }]}>${PRO_PRICING.monthly}/mo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.paywallRestore, { borderColor: theme.border }]} onPress={restorePurchases} disabled={restoring}>
                  <Text style={[styles.paywallRestoreText, { color: theme.textMuted }]}>
                    {restoring ? 'Checking purchases…' : 'Restore purchases'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.textMuted, marginTop: 12 }]} onPress={() => setPaywallVisible(false)}>
                  <Text style={styles.closeButtonText}>{purchasing ? 'Processing…' : 'Not now'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </BlurView>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 26, fontFamily: FONT.heading, color: theme.text, letterSpacing: 0.5 },
  headerMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  streakText: { fontSize: 14, fontFamily: FONT.bodySemi, color: '#F97316' },
  filterBadge: { fontSize: 12, fontFamily: FONT.bodySemi, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: theme.buttonDefault },
  headerControls: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.iconButton, justifyContent: 'center', alignItems: 'center' },
  zoomButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, gap: 20 },
  sectionLabel: { fontSize: 13, fontFamily: FONT.headingSemi, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  dragHint: { fontSize: 12, fontFamily: FONT.body, color: theme.textMuted, textAlign: 'center', marginTop: -10 },
  kcalStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  kcalStripText: { fontSize: 13, fontFamily: FONT.body },
  speechErrorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  speechErrorText: { color: '#fff', fontSize: 12, fontFamily: FONT.bodySemi, flexShrink: 1 },
  categoryCard: { borderRadius: 16, overflow: 'hidden', elevation: 5, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, borderWidth: 1, borderColor: theme.border },
  categoryGradient: { padding: 20 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitleGroup: { flex: 1, marginRight: 10 },
  categoryTitle: { fontSize: 24, fontFamily: FONT.heading, color: theme.text, letterSpacing: 0.3 },
  lockedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  lockedBadgeText: { fontSize: 12, fontFamily: FONT.bodyBold, letterSpacing: 1 },
  lockedContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50 },
  lockedText: { fontSize: 14, fontFamily: FONT.bodySemi, textAlign: 'center', flexShrink: 1 },
  progressText: { fontSize: 12, fontFamily: FONT.body, color: theme.textMuted, marginTop: 2 },
  favButton: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  taskContainer: { borderRadius: 12, padding: 15, marginBottom: 15, minHeight: 80, justifyContent: 'center', backgroundColor: theme.taskContainer },
  taskText: { fontSize: 16, fontFamily: FONT.body, color: theme.text, textAlign: 'center', width: '100%' },
  diffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  diffLabel: { fontSize: 12, fontFamily: FONT.bodySemi, color: theme.textMuted },
  cardControls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: '100%' },
  controlButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.buttonDefault, justifyContent: 'center', alignItems: 'center' },
  learnButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingVertical: 8, marginTop: 12, borderColor: theme.accent },
  learnButtonText: { fontSize: 14, fontFamily: FONT.bodySemi, color: theme.accent },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.overlay },
  modalContent: { width: '90%', borderRadius: 20, padding: 25, paddingBottom: 15, alignItems: 'center', elevation: 5, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, maxHeight: '85%', backgroundColor: theme.modalBg, borderWidth: 1, borderColor: theme.border },
  modalScroll: { width: '100%', maxHeight: '80%' },
  modalScrollContent: { paddingBottom: 10 },
  modalTitle: { fontSize: 26, fontFamily: FONT.heading, color: theme.text, marginBottom: 20, letterSpacing: 0.5 },
  modalSubtitle: { fontSize: 17, fontFamily: FONT.headingSemi, color: theme.text, marginBottom: 15, alignSelf: 'flex-start' },
  restButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 25 },
  restButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, backgroundColor: theme.buttonDefault, minWidth: 70, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restButtonActive: { backgroundColor: theme.accentBg },
  restButtonText: { color: theme.text, fontSize: 16, fontFamily: FONT.bodySemi },
  restButtonTextActive: { color: '#fff', fontFamily: FONT.bodyBold },
  voiceButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.buttonDefault, maxWidth: '45%', alignItems: 'center' },
  closeButton: { backgroundColor: theme.accentBg, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginTop: 10, minHeight: 48, justifyContent: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontFamily: FONT.bodyBold },
  timerContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: theme.timerPanel, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border },
  drillBadge: { fontSize: 16, fontFamily: FONT.headingSemi, color: theme.test, marginBottom: 10, letterSpacing: 2 },
  drillTaskBox: { backgroundColor: theme.taskContainer, borderRadius: 12, padding: 12, marginBottom: 10, width: '100%', alignItems: 'center' },
  drillTaskText: { color: theme.text, textAlign: 'center' },
  timerCircle: { width: 150, height: 150, borderRadius: 75, borderWidth: 5, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  timerText: { fontSize: 44, fontFamily: FONT.heading, fontWeight: 'bold' },
  timerModeText: { fontSize: 18, fontFamily: FONT.headingSemi, marginTop: 5 },
  roundsText: { fontSize: 16, fontFamily: FONT.bodySemi, color: theme.text, marginBottom: 15 },
  timerControls: { flexDirection: 'row', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontFamily: FONT.body, color: theme.textMuted, alignSelf: 'flex-start', marginTop: 15, marginBottom: 8 },
  testButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginTop: 10, minHeight: 44, justifyContent: 'center' },
  testButtonText: { color: '#fff', fontSize: 14, fontFamily: FONT.bodyBold },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
  toggleLabel: { fontSize: 16, fontFamily: FONT.body, color: theme.text },
  toggleButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: theme.toggleOff, minWidth: 56, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: theme.accentBg },
  toggleText: { color: theme.text, fontWeight: 'bold', fontFamily: FONT.bodyBold },
  goalBar: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden', borderWidth: 1, marginBottom: 12 },
  goalBarFill: { height: '100%', borderRadius: 5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14, width: '100%' },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 },
  badgeChipText: { fontSize: 12, fontFamily: FONT.bodySemi },
  customStyleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.border },
  customStyleName: { fontSize: 16, fontFamily: FONT.body, color: theme.text, flex: 1, marginRight: 10 },
  textInput: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, fontSize: 16, fontFamily: FONT.body, color: theme.text, borderColor: theme.border },
  textInputMultiline: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, fontSize: 16, minHeight: 120, textAlignVertical: 'top', fontFamily: FONT.body, color: theme.text, borderColor: theme.border },
  emptyText: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 16, fontFamily: FONT.body },
  learnComboText: { fontSize: 18, fontFamily: FONT.headingSemi, color: theme.text, textAlign: 'center', marginBottom: 15 },
  learnMoveCard: { borderRadius: 12, padding: 12, marginBottom: 10, width: '100%', backgroundColor: theme.taskContainer, borderWidth: 1, borderColor: theme.border },
  learnMoveName: { fontSize: 16, fontFamily: FONT.bodySemi, color: theme.text, marginBottom: 4 },
  learnMoveHow: { fontSize: 14, fontFamily: FONT.body, color: theme.textMuted, lineHeight: 20 },
  cueButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginTop: 8, alignSelf: 'flex-start', borderColor: theme.test },
  cueButtonText: { fontSize: 13, fontFamily: FONT.bodySemi, color: theme.test },
  builderScroll: { maxHeight: 200, width: '100%' },
  builderChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: 'center', borderColor: theme.accent },
  builderChipText: { fontSize: 14, fontFamily: FONT.bodySemi, color: theme.text },
  builderControls: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewStrip: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  previewStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewChip: { borderWidth: 1, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12, maxWidth: '100%' },
  previewChipText: { fontSize: 12, fontFamily: FONT.bodySemi, textAlign: 'center' },
  previewArrow: { marginHorizontal: -2 },
  qrWrap: { padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12 },
  qrLabel: { fontSize: 13, fontFamily: FONT.body, marginBottom: 10, textAlign: 'center' },
  programRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, width: '100%' },
  programName: { fontSize: 15, fontFamily: FONT.bodySemi, marginBottom: 2 },
  programMeta: { fontSize: 12, fontFamily: FONT.body, marginBottom: 2 },
  programDesc: { fontSize: 12, fontFamily: FONT.body },
  programActions: { marginLeft: 10, padding: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8, marginBottom: 10 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: theme.border },
  statValue: { fontSize: 22, fontFamily: FONT.heading, marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: FONT.body },
  landscapeScroll: { maxWidth: 900, width: '100%', alignSelf: 'center' },
  proBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12, width: '100%' },
  proBannerText: { color: '#fff', fontFamily: FONT.bodyBold, fontSize: 13, flex: 1 },
  helpButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, marginBottom: 12, width: '100%' },
  helpButtonText: { fontSize: 13, fontFamily: FONT.bodySemi },
  helpBody: { fontSize: 14, fontFamily: FONT.body, lineHeight: 20, marginBottom: 8, textAlign: 'left' },
  paywallTitle: { fontSize: 30, fontFamily: FONT.heading, marginBottom: 2 },
  paywallSub: { fontSize: 14, fontFamily: FONT.body, marginBottom: 16 },
  paywallFeature: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 8 },
  paywallFeatureText: { fontSize: 15, fontFamily: FONT.body, flex: 1 },
  paywallTier: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, width: '100%' },
  paywallTierName: { fontSize: 16, fontFamily: FONT.bodyBold },
  paywallTierTrial: { fontSize: 12, fontFamily: FONT.body, marginTop: 2, opacity: 0.9 },
  paywallTierPrice: { fontSize: 16, fontFamily: FONT.headingSemi },
  paywallRestore: { marginTop: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  paywallRestoreText: { fontSize: 13, fontFamily: FONT.bodySemi, textAlign: 'center' },
  onboardCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 4 },
  onboardTitle: { fontSize: 22, fontFamily: FONT.heading, textAlign: 'center', marginBottom: 8 },
  onboardBody: { fontSize: 14, fontFamily: FONT.body, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  onboardButton: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 25, marginBottom: 10, width: '100%', alignItems: 'center' },
  onboardButtonText: { color: '#fff', fontSize: 16, fontFamily: FONT.bodyBold },
  onboardSkip: { fontSize: 13, fontFamily: FONT.body, padding: 8 },
});

// Wrap the root in the error boundary — a runtime JS error must show the
// recovery screen, never a white screen.
export default function AppRoot() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
