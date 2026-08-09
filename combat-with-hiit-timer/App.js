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
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

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

// ---------- Theme ----------
const THEMES = {
  dark: {
    bgTop: '#1a1a2e',
    bgBottom: '#16213e',
    container: '#1a1a2e',
    text: '#fff',
    textMuted: '#bbb',
    cardBg: 'rgba(255,255,255,0.1)',
    cardBgSelected: 'rgba(255,255,255,0.15)',
    cardGradSelected: ['#4a90e2', '#357abd'],
    cardGradNormal: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
    taskContainer: 'rgba(0,0,0,0.2)',
    iconButton: 'rgba(255,255,255,0.1)',
    buttonDefault: 'rgba(255,255,255,0.1)',
    modalBg: '#1a1a2e',
    overlay: 'rgba(0,0,0,0.5)',
    accent: '#4a90e2',
    accentDark: '#357abd',
    success: '#4CAF50',
    danger: '#f44336',
    test: '#6c5ce7',
    timerPanel: 'rgba(255,255,255,0.05)',
    toggleOff: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
  },
  light: {
    bgTop: '#eef1f6',
    bgBottom: '#dfe5ee',
    container: '#eef1f6',
    text: '#1a1a2e',
    textMuted: '#555',
    cardBg: 'rgba(255,255,255,0.65)',
    cardBgSelected: 'rgba(255,255,255,0.9)',
    cardGradSelected: ['#4a90e2', '#357abd'],
    cardGradNormal: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.55)'],
    taskContainer: 'rgba(0,0,0,0.05)',
    iconButton: 'rgba(0,0,0,0.08)',
    buttonDefault: 'rgba(0,0,0,0.08)',
    modalBg: '#f5f7fb',
    overlay: 'rgba(0,0,0,0.4)',
    accent: '#4a90e2',
    accentDark: '#357abd',
    success: '#2e9e4f',
    danger: '#d93a3a',
    test: '#6c5ce7',
    timerPanel: 'rgba(0,0,0,0.04)',
    toggleOff: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
  },
};

// ---------- Persistence helper (replaces 8 copy-pasted storage pairs) ----------
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

// ---------- Weighted random task picker ----------
// Levels 1-12 are the fundamental core; draw them 70% of the time so
// beginners get the basics. Styles without a basicLevels entry stay uniform.
const basicLevels = { 'Boxing': 12 };
const pickRandomTask = (style, styles) => {
  const tasks = styles[style];
  if (!tasks) return null;
  const taskLevels = Object.keys(tasks);
  if (taskLevels.length === 0) return null;
  const basicCount = basicLevels[style] || 0;
  let randomLevel;
  if (basicCount > 0 && Math.random() < 0.7) {
    randomLevel = taskLevels[Math.floor(Math.random() * basicCount)];
  } else {
    randomLevel = taskLevels[Math.floor(Math.random() * taskLevels.length)];
  }
  return tasks[randomLevel];
};

