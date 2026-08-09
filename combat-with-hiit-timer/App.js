import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
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
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFonts, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Audio } from 'expo-av';
import { Accelerometer } from 'expo-sensors';
import * as StoreReview from 'expo-store-review';
import { Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

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
const PRO_PRICING = {
  monthly: 4.99, annual: 29.99, lifetime: 34.99,
};
const PRO_FEATURES = [
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
    'Boxing': { 1: "Jab > Right cross", 2: "Jab > Jab > Right cross", 3: "Double jab > Right cross", 4: "Jab > Right cross > Left hook", 5: "Jab > Right cross > Left hook > Right cross", 6: "Jab > Left hook > Right cross", 7: "Right cross > Left hook > Right cross", 8: "Jab > Jab > Left hook > Right cross", 9: "Jab > Right cross > Left hook to the body > Left hook to the head", 10: "Jab to the body > Right cross to the head", 11: "Jab > Right hook to the body > Left hook to the head", 12: "Jab > Right cross > Slip left > Right cross", 13: "Jab > Right uppercut > Left hook > Right cross", 14: "Jab > Right cross > Left hook > Right uppercut", 15: "Jab > Left hook to the body > Right uppercut > Left hook", 16: "Right uppercut > Left hook > Right cross", 17: "Left hook to the body > Right cross > Left hook to the head", 18: "Jab > Right cross > Left hook to the body > Right cross", 19: "Jab > Slip right > Right uppercut", 20: "Jab > Slip left > Left hook", 21: "Jab > Right cross > Slip right > Right cross > Left hook", 22: "Jab > Right cross > Duck > Right uppercut > Left hook", 23: "Right cross > Duck > Left hook to the head > Right uppercut", 24: "Jab > Fake right cross > Slip left > Left hook", 25: "Jab > Right cross > Pivot left > Left hook > Right cross", 26: "Left hook > Right cross > Pivot right > Right cross", 27: "Jab > Step left > Jab > Right cross", 28: "Jab > Right cross > Left hook to the body > Right hook to the head", 29: "Fake jab > Slip back > Right cross (Pull counter)", 30: "Shoulder roll > Right uppercut > Left hook", 31: "Pull counter > Right cross > Left hook > Right cross", 32: "Jab > Right cross > Left hook > Right hook to the body > Left hook to the head", 33: "Double jab > Right cross > Left hook > Right uppercut > Left hook", 34: "Jab > Right cross > Step back (Draw) > Right cross (Counter)", 35: "Jab > Right cross > Shift lead foot (Switch stance) > Southpaw cross", 36: "Right overhand > Shift (Switch stance) > Lead hook", 37: "Shoulder roll > Right cross > Left shovel hook to the body", 38: "Jab > Pivot 90 degrees right > Double left hook", 39: "Jab > Right cross > Left hook > Step back > Right cross > Left hook", 40: "Right cross > Duck > Step forward > Left hook (The Shift)" },
    'Kickboxing': { 1: "Jab, Cross, Left Hook, Right Low Kick", 2: "Cross, Left Hook, Right Hook, Left Body Kick", 3: "Jab, Right Cross, Left Uppercut, Right Hook", 4: "Left Hook, Cross, Left Body Kick, Right Low Kick", 5: "Right Cross, Left Hook, Right Low Kick", 6: "Jab, Right Cross, Left Uppercut, Right Uppercut", 7: "Left Hook, Cross, Left Body Kick, Right Leg Kick", 8: "Cross, Left Hook, Right Hook, Left High Kick", 9: "Jab, Cross, Left Uppercut, Right Elbow", 10: "Right Cross, Left Hook, Left Hook, Right Low Kick", 11: "Left Jab, Right Cross, Left Body Hook, Right Leg Kick", 12: "Right Cross, Left Hook, Left Kick to the Body, Right Hook", 13: "Jab, Left Hook, Right Cross, Left Roundhouse Kick", 14: "Left Jab, Right Cross, Left High Kick, Right Cross", 15: "Right Cross, Left Hook, Right Uppercut, Left Hook, Right Leg Kick", 16: "Left Hook, Right Hook, Left High Kick, Right Cross", 17: "Jab, Cross, Left Hook, Right Roundhouse Kick", 18: "Jab, Right Cross, Left Hook, Right Hook, Left Body Kick", 19: "Left Hook, Right Cross, Left Roundhouse Kick, Right Hook", 20: "Cross, Left Hook, Right Low Kick, Left Hook", 21: "Jab, Cross, Right Uppercut, Left Hook, Right Cross", 22: "Cross, Left Hook, Left Body Kick, Right Low Kick", 23: "Jab, Cross, Right Hook, Left High Kick", 24: "Left Jab, Right Cross, Left Uppercut, Right Hook, Left Roundhouse Kick", 25: "Right Cross, Left Hook, Right Cross, Left Kick to the Body", 26: "Jab, Right Cross, Left Hook, Right Uppercut, Left Hook", 27: "Cross, Left Hook, Right Low Kick, Left Hook, Right Cross", 28: "Left Hook, Right Cross, Left Uppercut, Right Elbow, Left Body Kick", 29: "Right Cross, Left Hook, Right Hook, Left High Kick, Right Leg Kick", 30: "Jab, Cross, Left Hook, Right Hook, Left Low Kick", 31: "Left Hook, Right Cross, Left Uppercut, Right Low Kick, Left Hook", 32: "Right Cross, Left Hook, Right Uppercut, Left Leg Kick", 33: "Jab, Left Hook, Right Cross, Left Roundhouse Kick", 34: "Cross, Left Hook, Right Uppercut, Left Hook, Right Roundhouse Kick", 35: "Jab, Right Cross, Left Hook, Right Uppercut, Left Body Kick", 36: "Left Jab, Right Cross, Left Hook, Right Cross, Left Roundhouse Kick", 37: "Right Cross, Left Hook, Right Hook, Left Leg Kick, Right Uppercut", 38: "Jab, Right Cross, Left Hook, Right Uppercut, Left Hook", 39: "Cross, Left Hook, Right Body Kick, Left Low Kick", 40: "Left Hook, Right Cross, Left Uppercut, Right Cross", 41: "Right Cross, Left Hook, Left Body Hook, Right Hook, Left Roundhouse Kick", 42: "Jab, Cross, Left Uppercut, Right Low Kick, Left Body Kick", 43: "Left Hook, Right Hook, Left High Kick, Right Cross, Left Low Kick", 44: "Jab, Right Cross, Left Hook, Right Low Kick, Left Hook, Right Cross", 45: "Cross, Left Hook, Right Uppercut, Left High Kick", 46: "Jab, Cross, Left Hook, Right Hook, Left High Kick, Right Leg Kick", 47: "Left Jab, Right Cross, Left Uppercut, Right Hook, Left Roundhouse Kick", 48: "Right Cross, Left Hook, Left High Kick, Right Hook, Left Low Kick", 49: "Left Hook, Right Cross, Left Uppercut, Right Leg Kick, Left Cross", 50: "Jab, Cross, Left Hook, Right Hook, Left High Kick, Right Cross", 51: "Jab, Cross, Left Hook, Right Overhand", 52: "Jab, Cross, Left Uppercut, Right Hook", 53: "Left Hook, Right Uppercut, Left Hook, Right Cross", 54: "Right Cross, Left Hook, Right Hook", 55: "Double Jab, Right Overhand, Left Hook", 56: "Jab, Cross, Liver Shot", 57: "Right Uppercut, Left Hook, Right Hook", 58: "Cross, Left Hook, Right Head Kick", 59: "Right Straight, Left Hook to the Body, Right Uppercut", 60: "Left Hook, Right Hook, Left Hook to the Liver", 61: "Jab, Cross, Left Head Kick", 62: "Left Hook, Right Low Kick, Left Hook, Right High Kick", 63: "Cross, Left Body Kick, Right Head Kick", 64: "Right Low Kick, Left Hook, Right Head Kick", 65: "Left Uppercut, Right Body Kick, Left High Kick", 66: "Jab, Cross, Spinning Heel Kick", 67: "Lead Teep, Right Cross, Left Head Kick", 68: "Left Hook, Right Body Kick, Left Switch Kick", 69: "Right Body Kick, Left Hook, Right Overhand", 70: "Fake Low Kick, Question Mark Kick", 71: "Clinch, Right Knee, Left Elbow", 72: "Right Cross, Left Elbow, Right Knee", 73: "Teep, Right Cross, Left Step-in Elbow", 74: "Jab, Cross, Right Flying Knee", 75: "Cross, Clinch, Right Knee to the Liver", 76: "Step-in Elbow, Right Hook, Left Head Kick", 77: "Jab, Right Uppercut, Left Knee", 78: "Right Hook, Left Elbow, Right Head Kick", 79: "Left Body Kick, Right Elbow, Left Hook", 80: "Teep, Right Hook, Spinning Elbow", 81: "Left Hook, Spinning Back Kick to the Liver", 82: "Right Cross, Spinning Backfist", 83: "Jab, Left Hook, Spinning Heel Kick", 84: "Low Kick, Superman Punch, Left Head Kick", 85: "Cross, Spinning Hook Kick", 86: "Step-in Elbow, Spinning Back Kick", 87: "Flying Knee, Right Overhand", 88: "Jab, Right Hook, Spinning Elbow", 89: "Teep to the Face, Cross, Left Head Kick", 90: "Switch Kick, Spinning Heel Kick", 91: "Jab, Cross, Right Flying Knee", 92: "Right Hook, Left Hook, Right High Kick", 93: "Body Kick, Hook, Superman Punch", 94: "Uppercut, Right Hook, Left Head Kick", 95: "Right Hook, Left Body Kick, Right Spinning Hook Kick", 96: "Jab, Cross, Lead Head Kick", 97: "Cross, Hook, Overhand Right, Left Head Kick", 98: "Lead Uppercut, Overhand Right, High Kick", 99: "Teep, Cross, Hook, High Kick", 100: "Cross, Clinch Knee, Right Hook, High Kick" },
    'Muay Thai': { 1: "Jab > Cross > Left Hook > Right Roundhouse Kick", 2: "Cross > Left Hook > Right Uppercut > Left Kick to the Liver", 3: "Jab > Right Overhand > Left Kick to the Head", 4: "Lead Uppercut > Right Cross > Left Hook > Right Low Kick", 5: "Jab > Cross > Right Teep > Left High Kick", 6: "Jab > Cross > Right Up Elbow > Left Hook > Right Elbow", 7: "Lead Uppercut > Right Overhand > Left Spinning Elbow", 8: "Right Cross > Left Uppercut > Right Horizontal Elbow", 9: "Left Hook > Right Elbow > Left Knee to the Body", 10: "Jab > Right Elbow > Left Hook > Right Uppercut", 11: "Jab > Right Uppercut > Left Knee to the Solar Plexus", 12: "Left Teep > Jab > Right Knee to the Body", 13: "Right Cross > Left Hook > Right Jumping Knee", 14: "Left Hook to the Body > Right Knee to the Chin", 15: "Jab > Cross > Clinch > Right Knee to the Liver", 16: "Right Low Kick > Jab > Cross > Left High Kick", 17: "Left Teep > Right Low Kick > Left Hook > Right Overhand", 18: "Jab > Cross > Right Low Kick > Right Head Kick", 19: "Inside Low Kick > Left Hook > Right Cross > Left Hook to the Body", 20: "Lead Hook > Rear Low Kick > Rear Overhand Punch", 21: "Jab > Cross > Left Hook > Right Head Kick", 22: "Teep > Jab > Right Teep > Left High Kick", 23: "Left Hook > Right Cross > Left High Kick", 24: "Left Body Kick > Right Hook > Left Head Kick", 25: "Right Low Kick > Jab > Cross > Left Head Kick", 26: "Left Hook > Right Clinch > Left Knee to the Chin", 27: "Cross > Clinch > Left Elbow > Right Knee", 28: "Jab > Right Cross > Plum Clinch > Left Knee to the Solar Plexus", 29: "Overhand Right > Clinch > Repeated Right Knees to the Head", 30: "Right Uppercut > Clinch > Left Horizontal Elbow", 31: "Jab > Spinning Back Elbow", 32: "Cross > Left Hook > Spinning Back Kick", 33: "Jab > Cross > Spinning Back Fist", 34: "Teep > Spinning Heel Kick", 35: "Right Hook > Spinning Elbow > Right High Kick", 36: "Front Teep to the Face", 37: "Jab > Right Teep to the Body > Left Head Kick", 38: "Teep > Right Cross > Left Hook > Right Teep", 39: "Left Teep > Right Hook > Left Teep to the Solar Plexus", 40: "Left Teep > Right Teep > Left Hook > Right Roundhouse Kick", 41: "Left Hook to the Body > Overhand Right", 42: "Jab > Overhand Right > Left Uppercut > Right Hook", 43: "Cross > Left Hook > Overhand Right", 44: "Right Uppercut > Left Hook > Overhand Right", 45: "Right Low Kick > Left Hook > Overhand Right", 46: "Jab, Cross, Left Hook, Right Low Kick", 47: "Jab, Cross, Left Hook, Right Elbow", 48: "Jab, Left Hook, Right Uppercut, Right Elbow", 49: "Cross, Left Hook, Right Hook, Left Kick", 50: "Right Low Kick, Left Hook, Right Cross", 51: "Jab, Left Hook, Right Cross, Left Knee", 52: "Left Hook, Right Hook, Left Knee, Right Hook", 53: "Left Hook, Right Elbow, Right Kick", 54: "Jab, Left Hook, Right Cross, Right Elbow", 55: "Right Low Kick, Left Hook, Right Hook, Left High Kick", 56: "Left Hook, Right Hook, Left Elbow, Right Cross", 57: "Cross, Left Hook, Left Low Kick, Right Elbow", 58: "Right Low Kick, Left Hook, Right Hook", 59: "Left Hook, Right Cross, Left Knee", 60: "Cross, Left Hook, Left High Kick", 61: "Jab, Left Hook, Right Elbow, Left Knee", 62: "Left Hook, Right Hook, Left Low Kick, Right Elbow", 63: "Cross, Left Hook, Right Elbow", 64: "Left Hook, Right Cross, Left Elbow, Right Low Kick", 65: "Right Hook, Left Hook, Left High Kick", 66: "Jab, Cross, Right Uppercut, Left Hook", 67: "Jab, Left Hook, Right Elbow, Left Kick", 68: "Cross, Right Hook, Left Knee, Right Elbow", 69: "Jab, Cross, Left Hook, Left Elbow", 70: "Left Hook, Right Hook, Left Knee, Right Cross", 71: "Jab, Cross, Left Hook, Left Low Kick", 72: "Cross, Left Hook, Left Elbow, Right Knee", 73: "Right Cross, Left Hook, Right Low Kick", 74: "Left Hook, Right Hook, Left High Kick", 75: "Jab, Left Hook, Right Elbow, Left High Kick", 76: "Cross, Left Hook, Right Elbow, Left Knee", 77: "Right Cross, Left Hook, Left Elbow, Right Low Kick", 78: "Jab, Left Hook, Right Hook, Left Elbow", 79: "Cross, Left Hook, Right Elbow, Left Low Kick", 80: "Left Hook, Right Hook, Left Knee, Right High Kick", 81: "Jab, Right Cross, Left Hook, Left Knee", 82: "Jab, Left Hook, Right Cross, Left Elbow", 83: "Right Low Kick, Left Hook, Right Cross, Left Elbow", 84: "Jab, Cross, Left Hook, Right High Kick", 85: "Jab, Right Cross, Left Hook, Left Low Kick", 86: "Jab, Left Hook, Right Hook, Left Knee", 87: "Cross, Left Hook, Right Cross, Left High Kick", 88: "Jab, Cross, Left Hook, Left High Kick", 89: "Cross, Left Hook, Right Elbow, Left High Kick", 90: "Jab, Left Hook, Right Cross, Left Kick", 91: "Left Hook, Right Cross, Left Elbow, Right High Kick" },
    'MMA': { 1: "Jab → Cross → Left Hook", 2: "Jab → Cross → Right Head Kick", 3: "Inside Leg Kick → Overhand Right", 4: "Cross → Left Hook → Right Uppercut", 5: "Jab → Rear Body Kick", 6: "Double Jab → Cross → Left Hook → Right Leg Kick", 7: "Jab → Fake Cross → Lead Head Kick", 8: "Left Hook to the Body → Left Hook to the Head", 9: "Cross → Left Hook → Spinning Back Fist", 10: "Jab → Cross → Lead Uppercut", 11: "Teep Kick → Overhand Right", 12: "Jab → Cross → Rear Knee", 13: "Slip Opponent's Jab → Overhand Right", 14: "Cross → Rear Elbow", 15: "Jab → Cross → Lead Hook → Rear Low Kick", 16: "Right Cross → Left Hook → Right Uppercut → Left Head Kick", 17: "Fake Cross → Rear Head Kick", 18: "Jab → Cross → Duck Opponent's Punch → Right Uppercut", 19: "Right Hook → Left Hook → Right Hook", 20: "Jab → Rear Uppercut → Lead Hook", 21: "Jab → Cross → Rear Teep Kick", 22: "Lead Body Hook → Overhand Right", 23: "Cross → Slip Opponent's Punch → Left Hook", 24: "Cross → Spinning Back Kick", 25: "Jab → Cross → Hook → Low Kick", 26: "Jab → Cross → Left Uppercut → Right Hook", 27: "Fake Jab → Overhand Right → Left Hook", 28: "Teep Kick → Jab → Cross", 29: "Lead Hook → Rear Low Kick → Rear Head Kick", 30: "Jab → Cross → Lead Hook → Spinning Back Elbow", 31: "Cross → Step Back → Right High Kick", 32: "Jab → Rear Knee → Left Hook", 33: "Cross → Lead Uppercut → Cross", 34: "Inside Leg Kick → Cross → Overhand Right", 35: "Cross → Left Hook → Superman Punch", 36: "Jab → Right Hook → Spinning Hook Kick", 37: "Fake Cross → Spinning Back Kick to the Body", 38: "Jab → Jab → Overhand Right → Rear Uppercut", 39: "Cross → Left Hook → Right Hook → Left Hook → Rear Head Kick", 40: "Jab → Fake Cross → Left Hook → Right Uppercut", 41: "Jab → Cross → Lead Body Hook → Rear Head Kick", 42: "Slip Opponent’s Jab → Lead Uppercut → Cross", 43: "Jab → Rear Uppercut → Lead Hook → Rear Low Kick", 44: "Cross → Lead Hook → Rear Elbow", 45: "Overhand Right → Left Hook → Right Uppercut", 46: "Jab → Cross → Rear Leg Kick → Spinning Back Fist", 47: "Cross → Left Hook → Overhand Right → Left Hook", 48: "Jab → Cross → Step Forward → Rear Head Kick", 49: "Inside Leg Kick → Cross → Lead Hook → Rear Uppercut", 50: "Jab → Cross → Lead Hook → Rear Spinning Hook Kick", 51: "Lead Body Hook → Cross → Rear Uppercut", 52: "Jab → Cross → Lead Head Kick", 53: "Teep Kick → Step Back → Cross → Left Hook", 54: "Jab → Overhand Right → Left Hook", 55: "Cross → Lead Hook → Cross → Rear Knee", 56: "Step Back → Right Uppercut → Left Hook", 57: "Jab → Cross → Fake Low Kick → Rear Head Kick", 58: "Jab → Cross → Lead Hook → Spinning Heel Kick", 59: "Cross → Duck Opponent’s Hook → Right Uppercut", 60: "Overhand Right → Lead Hook → Cross → Rear Head Kick", 61: "Jab → Cross → Lead Hook → Rear Flying Knee", 62: "Slip Opponent’s Jab → Overhand Right → Left Hook", 63: "Jab → Fake Cross → Lead Hook → Rear Spinning Elbow", 64: "Inside Leg Kick → Cross → Left Hook → Overhand Right", 65: "Jab → Cross → Body Hook → Overhand Right", 66: "Jab → Cross → Step Back → Spinning Back Kick", 67: "Rear Teep Kick → Overhand Right", 68: "Cross → Lead Hook → Rear Uppercut → Rear Head Kick", 69: "Jab → Cross → Lead Uppercut → Cross", 70: "Right Hook → Left Hook → Right Cross → Rear Head Kick", 71: "Jab → Fake Cross → Rear Uppercut", 72: "Cross → Duck → Right Hook → Left Hook", 73: "Jab → Cross → Lead Hook → Rear Spinning Back Kick", 74: "Lead Hook → Cross → Step Forward → Rear Elbow", 75: "Overhand Right → Rear Uppercut → Lead Hook", 76: "Jab → Cross → Rear Low Kick → Spinning Hook Kick", 77: "Jab → Cross → Overhand Right → Rear Knee", 78: "Jab → Fake Cross → Left Hook → Rear Spinning Heel Kick", 79: "Jab → Cross → Lead Hook → Rear Superman Punch", 80: "Jab → Rear Teep Kick → Cross → Lead Hook", 81: "Jab → Cross → Fake Low Kick → Spinning Back Kick", 82: "Lead Body Hook → Rear Uppercut → Cross", 83: "Jab → Cross → Lead Hook → Jumping Switch Knee", 84: "Jab → Cross → Duck → Right Uppercut", 85: "Cross → Lead Hook → Rear Leg Kick", 86: "Jab → Cross → Rear Spinning Hook Kick", 87: "Jab → Cross → Lead Hook → Flying Knee", 88: "Jab → Rear Uppercut → Lead Hook → Cross", 89: "Inside Leg Kick → Overhand Right → Rear Head Kick", 90: "Jab → Fake Cross → Rear Spinning Back Elbow", 91: "Cross → Left Hook → Right Hook → Rear Head Kick", 92: "Jab → Cross → Lead Hook → Rear Uppercut", 93: "Jab → Rear Teep Kick → Spinning Heel Kick", 94: "Jab → Cross → Left Hook → Spinning Back Fist", 95: "Jab → Fake Cross → Rear Spinning Hook Kick", 96: "Inside Leg Kick → Cross → Rear Spinning Back Kick", 97: "Jab → Cross → Rear Leg Kick → Spinning Heel Kick", 98: "Overhand Right → Lead Hook → Rear Uppercut → Rear Head Kick", 99: "Jab → Rear Superman Punch → Rear Spinning Hook Kick", 100: "Jab → Cross → Lead Hook → Rear Spinning Elbow" },
    'Combat Sambo': { 1: "Jab, cross, left hook, right low kick", 2: "Front kick, cross, left hook, takedown", 3: "Slip, right uppercut, left hook, knee strike", 4: "Parry, overhand right, left body hook, right elbow", 5: "Double leg takedown, ground and pound", 6: "Clinch, knee strike, hip throw", 7: "Jab, cross, duck under, rear naked choke", 8: "Low kick, cross, hook, high kick", 9: "Feint jab, overhand right, left hook, ankle pick", 10: "Sprawl, front headlock, knee strikes", 11: "Jab, cross, left hook, right low kick, takedown", 12: "Side step, right hook, left uppercut, clinch, throw", 13: "Push kick, spinning back fist, clinch, hip toss", 14: "Parry, cross, hook, leg sweep", 15: "Jab, cross, level change, double leg takedown", 16: "Inside leg kick, cross, hook, outside leg kick", 17: "Overhand right, left hook, right uppercut, takedown", 18: "Clinch, knee strike, foot sweep, ground control", 19: "Fake takedown, uppercut, hook, high kick", 20: "Jab, cross, bob and weave, body shot, takedown", 21: "Front kick, cross, hook, spinning back kick", 22: "Slip jab, counter cross, left hook, right low kick", 23: "Catch kick, sweep, ground and pound", 24: "Jab, cross, level change, single leg takedown", 25: "Clinch, dirty boxing, knee strike, throw", 26: "Low kick, jab, cross, high kick", 27: "Feint kick, overhand right, left hook, takedown", 28: "Sprawl, front headlock, gator roll", 29: "Jab, cross, duck under, back take", 30: "Push kick, spinning heel kick, clinch, throw", 31: "Parry, elbow strike, knee, hip throw", 32: "Inside leg kick, jab, cross, outside leg kick, takedown", 33: "Overhand right, left hook, right uppercut, ankle pick", 34: "Clinch, knee strike, foot sweep, arm bar", 35: "Fake jab, right uppercut, left hook, takedown", 36: "Front kick, spinning back fist, clinch, suplex", 37: "Slip, body shot, hook, high kick", 38: "Jab, cross, level change, ankle pick", 39: "Low kick, overhand right, left hook, clinch, throw", 40: "Catch kick, counter punch, takedown", 41: "Jab, cross, bob and weave, liver shot, clinch", 42: "Push kick, cross, hook, leg kick", 43: "Feint takedown, uppercut, hook, knee strike", 44: "Parry, cross counter, hook, takedown", 45: "Clinch, knee strike, outside trip", 46: "Inside leg kick, jab, cross, high kick", 47: "Overhand right, left hook, level change, double leg", 48: "Sprawl, front headlock, snap down", 49: "Jab, cross, slip, body shot, clinch, throw", 50: "Low kick, jab, cross, spinning back kick", 51: "Feint jab, right hook, left uppercut, takedown", 52: "Catch punch, counter elbow, knee, throw", 53: "Push kick, spinning back fist, takedown", 54: "Slip, right uppercut, left hook, right low kick", 55: "Jab, cross, level change, single leg, lift, slam", 56: "Clinch, dirty boxing, knee strike, foot sweep", 57: "Inside leg kick, cross, hook, outside leg kick, clinch", 58: "Overhand right, left hook, right uppercut, double leg", 59: "Front kick, jab, cross, high kick", 60: "Feint kick, right hook, left uppercut, takedown", 61: "Sprawl, front headlock, arm drag to back take", 62: "Jab, cross, duck under, suplex", 63: "Low kick, overhand right, left hook, clinch, knee", 64: "Parry, counter cross, hook, spinning back kick", 65: "Clinch, knee strike, hip throw, ground control", 66: "Fake jab, right uppercut, left hook, leg kick", 67: "Push kick, cross, hook, takedown", 68: "Slip, body shot, hook, high kick, clinch", 69: "Jab, cross, level change, ankle pick, ground and pound", 70: "Inside leg kick, jab, cross, outside leg kick, spinning back fist", 71: "Overhand right, left hook, right uppercut, clinch, throw", 72: "Catch kick, sweep, mount, submission attempt", 73: "Front kick, spinning heel kick, takedown", 74: "Feint takedown, uppercut, hook, high kick", 75: "Parry, elbow strike, knee, outside trip", 76: "Clinch, dirty boxing, knee strike, inside trip", 77: "Low kick, jab, cross, spinning back kick, clinch", 78: "Slip jab, counter cross, left hook, right low kick, takedown", 79: "Sprawl, front headlock, go behind", 80: "Jab, cross, bob and weave, liver shot, takedown", 81: "Push kick, overhand right, left hook, clinch, throw", 82: "Feint jab, right hook, left uppercut, leg kick", 83: "Catch punch, counter knee, clinch, throw", 84: "Inside leg kick, cross, hook, high kick, takedown", 85: "Overhand right, left hook, level change, single leg", 86: "Front kick, jab, cross, spinning back fist", 87: "Slip, right uppercut, left hook, takedown", 88: "Jab, cross, duck under, back take, rear naked choke", 89: "Low kick, overhand right, left hook, right elbow", 90: "Parry, counter hook, cross, knee strike", 91: "Clinch, knee strike, foot sweep, arm lock", 92: "Fake takedown, uppercut, hook, spinning back kick", 93: "Push kick, cross, hook, outside leg kick, clinch", 94: "Slip, body shot, hook, high kick, takedown", 95: "Jab, cross, level change, double leg, ground and pound", 96: "Inside leg kick, jab, cross, outside leg kick, spinning heel kick", 97: "Overhand right, left hook, right uppercut, clinch, suplex", 98: "Catch kick, counter punch, takedown, submission attempt", 99: "Front kick, spinning back fist, clinch, knee strike, throw", 100: "Feint jab, right hook, left uppercut, leg kick, takedown" },
    'BJJ': { 1: "Double leg takedown > Mount > Ground and pound", 2: "Single leg takedown > Side control > Kimura", 3: "Clinch > Hip throw > Armbar", 4: "Sprawl > Front headlock > Guillotine choke", 5: "Pull guard > Sweep > Rear naked choke", 6: "Ankle pick > Knee on belly > Americana", 7: "Arm drag > Back take > Rear naked choke", 8: "Duck under > Back take > Bow and arrow choke", 9: "Snap down > Front headlock > D'arce choke", 10: "Osoto gari > Side control > North-south choke", 11: "Collar tie > Knee tap > Mount > Ezekiel choke", 12: "Arm wrap > Trip > Kesa gatame > Arm triangle", 13: "Underhook > Lateral drop > Side control > Kimura", 14: "Overhook > Uchi mata > Mount > Cross collar choke", 15: "Wrist control > Foot sweep > Knee on belly > Straight armbar", 16: "Two-on-one > Arm drag > Back take > Rear naked choke", 17: "Collar grab defense > Arm drag > Single leg > Ground and pound", 18: "Haymaker defense > Clinch > Hip throw > Mount", 19: "Bear hug defense > Lateral drop > Side control > Americana", 20: "Headlock defense > Switch > Back take > Rear naked choke", 21: "Guard pull > Triangle choke > Armbar", 22: "Double leg > Half guard pass > Mount > Arm triangle", 23: "Single leg > Knee cut pass > Side control > Kimura", 24: "Clinch > Foot sweep > Mount > Cross collar choke", 25: "Sprawl > Spin behind > Back take > Bow and arrow choke", 26: "Arm drag > Single leg > Knee on belly > Straight armbar", 27: "Duck under > Waist lock > Suplex > Rear naked choke", 28: "Snap down > Front headlock > Anaconda choke", 29: "Osoto gari > Scarf hold > Americana", 30: "Collar tie > Inside trip > Mount > Ezekiel choke", 31: "Underhook > Outside trip > Side control > North-south choke", 32: "Overhook > Harai goshi > Mount > Arm triangle", 33: "Wrist control > Ankle pick > Knee on belly > Kimura", 34: "Two-on-one > Russian tie > Single leg > Ground and pound", 35: "Collar grab defense > Osoto gari > Side control > Americana", 36: "Haymaker defense > Slip > Double leg > Mount", 37: "Bear hug defense > Hip toss > Side control > Kimura", 38: "Headlock defense > Roll > Mount > Cross collar choke", 39: "Guard pull > Omoplata > Straight armlock", 40: "Double leg > Toreando pass > Side control > Arm triangle", 41: "Single leg > X-pass > Mount > Ezekiel choke", 42: "Clinch > Uchi mata > Side control > North-south choke", 43: "Sprawl > Go behind > Back take > Rear naked choke", 44: "Arm drag > Kouchi gari > Knee on belly > Straight armbar", 45: "Duck under > Body lock > Suplex > Arm triangle", 46: "Snap down > Front headlock > Japanese necktie", 47: "Osoto gari > Kesa gatame > Arm triangle", 48: "Collar tie > Ankle pick > Side control > Kimura", 49: "Underhook > Sumi gaeshi > Mount > Cross collar choke", 50: "Overhook > Ouchi gari > Side control > Americana", 51: "Wrist control > De ashi barai > Knee on belly > Straight armbar", 52: "Two-on-one > Fireman's carry > Side control > North-south choke", 53: "Collar grab defense > Seoi nage > Mount > Ezekiel choke", 54: "Haymaker defense > Bob and weave > Double leg > Ground and pound", 55: "Bear hug defense > Ura nage > Side control > Kimura", 56: "Headlock defense > Sit-through > Back take > Bow and arrow choke", 57: "Guard pull > Scissor sweep > Mount > Cross collar choke", 58: "Double leg > Stack pass > Mount > Arm triangle", 59: "Single leg > Smash pass > Side control > Americana", 60: "Clinch > Kosoto gake > Side control > Kimura", 61: "Sprawl > Limp arm > Front headlock > Anaconda choke", 62: "Arm drag > Tai otoshi > Mount > Ezekiel choke", 63: "Duck under > Single leg > Knee on belly > Straight armbar", 64: "Snap down > Spiral ride > Back take > Rear naked choke", 65: "Osoto gari > Modified scarf hold > Arm triangle", 66: "Collar tie > Double leg > Half guard pass > Mount", 67: "Underhook > Uchi mata > Side control > Kimura", 68: "Overhook > Tani otoshi > Mount > Cross collar choke", 69: "Wrist control > Tomoe nage > Armbar", 70: "Two-on-one > Knee tap > Side control > North-south choke", 71: "Collar grab defense > Hip throw > Mount > Ezekiel choke", 72: "Haymaker defense > Level change > Double leg > Ground and pound", 73: "Bear hug defense > Sumi gaeshi > Mount > Arm triangle", 74: "Headlock defense > Arm trap > Back take > Rear naked choke", 75: "Guard pull > Flower sweep > Mount > Cross collar choke", 76: "Double leg > Over-under pass > Side control > Kimura", 77: "Single leg > Leg drag pass > Mount > Ezekiel choke", 78: "Clinch > Ouchi gari > Side control > Americana", 79: "Sprawl > Switch > Back take > Bow and arrow choke", 80: "Arm drag > Ankle pick > Knee on belly > Straight armbar", 81: "Duck under > High crotch > Knee on belly > Kimura", 82: "Snap down > Cow catcher > D'arce choke", 83: "Osoto gari > Knee on stomach > Straight armlock", 84: "Collar tie > Single leg > Half guard pass > Mount", 85: "Underhook > Kouchi gari > Side control > North-south choke", 86: "Overhook > Sasae tsurikomi ashi > Mount > Arm triangle", 87: "Wrist control > Sumi gaeshi > Armbar", 88: "Two-on-one > Inside trip > Side control > Americana", 89: "Collar grab defense > Double leg > Toreando pass > Mount", 90: "Haymaker defense > Duck under > Back take > Rear naked choke", 91: "Bear hug defense > Foot sweep > Side control > Kimura", 92: "Headlock defense > Hip bump > Mount > Cross collar choke", 93: "Guard pull > Pendulum sweep > Mount > Ezekiel choke", 94: "Double leg > Pressure pass > Side control > Arm triangle", 95: "Single leg > Bull fighter pass > Mount > Cross collar choke", 96: "Clinch > Harai goshi > Side control > Americana", 97: "Sprawl > Crossface > Front headlock > Anaconda choke", 98: "Arm drag > Uchi mata > Mount > Arm triangle", 99: "Duck under > Double leg > Half guard pass > Mount", 100: "Snap down > Guillotine > Mount > Ezekiel choke", 101: "Osoto gari > Side control > Paper cutter choke", 102: "Collar tie > Foot sweep > Knee on belly > Straight armbar", 103: "Underhook > Body lock takedown > Side control > Kimura", 104: "Overhook > Kosoto gari > Mount > Cross collar choke", 105: "Wrist control > Seoi nage > Armbar", 106: "Two-on-one > Outside trip > Side control > North-south choke", 107: "Collar grab defense > Arm drag > Back take > Rear naked choke", 108: "Haymaker defense > Shoot > Single leg > Ground and pound", 109: "Bear hug defense > Uchi mata > Mount > Ezekiel choke", 110: "Headlock defense > Lateral drop > Side control > Americana", 111: "Guard pull > Hip bump sweep > Mount > Arm triangle", 112: "Double leg > Knee slice pass > Side control > Kimura", 113: "Single leg > Backstep pass > Mount > Cross collar choke", 114: "Clinch > Foot sweep > Side control > North-south choke", 115: "Sprawl > Snap down > Front headlock > D'arce choke", 116: "Arm drag > Ouchi gari > Knee on belly > Straight armbar", 117: "Duck under > Ankle pick > Side control > Americana", 118: "Snap down > Arm-in guillotine > Mount", 119: "Osoto gari > Kesa gatame > Chest compression", 120: "Collar tie > Lateral drop > Side control > Kimura", 121: "Underhook > Sumi gaeshi > Armbar", 122: "Overhook > Tai otoshi > Mount > Ezekiel choke", 123: "Wrist control > Kouchi gari > Knee on belly > Straight armbar", 124: "Two-on-one > Hip throw > Side control > Arm triangle", 125: "Collar grab defense > Duck under > Back take > Bow and arrow choke", 126: "Haymaker defense > Clinch > Osoto gari > Mount", 127: "Bear hug defense > Suplex > Side control > Kimura", 128: "Headlock defense > Sit-out > Back take > Rear naked choke", 129: "Guard pull > Kimura sweep > Side control > Americana", 130: "Double leg > Double under pass > Mount > Cross collar choke", 131: "Single leg > Tripod pass > Side control > North-south choke", 132: "Clinch > Inside trip > Mount > Arm triangle", 133: "Sprawl > Spiral ride > Back take > Rear naked choke", 134: "Arm drag > Fireman's carry > Side control > Kimura", 135: "Duck under > Uchi mata > Mount > Ezekiel choke", 136: "Snap down > Clock choke > Mount", 137: "Osoto gari > Side control > Straight armlock", 138: "Collar tie > Single leg > Knee cut pass > Mount", 139: "Underhook > Harai goshi > Side control > Americana", 140: "Overhook > De ashi barai > Mount > Cross collar choke", 141: "Wrist control > Ankle pick > Side control > North-south choke", 142: "Two-on-one > Kosoto gake > Mount > Arm triangle", 143: "Collar grab defense > Snap down > Front headlock > Anaconda choke", 144: "Haymaker defense > Slip > Clinch > Hip throw > Mount", 145: "Bear hug defense > Back trip > Side control > Kimura", 146: "Headlock defense > Forward roll > Mount > Ezekiel choke", 147: "Guard pull > Tripod sweep > Mount > Cross collar choke", 148: "Double leg > Leg weave pass > Side control > Americana", 149: "Single leg > Over-under pass > Mount > Arm triangle", 150: "Clinch > Foot sweep > Knee on belly > Straight armbar" },
    'Wrestling': { 1: "Double leg takedown to side control", 2: "Single leg takedown to half guard", 3: "Arm drag to rear naked choke", 4: "Clinch to hip throw", 5: "Sprawl to front headlock", 6: "Ankle pick to knee on belly", 7: "Snap down to guillotine choke", 8: "Body lock to suplex", 9: "Underhook to trip takedown", 10: "Collar tie to knee strike", 11: "Arm wrap to back take", 12: "Duck under to waist lock takedown", 13: "Overhook to lateral drop", 14: "Wrist control to arm drag", 15: "Leg lace to calf slicer", 16: "Fireman's carry to armbar", 17: "Shoulder throw to mount", 18: "Ankle sweep to kneebar", 19: "Arm trap to hip toss", 20: "Headlock to throw", 21: "Foot sweep to side control", 22: "Arm spin to back mount", 23: "Knee tap to north-south position", 24: "Whizzer to outside trip", 25: "Collar drag to anaconda choke", 26: "Leg hook to sweep", 27: "Arm control to kimura", 28: "Clinch to knee tap", 29: "Wrist lock to takedown", 30: "Snap down to front choke", 31: "Arm bar from guard", 32: "Double underhooks to body lock takedown", 33: "Single collar tie to elbow strike", 34: "Leg ride to calf crush", 35: "Arm triangle from mount", 36: "Butterfly sweep to mount", 37: "Ankle pick to leg lace", 38: "Arm drag to single leg", 39: "Collar tie to Russian tie", 40: "Underhook to back take", 41: "Snap down to cradle", 42: "Arm wrap to suplex", 43: "Wrist control to standing kimura", 44: "Knee shield to sweep", 45: "Arm trap to shoulder lock", 46: "Head and arm control to throw", 47: "Ankle pick to single leg X-guard", 48: "Clinch to inside trip", 49: "Arm drag to body lock", 50: "Collar tie to head snap", 51: "Underhook to outside trip", 52: "Wrist control to Russian arm drag", 53: "Knee tap to side control", 54: "Arm wrap to back take", 55: "Snap down to arm triangle", 56: "Double leg to mount", 57: "Single leg to back take", 58: "Arm drag to duck under", 59: "Clinch to foot sweep", 60: "Sprawl to spin behind", 61: "Ankle pick to back control", 62: "Snap down to d'arce choke", 63: "Body lock to mat return", 64: "Underhook to lateral drop", 65: "Collar tie to snap down", 66: "Arm wrap to hip throw", 67: "Duck under to rear bodylock", 68: "Overhook to headlock throw", 69: "Wrist control to single leg", 70: "Leg lace to back take", 71: "Fireman's carry to side control", 72: "Shoulder throw to armbar", 73: "Ankle sweep to leg lock", 74: "Arm trap to sacrifice throw", 75: "Headlock to arm triangle", 76: "Foot sweep to mount", 77: "Arm spin to kimura trap", 78: "Knee tap to crucifix", 79: "Whizzer to hip toss", 80: "Collar drag to back mount", 81: "Leg hook to back take", 82: "Arm control to omoplata", 83: "Clinch to suplex", 84: "Wrist lock to arm drag", 85: "Snap down to rear naked choke", 86: "Guard pull to sweep", 87: "Double underhooks to high crotch", 88: "Single collar tie to level change", 89: "Leg ride to turk", 90: "Arm triangle to mount", 91: "Butterfly guard to X-guard", 92: "Ankle pick to single leg", 93: "Arm drag to clinch", 94: "Collar tie to arm drag", 95: "Underhook to knee tap", 96: "Snap down to front headlock", 97: "Arm wrap to inside trip", 98: "Wrist control to duck under", 99: "Knee shield to back take", 100: "Arm trap to double leg" },
    'Judo': { 1: "O Goshi (Major Hip Throw)", 2: "Seoi Nage (Shoulder Throw)", 3: "Uchi Mata (Inner Thigh Throw)", 4: "Tai Otoshi (Body Drop)", 5: "Koshi Guruma (Hip Wheel)", 6: "Harai Goshi (Hip Sweep)", 7: "Sumi Gaeshi (Corner Reversal)", 8: "Ippon Seoi Nage (One-Arm Shoulder Throw)", 9: "Osoto Gari (Large Outer Reap)", 10: "Osoto Otoshi (Large Outer Drop)", 11: "Ashi Guruma (Foot Wheel)", 12: "De Ashi Barai (Advanced Foot Sweep)", 13: "Okuri Ashi Barai (Sliding Foot Sweep)", 14: "Sasae Tsurikomi Ashi (Supporting Foot Lift Sweep)", 15: "Hiza Guruma (Knee Wheel)", 16: "Uchi Ashi Barai (Inner Foot Sweep)", 17: "Kouchi Gari (Small Inner Reap)", 18: "Kouchi Barai (Small Inner Sweep)", 19: "Ashi Tori Zemi (Foot Catching)", 20: "Tsurikomi Ashi (Lifting Foot Sweep)", 21: "Tomoe Nage (Circle Throw)", 22: "Ura Nage (Back Throw)", 23: "Yoko Gake (Side Hook)", 24: "Yoko Otoshi (Side Drop)", 25: "Hane Goshi (Spring Hip Throw)", 26: "Kani Basami (Crab Leg Sweep)", 27: "Tani Otoshi (Valley Drop)", 28: "Ashi Garami (Leg Trap)", 29: "Uchi Mata Sukashi (Inner Thigh Reversal)", 30: "Kesa Gatame (Scarf Hold)", 31: "Yoko Shiho Gatame (Side Four Corner Hold)", 32: "Tate Shiho Gatame (Top Four Corner Hold)", 33: "Kami Shiho Gatame (Upper Four Corner Hold)", 34: "Juji Gatame (Armbar)", 35: "Ude Garami (Entangled Arm)", 36: "Shime Waza (Strangulation Techniques)", 37: "Kata Gatame (Shoulder Hold)", 38: "Ashi Garami (Leg Entanglement)", 39: "Hiza Gatame (Knee Hold)", 40: "Atemi Waza (Striking Techniques)", 41: "Kansetsu Waza (Joint Locks)", 42: "Ashi Uke (Foot Block)", 43: "Waki Gatame (Armpit Arm Lock)", 44: "Atemi (Striking with the Open Hand)", 45: "Ude Hishigi Juji Gatame (Armbar in Cross Position)", 46: "Ashi Hishigi (Foot Lock)", 47: "Ude Hishigi Ura (Reverse Arm Lock)", 48: "Kote Hishigi (Wrist Lock)", 49: "Kansetsu Waza Kata Gatame (Shoulder Lock)" },};

// ---------- Difficulty tiers (per style: which level numbers are beginner/intermediate/advanced) ----------
const DIFFICULTY_TIERS = {
  'Boxing': { beginner: 12, intermediate: 28, advanced: 40 },
  'Kickboxing': { beginner: 33, intermediate: 66, advanced: 100 },
  'Muay Thai': { beginner: 30, intermediate: 60, advanced: 91 },
  'MMA': { beginner: 33, intermediate: 66, advanced: 100 },
  'Combat Sambo': { beginner: 33, intermediate: 66, advanced: 100 },
  'BJJ': { beginner: 50, intermediate: 100, advanced: 150 },
  'Wrestling': { beginner: 33, intermediate: 66, advanced: 100 },
  'Judo': { beginner: 16, intermediate: 32, advanced: 49 },
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
};

// Normalize a combo move name to look up in the technique library
const normalizeMove = (move) => {
  let s = move
    .toLowerCase()
    .replace(/\b(left|right|lead|rear)\s*/g, '')
    .replace(/['’]/g, '')
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
    cardGradSelected: ['#F97316', '#EA580C'], cardGradNormal: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'],
    taskContainer: 'rgba(0,0,0,0.25)', iconButton: 'rgba(255,255,255,0.08)', buttonDefault: 'rgba(255,255,255,0.08)',
    modalBg: '#1F2937', overlay: 'rgba(0,0,0,0.6)', accent: '#F97316', accentDark: '#EA580C',
    success: '#22C55E', danger: '#EF4444', test: '#8B5CF6', timerPanel: 'rgba(255,255,255,0.04)',
    toggleOff: 'rgba(255,255,255,0.1)', shadowColor: '#000', border: '#374151',
  },
  light: {
    bgTop: '#F8FAFC', bgBottom: '#E2E8F0', container: '#F8FAFC', text: '#0F172A', textMuted: '#64748B',
    cardBg: 'rgba(255,255,255,0.7)', cardBgSelected: 'rgba(255,255,255,0.95)',
    cardGradSelected: ['#F97316', '#EA580C'], cardGradNormal: ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.6)'],
    taskContainer: 'rgba(0,0,0,0.05)', iconButton: 'rgba(0,0,0,0.06)', buttonDefault: 'rgba(0,0,0,0.06)',
    modalBg: '#FFFFFF', overlay: 'rgba(0,0,0,0.45)', accent: '#EA580C', accentDark: '#C2410C',
    success: '#16A34A', danger: '#DC2626', test: '#7C3AED', timerPanel: 'rgba(0,0,0,0.03)',
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
  let randomLevel;
  if (basicCount > 0 && Math.random() < 0.7) {
    const basics = taskLevels.filter(lv => lv <= basicCount);
    if (basics.length > 0) {
      randomLevel = basics[Math.floor(Math.random() * basics.length)];
    } else {
      randomLevel = taskLevels[Math.floor(Math.random() * taskLevels.length)];
    }
  } else {
    randomLevel = taskLevels[Math.floor(Math.random() * taskLevels.length)];
  }
  return tasks[randomLevel];
};

export default function App() {
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
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [pendingProAction, setPendingProAction] = useState(null);

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
  // Haptics toggle
  const [hapticsEnabled, setHapticsEnabled] = usePersistedState('hapticsEnabled', true);
  const hapticIf = (type) => { if (hapticsEnabled) haptic(type); };

  // ---------- Monetization: soft gate + billing stub ----------
  // Gated feature tap → if not Pro, open the paywall preview instead.
  // The action name lets us (later) deep-link to the exact feature after purchase.
  const requirePro = (actionName = 'feature') => {
    if (isPro) return true;
    setPendingProAction(actionName);
    setPaywallVisible(true);
    track('paywall_shown', { action: actionName });
    return false;
  };
  // Billing stub: native Google Play Billing will replace this when the dev build ships.
  // __DEV__ gate: in production builds this must NOT unlock Pro for free — a real
  // purchase flow (Phase 2) replaces the stub before the store release.
  const purchasePro = (tier) => {
    track('paywall_purchase_attempt', { tier });
    // TODO: call Google Play Billing (react-native-billing / Billing Library) here.
    if (!__DEV__) {
      setPaywallVisible(false);
      Alert.alert('Billing coming soon', 'Purchases will be enabled in the next update. Pro is currently in preview.');
      return;
    }
    // Dev-only: unlock Pro directly for testing.
    setIsPro(true);
    setPaywallVisible(false);
    setPendingProAction(null);
    hapticIf('heavy');
    Alert.alert('Pro unlocked (dev)', `MyCombat Pro (${tier}) is active for testing.`);
  };

  useEffect(() => { track('app_open', { isPro }); }, []);

  // ---------- Audio: cue sounds + music ducking ----------
  const cueSoundRef = useRef(null);
  const playCueSound = async () => {
    if (!cueSound) return;
    try {
      const sound = CUE_SOUNDS[cueSound];
      if (!sound) return;
      if (cueSoundRef.current) {
        try { await cueSoundRef.current.unloadAsync(); } catch (e) {}
      }
      const { sound: player } = await Audio.Sound.createAsync(sound);
      cueSoundRef.current = player;
      await player.playAsync();
    } catch (e) { console.log('cue sound error', e); }
  };
  const setupAudioMode = async () => {
    try {
      // Duck other audio (Spotify/YouTube) instead of cutting it off
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
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
  const METS = { 'Boxing': 8, 'Kickboxing': 9, 'Muay Thai': 10, 'MMA': 9, 'Combat Sambo': 9, 'BJJ': 8, 'Wrestling': 8, 'Judo': 8 };
  const logSession = (style, type, seconds, roundsDone) => {
    const met = METS[style] || 8;
    const hours = seconds / 3600;
    const kcal = Math.round(met * weightKg * hours);
    const entry = {
      date: todayStr(),
      style, type, seconds, rounds: roundsDone, kcal,
    };
    setSessions(prev => [...prev.slice(-199), entry]);
    track('session_completed', { style, type, seconds, rounds: roundsDone, kcal });
    // Ask for a review after the session lands (only once, after 3+ sessions)
    setTimeout(() => { maybeRequestReview(); }, 2500);
  };
  const totalKcal = sessions.reduce((sum, s) => sum + (s.kcal || 0), 0);
  const totalWorkoutSeconds = sessions.reduce((sum, s) => sum + (s.seconds || 0), 0);
  const combosCompleted = sessions.reduce((sum, s) => sum + (s.rounds || 0), 0);
  const monthKey = todayStr().slice(0, 7);
  const monthlyCombos = sessions.filter(s => (s.date || '').slice(0, 7) === monthKey).reduce((sum, s) => sum + (s.rounds || 0), 0);

  // ---------- Combo modifiers (defensive / stance / target zones) ----------
  const applyModifiers = (combo) => {
    if (!modifiersEnabled || !combo) return combo;
    const parts = [];
    if (Math.random() < 0.5) parts.push(COMBO_MODIFIERS.defensive[Math.floor(Math.random() * COMBO_MODIFIERS.defensive.length)]);
    if (Math.random() < 0.3) parts.push(COMBO_MODIFIERS.stance[Math.floor(Math.random() * COMBO_MODIFIERS.stance.length)]);
    let out = combo;
    if (parts.length > 0) out = parts.join(', ') + ' - ' + out;
    if (Math.random() < 0.4) {
      const target = COMBO_MODIFIERS.target[Math.floor(Math.random() * COMBO_MODIFIERS.target.length)];
      out = out + ' (' + target + ')';
    }
    return out;
  };

  // ---------- Program apply ----------
  const applyProgram = (program) => {
    hapticIf('medium');
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

  const recordWorkout = () => {
    const today = todayStr();
    setWorkoutDates(prev => prev.includes(today) ? prev : [...prev, today]);
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
      if ((type === 'combo' || type === 'technique') && prev.length > 0) return [{ text, type }, ...prev];
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

  useEffect(() => {
    loadAvailableVoices();
    return () => { Speech.stop(); };
  }, []);

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
    timerRef.current = { mode: 'work', round: 1, remaining: workPeriod };
    setTimerMode('work');
    setCurrentRound(1);
    setTimeRemaining(workPeriod);
    setTimerActive(true);
    addToSpeechQueue("Starting workout. Round 1", 'timer');
  };

  const stopHiitTimer = () => {
    hapticIf('light');
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
    if (isTraining) stopTrainingSession();
    if (timerActive) stopHiitTimer();  // BUG1: don't silently kill an active HIIT session
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
    if (timerActive) stopHiitTimer();
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
    const rawTask = pickRandomTask(stat, allStyles, difficultyFilter);
    if (!rawTask) {
      // BUG9/11: no combo matches the filter (or style was deleted mid-session)
      Alert.alert('No combos available', `No ${difficultyFilter === 'all' ? '' : difficultyFilter + ' '}combos for ${stat}. Try a different difficulty or style.`);
      return;
    }
    const task = applyModifiers(rawTask);
    setGeneratedTasks(prev => ({ ...prev, [stat]: task }));
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
  const openBuilder = (style) => setBuilder({ visible: true, style, sequence: [] });
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
    return splitCombo(learnModal.combo).map(move => {
      const norm = normalizeMove(move);
      const techs = TECHNIQUES[learnModal.style] || {};
      let tech = techs[norm] || SHARED_TECHNIQUES[norm];
      // Fallbacks: strip 'double/single' prefixes, or try the first two words
      if (!tech) {
        const stripped = norm.replace(/^(double|single|triple)\s+/, '');
        tech = techs[stripped] || SHARED_TECHNIQUES[stripped];
      }
      if (!tech) {
        const firstTwo = norm.split(' ').slice(0, 2).join(' ');
        tech = techs[firstTwo] || SHARED_TECHNIQUES[firstTwo];
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
        <TouchableOpacity style={[styles.testButton, { backgroundColor: theme.test }]} onPress={() => { hapticIf('light'); addToSpeechQueue("Test voice announcement", 'timer'); }}>
          <Text style={styles.testButtonText}>Test Voice</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------- Visual combo preview strip (move chips flow) ----------
  const ComboPreview = ({ combo, styleName }) => {
    if (!combo) return null;
    const moves = splitCombo(combo);
    if (moves.length < 2) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewStrip} contentContainerStyle={styles.previewStripContent}>
        {moves.map((move, idx) => (
          <View key={idx} style={styles.previewStep}>
            <View style={[styles.previewChip, { backgroundColor: theme.taskContainer, borderColor: theme.accent }]}>
              <Text style={[styles.previewChipText, { color: theme.text }]} numberOfLines={1}>{displayText(move)}</Text>
            </View>
            {idx < moves.length - 1 && (
              <Ionicons name="arrow-forward" size={14} color={theme.accent} style={styles.previewArrow} />
            )}
          </View>
        ))}
      </ScrollView>
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

  const CategoryCard = ({ category }) => {
    const task = generatedTasks[category] || null;
    const isSelected = selectedCategory === category;
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
      <TouchableOpacity onPress={() => { hapticIf('light'); setSelectedCategory(category); }} activeOpacity={0.9}>
        <Animated.View style={[styles.categoryCard, { transform: [{ scale: cardScale }], backgroundColor: isSelected ? theme.cardBgSelected : theme.cardBg }]}>
          <LinearGradient
            colors={isSelected ? theme.cardGradSelected : theme.cardGradNormal}
            style={styles.categoryGradient}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleGroup}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                {total > 0 && (
                  <Text style={[styles.progressText, { color: theme.textMuted }]}>
                    Learned {learnCount}/{total}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.favButton}
                accessibilityRole="button"
                accessibilityLabel={fav ? `Remove ${category} from favorites` : `Add ${category} to favorites`}
                onPress={() => task && toggleFavorite(category, task)}
              >
                <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color={fav ? '#FFD700' : theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.taskContainer, { backgroundColor: theme.taskContainer }]}>
              {task && (
                <View style={styles.diffRow}>
                  <View style={[styles.diffDot, { backgroundColor: difficultyColor(category, task) }]} />
                  <Text style={[styles.diffLabel, { color: theme.textMuted }]}>
                    {DIFFICULTY_LABELS[difficultyOf(category, comboLevelOf(category, task))]}
                  </Text>
                </View>
              )}
              <Animated.Text style={[styles.taskText, { fontSize, color: theme.text, opacity: taskOpacity }]}>
                {task ? displayText(task) : 'Tap refresh to generate'}
              </Animated.Text>
              {task && <ComboPreview combo={task} styleName={category} />}
            </View>
            <View style={styles.cardControls}>
              <TouchableOpacity style={styles.controlButton} accessibilityRole="button" accessibilityLabel={`New ${category} combination`} onPress={() => generateTask(category)}>
                <Ionicons name="refresh" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.accent }]}
                accessibilityRole="button"
                accessibilityLabel={`Build a ${category} combo`}
                onPress={() => openBuilder(category)}
              >
                <Ionicons name="hammer" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.test }]}
                accessibilityRole="button"
                accessibilityLabel={`Drill ${category} combination`}
                onPress={() => task && startDrill(category, task)}
              >
                <Ionicons name="target" size={22} color="#fff" />
              </TouchableOpacity>
              {task && (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: theme.accentDark }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${category} combination`}
                  onPress={() => { hapticIf('light'); shareCombo(task, category); }}
                >
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
              {task && (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: theme.test }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show QR code for ${category} combination`}
                  onPress={() => showQR(task, category)}
                >
                  <Ionicons name="qr-code-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
              {!isTraining && !timerActive ? (
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
              accessibilityLabel={task ? `Learn ${category} combo breakdown` : `Learn ${category} techniques`}
              onPress={() => setLearnModal({ visible: true, style: category, combo: task })}
            >
              <Ionicons name="book-outline" size={18} color={theme.accent} />
              <Text style={[styles.learnButtonText, { color: theme.accent }]}>
                {task ? 'Learn This Combo' : 'Learn Techniques'}
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
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Decrease text size" onPress={handleZoomOut}>
              <Ionicons name="remove-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Increase text size" onPress={handleZoomIn}>
              <Ionicons name="add-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, landscapeMode && styles.landscapeScroll]} showsVerticalScrollIndicator={false}>
          {isFirstRun && !arsenalView && (
            <View style={[styles.onboardCard, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
              <Text style={[styles.onboardTitle, { color: theme.text }]}>Your voice-guided fight coach</Text>
              <Text style={[styles.onboardBody, { color: theme.textMuted }]}>
                MyCombat calls out real combinations for 8 martial arts with a round timer, drills, and a technique library. No gym needed.
              </Text>
              <TouchableOpacity style={[styles.onboardButton, { backgroundColor: theme.accent }]} onPress={startFirstWorkout} accessibilityRole="button" accessibilityLabel="Start my first workout">
                <Text style={styles.onboardButtonText}>Start my first workout — Boxing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOnboardDismissed(true)} accessibilityRole="button" accessibilityLabel="Skip onboarding">
                <Text style={[styles.onboardSkip, { color: theme.textMuted }]}>Skip, just show me the app</Text>
              </TouchableOpacity>
            </View>
          )}
          {!arsenalView && <TimerDisplay />}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            {arsenalView ? 'My Arsenal' : (difficultyFilter !== 'all' ? `Showing ${DIFFICULTY_LABELS[difficultyFilter].toLowerCase()} combos` : 'All Styles')}
          </Text>
          {orderedStyles.map((category) => (
            <CategoryCard key={category} category={category} />
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
              {!isPro && (
                <TouchableOpacity style={[styles.proBanner, { backgroundColor: theme.accent }]} onPress={() => requirePro('settings_banner')}>
                  <Ionicons name="diamond" size={18} color="#fff" />
                  <Text style={styles.proBannerText}>Unlock MyCombat Pro — premium voices, unlimited combos, no ads</Text>
                </TouchableOpacity>
              )}
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

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Voice Packs</Text>
                <View style={styles.restButtons}>
                  {VOICE_PACKS.map((pack) => (
                    <TouchableOpacity key={pack.id} style={[styles.restButton, voicePack === pack.id && styles.restButtonActive]} onPress={() => {
                      if (pack.id !== 'coach' && !isPro && !requirePro('voice_packs')) return;
                      hapticIf('light');
                      updateSetting(setVoicePack, pack.id);
                    }}>
                      <Text style={[styles.restButtonText, voicePack === pack.id && styles.restButtonTextActive]}>{pack.label}</Text>
                      {pack.id !== 'coach' && !isPro ? (
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
                    if (!tapControls && !isPro && !requirePro('tap_controls')) return;
                    hapticIf('light'); setTapControls(!tapControls);
                  }}>
                    <Text style={styles.toggleText}>{tapControls ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
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
                {isPro ? (
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
                      <Text style={[styles.restButtonText, speechVoice === voice.identifier && styles.restButtonTextActive]} numberOfLines={1}>{voice.name || voice.language}</Text>
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
                      <Text style={[styles.restButtonText, techniqueVoice === voice.identifier && styles.restButtonTextActive]} numberOfLines={1}>{voice.name || voice.language}</Text>
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
                  <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.accent }]} onPress={() => shareCombo(shareModal.combo, shareModal.styleName)}>
                    <Text style={styles.closeButtonText}>Share via native sheet</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.textMuted, marginTop: 8 }]} onPress={() => setShareModal({ visible: false, combo: null, styleName: null })}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Paywall preview (soft gate) */}
        <Modal animationType="slide" transparent={true} visible={paywallVisible} onRequestClose={() => setPaywallVisible(false)}>
          <BlurView intensity={100} style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
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
              <TouchableOpacity style={[styles.paywallTier, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => purchasePro('monthly')}>
                <Text style={[styles.paywallTierName, { color: theme.text }]}>Monthly</Text>
                <Text style={[styles.paywallTierPrice, { color: theme.accent }]}>${PRO_PRICING.monthly}/mo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.paywallTier, { backgroundColor: theme.accent, borderColor: theme.accent }]} onPress={() => purchasePro('annual')}>
                <Text style={[styles.paywallTierName, { color: '#fff' }]}>Annual — best value</Text>
                <Text style={[styles.paywallTierPrice, { color: '#fff' }]}>${PRO_PRICING.annual}/yr (${(PRO_PRICING.annual / 12).toFixed(2)}/mo)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.paywallTier, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => purchasePro('lifetime')}>
                <Text style={[styles.paywallTierName, { color: theme.text }]}>Lifetime</Text>
                <Text style={[styles.paywallTierPrice, { color: theme.accent }]}>${PRO_PRICING.lifetime} once</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.textMuted, marginTop: 12 }]} onPress={() => setPaywallVisible(false)}>
                <Text style={styles.closeButtonText}>Not now</Text>
              </TouchableOpacity>
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
  iconButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.iconButton,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { padding: 20, gap: 20 },
  sectionLabel: { fontSize: 13, fontFamily: FONT.headingSemi, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  categoryCard: { borderRadius: 16, overflow: 'hidden', elevation: 5, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, borderWidth: 1, borderColor: theme.border },
  categoryGradient: { padding: 20 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitleGroup: { flex: 1, marginRight: 10 },
  categoryTitle: { fontSize: 24, fontFamily: FONT.heading, color: theme.text, letterSpacing: 0.3 },
  progressText: { fontSize: 12, fontFamily: FONT.body, color: theme.textMuted, marginTop: 2 },
  favButton: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  taskContainer: { borderRadius: 12, padding: 15, marginBottom: 15, minHeight: 80, justifyContent: 'center', backgroundColor: theme.taskContainer },
  taskText: { fontSize: 16, fontFamily: FONT.body, color: theme.text, textAlign: 'center' },
  diffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  diffLabel: { fontSize: 12, fontFamily: FONT.bodySemi, color: theme.textMuted },
  cardControls: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
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
  restButtonActive: { backgroundColor: theme.accent },
  restButtonText: { color: theme.text, fontSize: 16, fontFamily: FONT.bodySemi },
  restButtonTextActive: { color: '#fff', fontFamily: FONT.bodyBold },
  voiceButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.buttonDefault, maxWidth: '45%', alignItems: 'center' },
  closeButton: { backgroundColor: theme.accent, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginTop: 10, minHeight: 48, justifyContent: 'center' },
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
  toggleActive: { backgroundColor: theme.accent },
  toggleText: { color: theme.text, fontWeight: 'bold', fontFamily: FONT.bodyBold },
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
  previewStrip: { marginTop: 10 },
  previewStripContent: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  previewStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewChip: { borderWidth: 1, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, maxWidth: 130 },
  previewChipText: { fontSize: 12, fontFamily: FONT.bodySemi },
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
  paywallTitle: { fontSize: 30, fontFamily: FONT.heading, marginBottom: 2 },
  paywallSub: { fontSize: 14, fontFamily: FONT.body, marginBottom: 16 },
  paywallFeature: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 8 },
  paywallFeatureText: { fontSize: 15, fontFamily: FONT.body, flex: 1 },
  paywallTier: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, width: '100%' },
  paywallTierName: { fontSize: 16, fontFamily: FONT.bodyBold },
  paywallTierPrice: { fontSize: 16, fontFamily: FONT.headingSemi },
  onboardCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 4 },
  onboardTitle: { fontSize: 22, fontFamily: FONT.heading, textAlign: 'center', marginBottom: 8 },
  onboardBody: { fontSize: 14, fontFamily: FONT.body, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  onboardButton: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 25, marginBottom: 10, width: '100%', alignItems: 'center' },
  onboardButtonText: { color: '#fff', fontSize: 16, fontFamily: FONT.bodyBold },
  onboardSkip: { fontSize: 13, fontFamily: FONT.body, padding: 8 },
});