export default function App() {
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

  // Speech settings
  const [timerSpeechPaused, setTimerSpeechPaused] = usePersistedState('timerSpeechPaused', false);
  const [comboSpeechPaused, setComboSpeechPaused] = usePersistedState('comboSpeechPaused', false);
  const [speechVoice, setSpeechVoice] = usePersistedState('speechVoice', null);
  const [speechRate, setSpeechRate] = usePersistedState('speechRate', 0.9);
  const [speechPitch, setSpeechPitch] = usePersistedState('speechPitch', 1.0);
  const [availableVoices, setAvailableVoices] = useState([]);

  // Custom styles: { name: [combo, ...] }
  const [customStyles, setCustomStyles] = usePersistedState('customStyles', {});
  // Style order for the main screen (reorder via settings arrows)
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

  // Timer state (ref-based, single source of truth)
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

  // All styles = built-in + custom (custom entries are arrays -> object map)
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

  const isFavorite = (category, task) => favorites.includes(`${category}::${task}`);
  const toggleFavorite = (category, task) => {
    haptic('medium');
    const key = `${category}::${task}`;
    setFavorites(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // ---------- Speech queue ----------
  useEffect(() => {
    const processSpeechQueue = async () => {
      if (speechQueue.length > 0 && !isSpeaking) {
        setIsSpeaking(true);
        const speechItem = speechQueue[0];
        try {
          const rate = speechItem.type === 'combo' ? speechRate * 0.8 : speechRate;
          const speakText = speechItem.text.replace(/\s*[>→]\s*/g, ', ').replace(/\s+/g, ' ').trim();
          await Speech.speak(speakText, {
            rate,
            pitch: speechPitch,
            ...(speechVoice ? { voice: speechVoice } : {}),
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
  }, [speechQueue, isSpeaking, speechRate, speechPitch, speechVoice]);

  const addToSpeechQueue = useCallback((text, type = 'timer') => {
    const shouldAdd = type === 'timer' ? !timerSpeechPaused : !comboSpeechPaused;
    if (!shouldAdd) return;
    // Functional update: priority decision made inside the updater (no stale closure)
    setSpeechQueue(prev => {
      if (type === 'combo' && prev.length > 0) return [{ text, type }, ...prev];
      return [...prev, { text, type }];
    });
  }, [timerSpeechPaused, comboSpeechPaused]);

  const speakCombination = useCallback((combination) => {
    addToSpeechQueue(combination, 'combo');
    return true;
  }, [addToSpeechQueue]);

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
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      const s = timerRef.current;
      let next = s.remaining - 1;
      let mode = s.mode;
      let round = s.round;
      let active = true;

      if (s.remaining <= 1) {
        if (s.mode === 'work') {
          if (s.round >= totalRounds) {
            addToSpeechQueue("Workout complete!", 'timer');
            active = false;
            round = 1;
            next = 0;
          } else {
            mode = 'rest';
            addToSpeechQueue("Rest now", 'timer');
            next = hiitRestPeriod;
          }
        } else {
          mode = 'work';
          round = s.round + 1;
          if (isDrilling && drillTask) {
            // Drill mode: re-announce the same combo each round
            addToSpeechQueue(drillTask, 'combo');
          }
          addToSpeechQueue(`Round ${round}`, 'timer');
          next = workPeriod;
        }
      } else if (next <= 3 && next > 0) {
        addToSpeechQueue(String(next), 'timer');
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
  }, [timerActive, workPeriod, hiitRestPeriod, totalRounds, isDrilling, drillTask, addToSpeechQueue]);

  const startHiitTimer = () => {
    haptic('medium');
    // Can't run combo training and the timer simultaneously
    if (isTraining) stopTrainingSession();
    timerRef.current = { mode: 'work', round: 1, remaining: workPeriod };
    setTimerMode('work');
    setCurrentRound(1);
    setTimeRemaining(workPeriod);
    setTimerActive(true);
    addToSpeechQueue("Starting workout. Round 1", 'timer');
  };

  const stopHiitTimer = () => {
    haptic('light');
    setTimerActive(false);
    setIsDrilling(false);
    setDrillTask(null);
    timerRef.current = { mode: 'rest', round: 1, remaining: 0 };
    setTimeRemaining(0);
    Speech.stop();
  };

  // Drill mode: repeat ONE combo for totalRounds rounds
  const startDrill = (style, task) => {
    haptic('medium');
    if (isTraining) stopTrainingSession();
    setDrillTask(task);
    setIsDrilling(true);
    timerRef.current = { mode: 'work', round: 1, remaining: workPeriod };
    setTimerMode('work');
    setCurrentRound(1);
    setTimeRemaining(workPeriod);
    setTimerActive(true);
    addToSpeechQueue(task, 'combo');
    addToSpeechQueue('Drill. Round 1', 'timer');
  };

  // ---------- Combo training session ----------
  const startTrainingSession = (style) => {
    haptic('medium');
    // Can't run the timer and combo training simultaneously
    if (timerActive) stopHiitTimer();
    setIsTraining(true);
    setCurrentStyle(style);
    currentTaskRef.current = null;
    repeatCounterRef.current = 0;

    const generateAndSpeak = () => {
      if (!currentTaskRef.current || repeatCounterRef.current >= comboRepeatCount) {
        const task = pickRandomTask(style, allStyles);
        currentTaskRef.current = task;
        repeatCounterRef.current = 1;
        setGeneratedTasks(prev => ({ ...prev, [style]: task }));
        animateTaskGeneration();
        speakCombination(task);
      } else {
        repeatCounterRef.current += 1;
        speakCombination(currentTaskRef.current);
      }
    };

    generateAndSpeak();
    const interval = setInterval(generateAndSpeak, comboRestPeriod * 1000);
    setTrainingInterval(interval);
  };

  const stopTrainingSession = () => {
    setIsTraining(false);
    Speech.stop();
    if (trainingInterval) {
      clearInterval(trainingInterval);
      setTrainingInterval(null);
    }
  };

  const generateTask = (stat) => {
    haptic('light');
    const task = pickRandomTask(stat, allStyles);
    // Functional update: no stale closure
    setGeneratedTasks(prev => ({ ...prev, [stat]: task }));
    animateTaskGeneration();
  };

  const animateTaskGeneration = () => {
    taskOpacity.setValue(0);
    Animated.timing(taskOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleZoomIn = () => {
    haptic('light');
    const newFontSize = Math.min(fontSize + (fontSize * 0.1), width / 5);
    setFontSize(newFontSize);
  };
  const handleZoomOut = () => {
    haptic('light');
    const newFontSize = Math.max(fontSize - (fontSize * 0.1), 12);
    setFontSize(newFontSize);
  };

  // ---------- Custom styles ----------
  const [customStyleName, setCustomStyleName] = useState('');
  const [customStyleCombos, setCustomStyleCombos] = useState('');
  const [isCustomStyleModalVisible, setIsCustomStyleModalVisible] = useState(false);

  const addCustomStyle = () => {
    const name = customStyleName.trim();
    const combos = customStyleCombos.split('\n').map(c => c.trim()).filter(Boolean);
    if (!name) { Alert.alert('Style name required'); return; }
    if (combos.length === 0) { Alert.alert('Add at least one combo'); return; }
    haptic('medium');
    setCustomStyles(prev => ({ ...prev, [name]: combos }));
    setCustomStyleName('');
    setCustomStyleCombos('');
    setIsCustomStyleModalVisible(false);
  };

  const deleteCustomStyle = (name) => {
    haptic('medium');
    setCustomStyles(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // ---------- Style reorder ----------
  const moveStyle = (index, dir) => {
    haptic('light');
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
    haptic('light');
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
            <Text style={[styles.drillTaskText, { fontSize }]}>{drillTask}</Text>
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
        <TouchableOpacity style={[styles.testButton, { backgroundColor: theme.test }]} onPress={() => { haptic('light'); addToSpeechQueue("Test voice announcement", 'timer'); }}>
          <Text style={styles.testButtonText}>Test Voice</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const CategoryCard = ({ category }) => {
    const task = generatedTasks[category] || null;
    const isSelected = selectedCategory === category;
    const cardScale = useRef(new Animated.Value(1)).current;
    const fav = isFavorite(category, task);

    useEffect(() => {
      Animated.spring(cardScale, { toValue: isSelected ? 1.05 : 1, friction: 3, useNativeDriver: true }).start();
    }, [isSelected]);

    return (
      <TouchableOpacity onPress={() => { haptic('light'); setSelectedCategory(category); }} activeOpacity={0.9}>
        <Animated.View style={[styles.categoryCard, { transform: [{ scale: cardScale }], backgroundColor: isSelected ? theme.cardBgSelected : theme.cardBg }]}>
          <LinearGradient
            colors={isSelected ? theme.cardGradSelected : theme.cardGradNormal}
            style={styles.categoryGradient}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
              <TouchableOpacity
                style={styles.favButton}
                onPress={() => task && toggleFavorite(category, task)}
              >
                <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color={fav ? '#FFD700' : theme.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.taskContainer, { backgroundColor: theme.taskContainer }]}>
              <Animated.Text style={[styles.taskText, { fontSize, color: theme.text, opacity: taskOpacity }]}>
                {task || 'Tap refresh to generate'}
              </Animated.Text>
            </View>
            <View style={styles.cardControls}>
              <TouchableOpacity style={styles.controlButton} onPress={() => generateTask(category)}>
                <Ionicons name="refresh" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.test }]}
                onPress={() => task && startDrill(category, task)}
              >
                <Ionicons name="target" size={22} color="#fff" />
              </TouchableOpacity>
              {!isTraining && !timerActive ? (
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.success }]} onPress={() => startTrainingSession(category)}>
                  <Ionicons name="play" size={22} color="#fff" />
                </TouchableOpacity>
              ) : currentStyle === category && isTraining ? (
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.danger }]} onPress={stopTrainingSession}>
                  <Ionicons name="stop" size={22} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.container }]}>
      <StatusBar barStyle={themeName === 'dark' ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={[theme.bgTop, theme.bgBottom]} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Martial Arts Training</Text>
          <View style={styles.headerControls}>
            <TouchableOpacity style={styles.iconButton} onPress={() => { haptic('light'); setIsSettingsVisible(true); }}>
              <Ionicons name="settings-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => { haptic('light'); setThemeName(themeName === 'dark' ? 'light' : 'dark'); }}>
              <Ionicons name={themeName === 'dark' ? 'sunny-outline' : 'moon-outline'} size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleZoomOut}>
              <Ionicons name="remove-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleZoomIn}>
              <Ionicons name="add-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TimerDisplay />
          {orderedStyles.map((category) => (
            <CategoryCard key={category} category={category} />
          ))}
          {orderedStyles.length === 0 && (
            <Text style={styles.emptyText}>No styles. Create one in Settings.</Text>
          )}
        </ScrollView>

        <Modal animationType="slide" transparent={true} visible={isSettingsVisible} onRequestClose={() => setIsSettingsVisible(false)}>
          <BlurView intensity={100} style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Training Settings</Text>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
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
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.test }]} onPress={() => { haptic('light'); setIsCustomStyleModalVisible(true); }}>
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

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Speech Settings</Text>

                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Timer Announcements</Text>
                  <TouchableOpacity style={[styles.toggleButton, !timerSpeechPaused && styles.toggleActive]} onPress={() => { haptic('light'); setTimerSpeechPaused(!timerSpeechPaused); }}>
                    <Text style={styles.toggleText}>{timerSpeechPaused ? 'OFF' : 'ON'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Combination Announcements</Text>
                  <TouchableOpacity style={[styles.toggleButton, !comboSpeechPaused && styles.toggleActive]} onPress={() => { haptic('light'); setComboSpeechPaused(!comboSpeechPaused); }}>
                    <Text style={styles.toggleText}>{comboSpeechPaused ? 'OFF' : 'ON'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: theme.text }]}>Voice Options</Text>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Coach Voice</Text>
                <View style={styles.restButtons}>
                  <TouchableOpacity style={[styles.restButton, !speechVoice && styles.restButtonActive]} onPress={() => updateSetting(setSpeechVoice, null)}>
                    <Text style={[styles.restButtonText, !speechVoice && styles.restButtonTextActive]}>Default</Text>
                  </TouchableOpacity>
                  {availableVoices.slice(0, 12).map((voice) => (
                    <TouchableOpacity key={voice.identifier} style={[styles.voiceButton, speechVoice === voice.identifier && styles.restButtonActive]} onPress={() => updateSetting(setSpeechVoice, voice.identifier)}>
                      <Text style={[styles.restButtonText, speechVoice === voice.identifier && styles.restButtonTextActive]} numberOfLines={1}>{voice.name || voice.language}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Speech Rate</Text>
                <View style={styles.restButtons}>
                  {[{ label: 'Slow', value: 0.7 }, { label: 'Normal', value: 0.9 }, { label: 'Fast', value: 1.1 }].map((opt) => (
                    <TouchableOpacity key={opt.label} style={[styles.restButton, speechRate === opt.value && styles.restButtonActive]} onPress={() => updateSetting(setSpeechRate, opt.value)}>
                      <Text style={[styles.restButtonText, speechRate === opt.value && styles.restButtonTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Pitch</Text>
                <View style={styles.restButtons}>
                  {[{ label: 'Low', value: 0.8 }, { label: 'Normal', value: 1.0 }, { label: 'High', value: 1.3 }].map((opt) => (
                    <TouchableOpacity key={opt.label} style={[styles.restButton, speechPitch === opt.value && styles.restButtonActive]} onPress={() => updateSetting(setSpeechPitch, opt.value)}>
                      <Text style={[styles.restButtonText, speechPitch === opt.value && styles.restButtonTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
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
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerControls: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.iconButton,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { padding: 20, gap: 20 },
  categoryCard: { borderRadius: 16, overflow: 'hidden', elevation: 5, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  categoryGradient: { padding: 20 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryTitle: { fontSize: 20, fontWeight: 'bold' },
  favButton: { padding: 4 },
  taskContainer: { borderRadius: 12, padding: 15, marginBottom: 15, minHeight: 80, justifyContent: 'center' },
  taskText: { fontSize: 16, textAlign: 'center' },
  cardControls: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  controlButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.overlay },
  modalContent: { width: '90%', borderRadius: 20, padding: 25, paddingBottom: 15, alignItems: 'center', elevation: 5, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, maxHeight: '85%' },
  modalScroll: { width: '100%', maxHeight: '80%' },
  modalScrollContent: { paddingBottom: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  modalSubtitle: { fontSize: 16, marginBottom: 15, alignSelf: 'flex-start', fontWeight: 'bold' },
  restButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 25 },
  restButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, backgroundColor: theme.buttonDefault, minWidth: 70, alignItems: 'center' },
  restButtonActive: { backgroundColor: theme.accent },
  restButtonText: { color: theme.text, fontSize: 16 },
  restButtonTextActive: { fontWeight: 'bold' },
  voiceButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.buttonDefault, maxWidth: '45%', alignItems: 'center' },
  closeButton: { backgroundColor: theme.accent, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginTop: 10 },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  timerContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: theme.timerPanel, borderRadius: 16, padding: 20 },
  drillBadge: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, letterSpacing: 2 },
  drillTaskBox: { backgroundColor: theme.taskContainer, borderRadius: 12, padding: 12, marginBottom: 10, width: '100%', alignItems: 'center' },
  drillTaskText: { color: theme.text, textAlign: 'center' },
  timerCircle: { width: 150, height: 150, borderRadius: 75, borderWidth: 5, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  timerText: { fontSize: 36, fontWeight: 'bold' },
  timerModeText: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  roundsText: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  timerControls: { flexDirection: 'row', justifyContent: 'center' },
  settingLabel: { fontSize: 14, alignSelf: 'flex-start', marginTop: 15, marginBottom: 8 },
  testButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginTop: 10 },
  testButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
  toggleLabel: { fontSize: 16 },
  toggleButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: theme.toggleOff },
  toggleActive: { backgroundColor: theme.accent },
  toggleText: { color: theme.text, fontWeight: 'bold' },
  customStyleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.textMuted },
  customStyleName: { fontSize: 16, flex: 1, marginRight: 10 },
  textInput: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, fontSize: 16 },
  textInputMultiline: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  emptyText: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 16 },
});
