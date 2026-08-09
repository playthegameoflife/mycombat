import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const taskDifficulties = {


    'Boxing': {
          1: "Jab > Right cross",  
      2: "Jab > Right cross > Left hook",  
      3: "Jab > Right cross > Left hook > Right cross",  
      4: "Double jab > Right cross",  
      5: "Jab > Right cross > Slip > Right cross",  
      6: "Jab > Jab > Right cross > Left uppercut > Right cross",  
      7: "Jab > Right cross > Left hook > Right cross > Slip > Left hook",  
      8: "Jab > Right uppercut > Left hook > Right cross",  
      9: "Jab > Right cross > Right uppercut > Left hook",  
      10: "Jab > Left hook > Right uppercut > Right cross",  
      11: "Jab > Right hook to body > Left hook to head",  
      12: "Jab > Right cross > Left hook to body > Right hook to head",  
      13: "Jab > Right cross > Left hook to body > Right cross",  
      14: "Jab > Right cross > Right hook to body > Left hook",  
      15: "Right uppercut to body > Left hook to head > Right cross",  
      16: "Fake jab > Slip back > Right cross (Pull counter)",  
      17: "Shoulder roll > Right uppercut > Left hook",  
      18: "Slip > Right cross > Left hook",  
      19: "Shoulder roll > Right hook to body > Left hook to head",  
      20: "Pull counter > Right cross > Left hook > Right cross",  
      21: "Jab > Slip left > Left hook",  
      22: "Jab > Slip right > Right uppercut",  
      23: "Jab > Pivot left > Right cross",  
      24: "Jab > Pivot right > Left hook",  
      25: "Jab > Right cross > Step back > Right cross",  
      26: "Left hook to body > Right uppercut > Left hook",  
      27: "Right uppercut > Left hook > Right hook",  
      28: "Left hook to body > Left hook to head > Right cross",  
      29: "Jab > Right uppercut > Left hook > Right uppercut",  
      30: "Right uppercut > Left hook > Left uppercut > Right hook",  
      31: "Jab > Right cross > Right hook > Left hook",  
      32: "Jab > Right uppercut > Left hook > Right cross",  
      33: "Jab > Right cross > Slip outside > Right hook to body",  
      34: "Jab > Step right > Left hook > Right uppercut",  
      35: "Jab > Right hook to body > Right cross",  
      36: "Block > Right cross > Left hook > Right uppercut",  
      37: "Jab > Fake right cross > Slip left > Left hook",  
      38: "Bait jab > Shoulder roll > Right cross",  
      39: "Jab > Slip inside > Left hook to body > Right hook",  
      40: "Pull counter > Right uppercut > Left hook",  
      41: "Jab > Right cross > Left hook > Right uppercut > Left hook",  
      42: "Right cross > Left hook > Right hook > Left uppercut",  
      43: "Jab > Right uppercut > Left hook > Right cross > Left hook",  
      44: "Jab > Right cross > Right hook > Left hook > Right cross",  
      45: "Jab > Right cross > Right uppercut > Left hook > Right cross",  
      46: "Double jab > Right cross > Left hook > Right uppercut > Left hook",  
      47: "Jab > Right cross > Left hook > Right hook to body > Left hook to head",  
      48: "Right uppercut > Left hook > Right cross > Left hook > Right hook",  
      49: "Jab > Right cross > Step right > Left hook > Right uppercut",  
      50: "Jab > Right cross > Left hook > Right hook > Left hook",
      51: "Left jab > Right cross > Left hook",
  52: "Right feint > Left jab > Right overhand",
  53: "Left body jab > Right uppercut > Left hook",
  54: "Right cross > Left hook > Right cross",
  55: "Left jab > Left hook > Right cross",
  56: "Right body shot > Left hook to head > Right uppercut",
  57: "Left jab > Right hook > Left uppercut > Right cross",
  58: "Left hook > Right uppercut > Left hook",
  59: "Right cross > Left hook to body > Right uppercut",
  60: "Left jab > Right cross > Left hook to body > Right hook",
  61: "Left hook to body > Right uppercut > Left hook to head",
  62: "Right feint > Left jab > Right cross > Left hook",
  63: "Left jab > Right body shot > Left hook > Right cross",
  64: "Right uppercut > Left hook > Right cross",
  65: "Left hook > Right uppercut > Left hook to body",
  66: "Right cross > Left hook > Right uppercut > Left cross",
  67: "Left jab > Right cross > Left uppercut > Right hook",
  68: "Right body shot > Left hook > Right cross > Left hook",
  69: "Left jab > Right uppercut > Left hook > Right cross",
  70: "Right cross > Left hook to body > Right uppercut > Left hook",
  71: "Left hook > Right body shot > Left uppercut",
  72: "Right feint > Left jab > Right cross > Left hook to body",
  73: "Left uppercut > Right hook > Left cross",
  74: "Right cross > Left body hook > Right uppercut > Left hook",
  75: "Left jab > Right cross > Left hook to body > Right uppercut",
  76: "Right uppercut > Left hook > Right cross > Left uppercut",
  77: "Left hook to body > Right cross > Left hook to head",
  78: "Right body shot > Left hook > Right uppercut > Left cross",
  79: "Left jab > Right cross > Left uppercut > Right body shot",
  80: "Right hook > Left uppercut > Right cross",
  81: "Left body jab > Right cross > Left hook > Right uppercut",
  82: "Right feint > Left hook > Right uppercut > Left cross",
  83: "Left jab > Right body shot > Left hook > Right cross > Left uppercut",
  84: "Right cross > Left hook > Right uppercut > Left body shot",
  85: "Left hook > Right cross > Left uppercut > Right hook",
  86: "Right uppercut > Left hook > Right cross > Left hook to body",
  87: "Left jab > Right cross > Left hook > Right uppercut > Left cross",
  88: "Right body feint > Left hook > Right uppercut > Left cross",
  89: "Left hook to body > Right cross > Left uppercut > Right hook",
  90: "Right cross > Left uppercut > Right hook > Left cross",
  91: "Left jab > Right body shot > Left hook > Right uppercut > Left cross",
  92: "Right feint > Left hook > Right cross > Left uppercut > Right hook",
  93: "Left body jab > Right cross > Left hook > Right uppercut > Left cross",
  94: "Right uppercut > Left hook > Right cross > Left body shot > Right hook",
  95: "Left hook > Right cross > Left uppercut > Right hook > Left cross",
  96: "Right body shot > Left hook > Right uppercut > Left cross > Right hook",
  97: "Left jab > Right cross > Left hook > Right body shot > Left uppercut",
  98: "Right feint > Left uppercut > Right hook > Left cross > Right uppercut",
  99: "Left hook to body > Right cross > Left uppercut > Right hook > Left cross",
  100: "Right cross > Left hook > Right uppercut > Left cross > Right hook",
      101: "Jab > Feint jab > Left hook",
    102: "Tap jab > Tap jab > Power right cross",
    103: "Jab > Slow right cross > Fast left hook",
    104: "Jab > Right cross > Duck > Right cross",
    105: "Jab > Right cross > Shift lead foot (Switch stance) > Southpaw cross",
    106: "Right overhand > Shift (Switch stance) > Lead hook",
    107: "Jab > Pivot 90 degrees right > Double left hook",
    108: "Jab > Left shovel hook to body",
    109: "Left hook to head > Left hook to body",
    110: "Forearm post > Right uppercut > Left hook",
    111: "Jab > Right cross > Pull > Right overhand",
    112: "Jab to body > Up-jab to head",
    113: "Shoulder roll > Right cross > Left shovel hook to body",
    114: "Jab > Slip outside > Right cross to body > Left hook to head",
    115: "Double jab > Right hook to body > Right uppercut",
    116: "Jab > Right cross > Slip right > Right cross > Left hook",
    117: "Double jab > Right cross > Duck > Right uppercut > Left hook",
    118: "Jab > Left hook to head > Left hook to body > Right cross",
    119: "Right cross > Left hook > Right cross > Slip left > Left uppercut",
    120: "Jab > Right hook to body > Right hook to head > Left hook",
    121: "Jab > Right cross > Pivot left > Left hook > Right cross",
    122: "Lead uppercut > Lead hook > Right cross",
    123: "Jab > Step left > Right overhand > Left hook",
    124: "Right cross > Left hook to body > Left uppercut > Right cross",
    125: "Fake right cross > Left hook to head > Right cross > Left hook",
    126: "Jab > Jab > Right uppercut > Left hook > Right hook to body",
    127: "Slip left > Left hook to body > Left hook to head > Right cross",
    128: "Right cross > Duck > Left hook to head > Right uppercut",
    129: "Jab > Right cross > Step back > Right overhand",
    130: "Left hook > Right hook > Left uppercut > Right cross",
    131: "Jab > Step left > Jab > Right cross",
    132: "Jab > Right cross > Pivot left 90 > Left hook",
    133: "Double jab (advancing) > Right cross > Step back",
    134: "Right cross > Left hook > Step right > Right cross",
    135: "Jab > Slip right > Right cross > Roll left > Left hook",
    136: "Left hook > Right cross > Pivot right > Right cross",
    137: "Jab > Right cross > Step back (Draw) > Right cross (Counter)",
    138: "Jab > Left hook to body > Pivot left > Left hook to head",
    139: "Double jab (retreating) > Right cross",
    140: "Jab > Right cross > Slip left > Left uppercut > Pivot left",
    141: "Fake jab > Step right > Right cross to body > Left hook",
    142: "Jab > Right cross > Step left > Right overhand",
    143: "Left hook > Roll right > Right uppercut > Left hook",
    144: "Jab > Right cross > Left hook > Step back > Right cross > Left hook",
    145: "Right cross (advancing) > Left hook > Pivot left > Right cross",
    146: "Jab > Jab > Step right > Left hook > Right cross",
    147: "Lead hook to head > Lead hook to body > Step left > Right cross",
    148: "Jab > Slip right > Right uppercut > Pivot right > Left hook",
    149: "Right cross > Duck > Step forward > Left hook (The Shift)",
    150: "Double jab > Right cross > Step back > Right cross > Left hook"
        
    },




    'Kickboxing': {
    1: "Jab, Cross, Left Hook, Right Low Kick",
    2: "Cross, Left Hook, Right Hook, Left Body Kick",
    3: "Jab, Right Cross, Left Uppercut, Right Hook",
    4: "Left Hook, Cross, Left Body Kick, Right Low Kick",
    5: "Right Cross, Left Hook, Right Low Kick",
    6: "Jab, Right Cross, Left Uppercut, Right Uppercut",
    7: "Left Hook, Cross, Left Body Kick, Right Leg Kick",
    8: "Cross, Left Hook, Right Hook, Left High Kick",
    9: "Jab, Cross, Left Uppercut, Right Elbow",
    10: "Right Cross, Left Hook, Left Hook, Right Low Kick",
    11: "Left Jab, Right Cross, Left Body Hook, Right Leg Kick",
    12: "Right Cross, Left Hook, Left Kick to the Body, Right Hook",
    13: "Jab, Left Hook, Right Cross, Left Roundhouse Kick",
    14: "Left Jab, Right Cross, Left High Kick, Right Cross",
    15: "Right Cross, Left Hook, Right Uppercut, Left Hook, Right Leg Kick",
    16: "Left Hook, Right Hook, Left High Kick, Right Cross",
    17: "Jab, Cross, Left Hook, Right Roundhouse Kick",
    18: "Jab, Right Cross, Left Hook, Right Hook, Left Body Kick",
    19: "Left Hook, Right Cross, Left Roundhouse Kick, Right Hook",
    20: "Cross, Left Hook, Right Low Kick, Left Hook",
    21: "Jab, Cross, Right Uppercut, Left Hook, Right Cross",
    22: "Cross, Left Hook, Left Body Kick, Right Low Kick",
    23: "Jab, Cross, Right Hook, Left High Kick",
    24: "Left Jab, Right Cross, Left Uppercut, Right Hook, Left Roundhouse Kick",
    25: "Right Cross, Left Hook, Right Cross, Left Kick to the Body",
    26: "Jab, Right Cross, Left Hook, Right Uppercut, Left Hook",
    27: "Cross, Left Hook, Right Low Kick, Left Hook, Right Cross",
    28: "Left Hook, Right Cross, Left Uppercut, Right Elbow, Left Body Kick",
    29: "Right Cross, Left Hook, Right Hook, Left High Kick, Right Leg Kick",
    30: "Jab, Cross, Left Hook, Right Hook, Left Low Kick",
    31: "Left Hook, Right Cross, Left Uppercut, Right Low Kick, Left Hook",
    32: "Right Cross, Left Hook, Right Uppercut, Left Leg Kick",
    33: "Jab, Left Hook, Right Cross, Left Roundhouse Kick",
    34: "Cross, Left Hook, Right Uppercut, Left Hook, Right Roundhouse Kick",
    35: "Jab, Right Cross, Left Hook, Right Uppercut, Left Body Kick",
    36: "Left Jab, Right Cross, Left Hook, Right Cross, Left Roundhouse Kick",
    37: "Right Cross, Left Hook, Right Hook, Left Leg Kick, Right Uppercut",
    38: "Jab, Right Cross, Left Hook, Right Uppercut, Left Hook",
    39: "Cross, Left Hook, Right Body Kick, Left Low Kick",
    40: "Left Hook, Right Cross, Left Uppercut, Right Cross",
    41: "Right Cross, Left Hook, Left Body Hook, Right Hook, Left Roundhouse Kick",
    42: "Jab, Cross, Left Uppercut, Right Low Kick, Left Body Kick",
    43: "Left Hook, Right Hook, Left High Kick, Right Cross, Left Low Kick",
    44: "Jab, Right Cross, Left Hook, Right Low Kick, Left Hook, Right Cross",
    45: "Cross, Left Hook, Right Uppercut, Left High Kick",
    46: "Jab, Cross, Left Hook, Right Hook, Left High Kick, Right Leg Kick",
    47: "Left Jab, Right Cross, Left Uppercut, Right Hook, Left Roundhouse Kick",
    48: "Right Cross, Left Hook, Left High Kick, Right Hook, Left Low Kick",
    49: "Left Hook, Right Cross, Left Uppercut, Right Leg Kick, Left Cross",
    50: "Jab, Cross, Left Hook, Right Hook, Left High Kick, Right Cross",
    51: "Jab, Cross, Left Hook, Right Overhand",
    52: "Jab, Cross, Left Uppercut, Right Hook",
    53: "Left Hook, Right Uppercut, Left Hook, Right Cross",
    54: "Right Cross, Left Hook, Right Hook",
    55: "Double Jab, Right Overhand, Left Hook",
    56: "Jab, Cross, Liver Shot",
    57: "Right Uppercut, Left Hook, Right Hook",
    58: "Cross, Left Hook, Right Head Kick",
    59: "Right Straight, Left Hook to the Body, Right Uppercut",
    60: "Left Hook, Right Hook, Left Hook to the Liver",
    61: "Jab, Cross, Left Head Kick",
    62: "Left Hook, Right Low Kick, Left Hook, Right High Kick",
    63: "Cross, Left Body Kick, Right Head Kick",
    64: "Right Low Kick, Left Hook, Right Head Kick",
    65: "Left Uppercut, Right Body Kick, Left High Kick",
    66: "Jab, Cross, Spinning Heel Kick",
    67: "Lead Teep, Right Cross, Left Head Kick",
    68: "Left Hook, Right Body Kick, Left Switch Kick",
    69: "Right Body Kick, Left Hook, Right Overhand",
    70: "Fake Low Kick, Question Mark Kick",
    71: "Clinch, Right Knee, Left Elbow",
    72: "Right Cross, Left Elbow, Right Knee",
    73: "Teep, Right Cross, Left Step-in Elbow",
    74: "Jab, Cross, Right Flying Knee",
    75: "Cross, Clinch, Right Knee to the Liver",
    76: "Step-in Elbow, Right Hook, Left Head Kick",
    77: "Jab, Right Uppercut, Left Knee",
    78: "Right Hook, Left Elbow, Right Head Kick",
    79: "Left Body Kick, Right Elbow, Left Hook",
    80: "Teep, Right Hook, Spinning Elbow",
    81: "Left Hook, Spinning Back Kick to the Liver",
    82: "Right Cross, Spinning Backfist",
    83: "Jab, Left Hook, Spinning Heel Kick",
    84: "Low Kick, Superman Punch, Left Head Kick",
    85: "Cross, Spinning Hook Kick",
    86: "Step-in Elbow, Spinning Back Kick",
    87: "Flying Knee, Right Overhand",
    88: "Jab, Right Hook, Spinning Elbow",
    89: "Teep to the Face, Cross, Left Head Kick",
    90: "Switch Kick, Spinning Heel Kick",
    91: "Jab, Cross, Right Flying Knee",
    92: "Right Hook, Left Hook, Right High Kick",
    93: "Body Kick, Hook, Superman Punch",
    94: "Uppercut, Right Hook, Left Head Kick",
    95: "Right Hook, Left Body Kick, Right Spinning Hook Kick",
    96: "Jab, Cross, Lead Head Kick",
    97: "Cross, Hook, Overhand Right, Left Head Kick",
    98: "Lead Uppercut, Overhand Right, High Kick",
    99: "Teep, Cross, Hook, High Kick",
    100: "Cross, Clinch Knee, Right Hook, High Kick"
    },
    

  

      'Muay Thai': {
      1: "Jab > Cross > Left Hook > Right Roundhouse Kick",
      2: "Cross > Left Hook > Right Uppercut > Left Kick to the Liver",
      3: "Jab > Right Overhand > Left Kick to the Head",
      4: "Lead Uppercut > Right Cross > Left Hook > Right Low Kick",
      5: "Jab > Cross > Right Teep > Left High Kick",
      6: "Jab > Cross > Right Up Elbow > Left Hook > Right Elbow",
      7: "Lead Uppercut > Right Overhand > Left Spinning Elbow",
      8: "Right Cross > Left Uppercut > Right Horizontal Elbow",
      9: "Left Hook > Right Elbow > Left Knee to the Body",
      10: "Jab > Right Elbow > Left Hook > Right Uppercut",
      11: "Jab > Right Uppercut > Left Knee to the Solar Plexus",
      12: "Left Teep > Jab > Right Knee to the Body",
      13: "Right Cross > Left Hook > Right Jumping Knee",
      14: "Left Hook to the Body > Right Knee to the Chin",
      15: "Jab > Cross > Clinch > Right Knee to the Liver",
      16: "Right Low Kick > Jab > Cross > Left High Kick",
      17: "Left Teep > Right Low Kick > Left Hook > Right Overhand",
      18: "Jab > Cross > Right Low Kick > Right Head Kick",
      19: "Inside Low Kick > Left Hook > Right Cross > Left Hook to the Body",
      20: "Lead Hook > Rear Low Kick > Rear Overhand Punch",
      21: "Jab > Cross > Left Hook > Right Head Kick",
      22: "Teep > Jab > Right Teep > Left High Kick",
      23: "Left Hook > Right Cross > Left High Kick",
      24: "Left Body Kick > Right Hook > Left Head Kick",
      25: "Right Low Kick > Jab > Cross > Left Head Kick",
      26: "Left Hook > Right Clinch > Left Knee to the Chin",
      27: "Cross > Clinch > Left Elbow > Right Knee",
      28: "Jab > Right Cross > Plum Clinch > Left Knee to the Solar Plexus",
      29: "Overhand Right > Clinch > Repeated Right Knees to the Head",
      30: "Right Uppercut > Clinch > Left Horizontal Elbow",
      31: "Jab > Spinning Back Elbow",
      32: "Cross > Left Hook > Spinning Back Kick",
      33: "Jab > Cross > Spinning Back Fist",
      34: "Teep > Spinning Heel Kick",
      35: "Right Hook > Spinning Elbow > Right High Kick",
      36: "Front Teep to the Face",
      37: "Jab > Right Teep to the Body > Left Head Kick",
      38: "Teep > Right Cross > Left Hook > Right Teep",
      39: "Left Teep > Right Hook > Left Teep to the Solar Plexus",
      40: "Left Teep > Right Teep > Left Hook > Right Roundhouse Kick",
      41: "Left Hook to the Body > Overhand Right",
      42: "Jab > Overhand Right > Left Uppercut > Right Hook",
      43: "Cross > Left Hook > Overhand Right",
      44: "Right Uppercut > Left Hook > Overhand Right",
      45: "Right Low Kick > Left Hook > Overhand Right",
        51: "Jab, Cross, Left Hook, Right Low Kick",
      52: "Jab, Cross, Left Hook, Right Elbow",
      53: "Jab, Left Hook, Right Uppercut, Right Elbow",
      54: "Cross, Left Hook, Right Hook, Left Kick",
      55: "Right Low Kick, Left Hook, Right Cross",
      56: "Jab, Left Hook, Right Cross, Left Knee",
      57: "Left Hook, Right Hook, Left Knee, Right Hook",
      58: "Left Hook, Right Elbow, Right Kick",
      59: "Jab, Left Hook, Right Cross, Right Elbow",
      60: "Right Low Kick, Left Hook, Right Hook, Left High Kick",
      61: "Left Hook, Right Hook, Left Elbow, Right Cross",
      62: "Cross, Left Hook, Left Low Kick, Right Elbow",
      63: "Right Low Kick, Left Hook, Right Hook",
      64: "Left Hook, Right Cross, Left Knee",
      65: "Cross, Left Hook, Left High Kick",
      66: "Jab, Left Hook, Right Elbow, Left Knee",
      67: "Left Hook, Right Hook, Left Low Kick, Right Elbow",
      68: "Cross, Left Hook, Right Elbow",
      69: "Jab, Left Hook, Right Cross, Left Knee",
      70: "Left Hook, Right Cross, Left Elbow, Right Low Kick",
      71: "Right Hook, Left Hook, Left High Kick",
      72: "Jab, Cross, Right Uppercut, Left Hook",
      73: "Jab, Left Hook, Right Elbow, Left Kick",
      74: "Cross, Right Hook, Left Knee, Right Elbow",
      75: "Jab, Cross, Left Hook, Left Elbow",
      76: "Left Hook, Right Hook, Left Knee, Right Cross",
      77: "Jab, Cross, Left Hook, Left Low Kick",
      78: "Cross, Left Hook, Left Elbow, Right Knee",
      79: "Right Cross, Left Hook, Right Low Kick",
      80: "Left Hook, Right Hook, Left High Kick",
      81: "Jab, Left Hook, Right Elbow, Left High Kick",
      82: "Jab, Cross, Left Hook, Right Low Kick",
      83: "Cross, Left Hook, Right Elbow, Left Knee",
      84: "Right Cross, Left Hook, Left Elbow, Right Low Kick",
      85: "Jab, Left Hook, Right Hook, Left Elbow",
      86: "Cross, Left Hook, Right Elbow, Left Low Kick",
      87: "Left Hook, Right Hook, Left Knee, Right High Kick",
      88: "Jab, Right Cross, Left Hook, Left Knee",
      89: "Jab, Left Hook, Right Cross, Left Elbow",
      90: "Right Low Kick, Left Hook, Right Cross, Left Elbow",
      91: "Jab, Cross, Left Hook, Right High Kick",
      92: "Left Hook, Right Hook, Left Knee, Right Cross",
      93: "Right Low Kick, Left Hook, Right Cross, Left Elbow",
      94: "Jab, Right Cross, Left Hook, Left Low Kick",
      95: "Jab, Left Hook, Right Hook, Left Knee",
      96: "Cross, Left Hook, Right Cross, Left High Kick",
      97: "Jab, Cross, Left Hook, Left High Kick",
      98: "Cross, Left Hook, Right Elbow, Left High Kick",
      99: "Jab, Left Hook, Right Cross, Left Kick",
      100: "Left Hook, Right Cross, Left Elbow, Right High Kick"
    },



  'MMA': {
  1: "Jab → Cross → Left Hook: Start by throwing a quick jab with your lead hand to gauge distance. Follow up with a powerful cross from your rear hand, then finish with a left hook, aiming for the opponent’s chin.",
      2: "Jab → Cross → Right Head Kick: Throw a jab to keep your opponent occupied, land a strong cross, then immediately whip up a right high kick to the head when they’re distracted.",
      3: "Inside Leg Kick → Overhand Right: Attack your opponent’s lead leg with an inside kick to off-balance them, then explode with an overhand right as they react.",
      4: "Cross → Left Hook → Right Uppercut: Step in with a strong cross, follow up with a left hook to the side of the head, then throw a right uppercut underneath their chin.",
      5: "Jab → Rear Body Kick: Use a jab to measure distance, then whip your rear leg into their ribs for a powerful body kick.",
      6: "Double Jab → Cross → Left Hook → Right Leg Kick: Keep them busy with two jabs, throw a hard cross, finish with a left hook, and then chop their leg down with a kick.",
      7: "Jab → Fake Cross → Lead Head Kick: Fake a right cross to get them to react, then bring your left leg up high for a head kick.",
      8: "Left Hook to the Body → Left Hook to the Head: Dig into their ribs with a left hook, then immediately bring it upstairs to the chin.",
      9: "Cross → Left Hook → Spinning Back Fist: Land a cross, follow with a hook, then spin around and throw your rear hand in a spinning back fist.",
      10: "Jab → Cross → Lead Uppercut: Basic but effective—set up with a jab, land a cross, then finish with a lead uppercut underneath the chin.",
      11: "Teep Kick → Overhand Right: Push your opponent back with a front kick to the body, then step in and throw an overhand right as they try to regain balance.",
      12: "Jab → Cross → Rear Knee: Get their attention with a jab-cross, then drive your rear knee into their body or chin.",
      13: "Slip Opponent's Jab → Overhand Right: When they throw a jab, slip to the outside and counter with a big overhand right.",
      14: "Cross → Rear Elbow: Land a hard cross, then step in and follow up with a rear elbow strike to the head.",
      15: "Jab → Cross → Lead Hook → Rear Low Kick: Use hands to keep them guessing, then attack their lead leg to slow them down.",
      16: "Right Cross → Left Hook → Right Uppercut → Left Head Kick: A hard boxing combo followed by a sneaky head kick.",
      17: "Fake Cross → Rear Head Kick: Fake a cross to get them to raise their hands, then whip a head kick behind it.",
      18: "Jab → Cross → Duck Opponent's Punch → Right Uppercut: After your punches, duck their counter and return fire with an uppercut.",
      19: "Right Hook → Left Hook → Right Hook: Go side to side with hooks to open their defense and land a big shot.",
      20: "Jab → Rear Uppercut → Lead Hook: Use a jab to measure, then surprise them with an uppercut before landing a lead hook.",
      21: "Jab → Cross → Rear Teep Kick: Use punches to set up a powerful push kick to the stomach.",
      22: "Lead Body Hook → Overhand Right: Dig to the body, then go upstairs with a looping overhand right.",
      23: "Cross → Slip Opponent's Punch → Left Hook: Throw a cross, make them miss, then come back with a left hook.",
      24: "Cross → Spinning Back Kick: Land a cross, turn your back briefly, and fire a spinning back kick to the body.",
      25: "Jab → Cross → Hook → Low Kick: A classic setup that mixes punches and kicks.",
      26: "Jab → Cross → Left Uppercut → Right Hook: A clean boxing combo ending with a big right hand.",
      27: "Fake Jab → Overhand Right → Left Hook: Fake with a jab, then throw a heavy overhand and finish with a hook.",
      28: "Teep Kick → Jab → Cross: Push them back with a teep, then step forward and land a clean one-two.",
      29: "Lead Hook → Rear Low Kick → Rear Head Kick: Attack their legs, then surprise them with a high kick.",
      30: "Jab → Cross → Lead Hook → Spinning Back Elbow: A high-level combo ending in a spinning elbow.",
      31: "Cross → Step Back → Right High Kick: Land a cross, step back, then launch a high kick as they come forward.",
      32: "Jab → Rear Knee → Left Hook: A great mix of strikes that keeps them guessing.",
      33: "Cross → Lead Uppercut → Cross: A fast-paced boxing sequence.",
      34: "Inside Leg Kick → Cross → Overhand Right: Kick low to make them drop their hands, then strike high.",
      35: "Cross → Left Hook → Superman Punch: A strong punch combo into a jumping superman punch.",
      36: "Jab → Right Hook → Spinning Hook Kick: A sneaky spinning kick setup.",
      37: "Fake Cross → Spinning Back Kick to the Body: Fake a cross, then turn and land a spinning kick to the stomach.",
      38: "Jab → Jab → Overhand Right → Rear Uppercut: Mix speed with power.",
      39: "Cross → Left Hook → Right Hook → Left Hook → Rear Head Kick: A devastating mix of strikes.",
      40: "Jab → Fake Cross → Left Hook → Right Uppercut: A deceptive setup into a knockout punch.",
      41: "Jab → Cross → Lead Body Hook → Rear Head Kick: Target the body with a hook, then go upstairs with a high kick.",
      42: "Slip Opponent’s Jab → Lead Uppercut → Cross: Slip their jab, come up with an uppercut, and follow with a cross.",
      43: "Jab → Rear Uppercut → Lead Hook → Rear Low Kick: Mix punches and kicks to break their defense.",
      44: "Cross → Lead Hook → Rear Elbow: Start with classic boxing, then surprise them with an elbow strike.",
      45: "Overhand Right → Left Hook → Right Uppercut: A power punch combination that leads to knockouts.",
      46: "Jab → Cross → Rear Leg Kick → Spinning Back Fist: End a leg kick combo with a spinning back fist.",
      47: "Cross → Left Hook → Overhand Right → Left Hook: A sequence of looping punches that overwhelm opponents.",
      48: "Jab → Cross → Step Forward → Rear Head Kick: Close distance and set up a head kick after punches.",
      49: "Inside Leg Kick → Cross → Lead Hook → Rear Uppercut: Start low and finish high with this sequence.",
      50: "Jab → Cross → Lead Hook → Rear Spinning Hook Kick: A flashy but effective knockout combo.",
      51: "Lead Body Hook → Cross → Rear Uppercut: Hit the body, then go upstairs for the knockout.",
      52: "Jab → Cross → Lead Head Kick: A basic but deadly high kick setup.",
      53: "Teep Kick → Step Back → Cross → Left Hook: Use a teep to create space, then counter with a combo.",
      54: "Jab → Overhand Right → Left Hook: A sneaky knockout combo that catches opponents off guard.",
      55: "Cross → Lead Hook → Cross → Rear Knee: Land hard punches, then throw a knee up the middle.",
      56: "Step Back → Right Uppercut → Left Hook: Step back to avoid a punch, then counter with power shots.",
      57: "Jab → Cross → Fake Low Kick → Rear Head Kick: Fake to the leg before throwing a high kick.",
      58: "Jab → Cross → Lead Hook → Spinning Heel Kick: A boxing setup into a spinning kick knockout.",
      59: "Cross → Duck Opponent’s Hook → Right Uppercut: Avoid their hook and land a clean uppercut.",
      60: "Overhand Right → Lead Hook → Cross → Rear Head Kick: A combination that mixes power with deception.",
      61: "Jab → Cross → Lead Hook → Rear Flying Knee: After punches, jump into a knee strike.",
      62: "Slip Opponent’s Jab → Overhand Right → Left Hook: A counter combo that has ended many fights.",
      63: "Jab → Fake Cross → Lead Hook → Rear Spinning Elbow: A deceptive elbow knockout combo.",
      64: "Inside Leg Kick → Cross → Left Hook → Overhand Right: Break their rhythm before landing power shots.",
      65: "Jab → Cross → Body Hook → Overhand Right: Attack the body before going for the knockout shot.",
      66: "Jab → Cross → Step Back → Spinning Back Kick: A tricky setup for a devastating body kick.",
      67: "Rear Teep Kick → Overhand Right: Push them back, then step in with a big punch.",
      68: "Cross → Lead Hook → Rear Uppercut → Rear Head Kick: A chain of attacks that keep opponents guessing.",
      69: "Jab → Cross → Lead Uppercut → Cross: A crisp boxing combination ending in power.",
      70: "Right Hook → Left Hook → Right Cross → Rear Head Kick: A mix of looping punches into a kick.",
      71: "Jab → Fake Cross → Rear Uppercut: Fake them out before landing a knockout uppercut.",
      72: "Cross → Duck → Right Hook → Left Hook: Throw, evade, and counter in one fluid motion.",
      73: "Jab → Cross → Lead Hook → Rear Spinning Back Kick: A flashy but effective finishing move.",
      74: "Lead Hook → Cross → Step Forward → Rear Elbow: Engage with punches before landing an elbow.",
      75: "Overhand Right → Rear Uppercut → Lead Hook: A heavy power shot combination.",
      76: "Jab → Cross → Rear Low Kick → Spinning Hook Kick: A sneaky head kick setup.",
      77: "Jab → Cross → Overhand Right → Rear Knee: Box into a knee strike to the body or head.",
      78: "Jab → Fake Cross → Left Hook → Rear Spinning Heel Kick: Deceive before finishing with a spinning kick.",
      79: "Jab → Cross → Lead Hook → Rear Superman Punch: A clean knockout combination.",
      80: "Jab → Rear Teep Kick → Cross → Lead Hook: A mix of kicks and punches.",
      81: "Jab → Cross → Fake Low Kick → Spinning Back Kick: Fake low, strike high.",
      82: "Lead Body Hook → Rear Uppercut → Cross: A sneaky body-head combination.",
      83: "Jab → Cross → Lead Hook → Jumping Switch Knee: Catch them off guard with a jumping knee.",
      84: "Jab → Cross → Duck → Right Uppercut: Evade and counter in one move.",
      85: "Cross → Lead Hook → Rear Leg Kick: Slow them down before finishing them off.",
      86: "Jab → Cross → Rear Spinning Hook Kick: A tricky high kick setup.",
      87: "Jab → Cross → Lead Hook → Flying Knee: Set up a flying knee with punches.",
      88: "Jab → Rear Uppercut → Lead Hook → Cross: Classic boxing combination.",
      89: "Inside Leg Kick → Overhand Right → Rear Head Kick: Attack low and high in quick succession.",
      90: "Jab → Fake Cross → Rear Spinning Back Elbow: Fake them into walking into an elbow.",
      91: "Cross → Left Hook → Right Hook → Rear Head Kick: A knockout-worthy mix.",
      92: "Jab → Cross → Lead Hook → Rear Uppercut: A well-balanced striking sequence.",
      93: "Jab → Rear Teep Kick → Spinning Heel Kick: Fake the teep, then go high.",
      94: "Jab → Cross → Left Hook → Spinning Back Fist: Punches into a spinning knockout shot.",
      95: "Jab → Fake Cross → Rear Spinning Hook Kick: A deadly knockout setup.",
      96: "Inside Leg Kick → Cross → Rear Spinning Back Kick: A mix of kicks and punches.",
      97: "Jab → Cross → Rear Leg Kick → Spinning Heel Kick: A devastating knockout sequence.",
      98: "Overhand Right → Lead Hook → Rear Uppercut → Rear Head Kick: Power strikes leading to a head kick finish.",
      99: "Jab → Rear Superman Punch → Rear Spinning Hook Kick: A high-risk but effective combination.",
      100: "Jab → Cross → Lead Hook → Rear Spinning Elbow: Punch setup leading into a finishing elbow strike."
    },


    'Combat Sambo': {
      1: "Jab, cross, left hook, right low kick",
  2: "Front kick, cross, left hook, takedown",
  3: "Slip, right uppercut, left hook, knee strike",
  4: "Parry, overhand right, left body hook, right elbow",
  5: "Double leg takedown, ground and pound",
  6: "Clinch, knee strike, hip throw",
  7: "Jab, cross, duck under, rear naked choke",
  8: "Low kick, cross, hook, high kick",
  9: "Feint jab, overhand right, left hook, ankle pick",
  10: "Sprawl, front headlock, knee strikes",
  11: "Jab, cross, left hook, right low kick, takedown",
  12: "Side step, right hook, left uppercut, clinch, throw",
  13: "Push kick, spinning back fist, clinch, hip toss",
  14: "Parry, cross, hook, leg sweep",
  15: "Jab, cross, level change, double leg takedown",
  16: "Inside leg kick, cross, hook, outside leg kick",
  17: "Overhand right, left hook, right uppercut, takedown",
  18: "Clinch, knee strike, foot sweep, ground control",
  19: "Fake takedown, uppercut, hook, high kick",
  20: "Jab, cross, bob and weave, body shot, takedown",
  21: "Front kick, cross, hook, spinning back kick",
  22: "Slip jab, counter cross, left hook, right low kick",
  23: "Catch kick, sweep, ground and pound",
  24: "Jab, cross, level change, single leg takedown",
  25: "Clinch, dirty boxing, knee strike, throw",
  26: "Low kick, jab, cross, high kick",
  27: "Feint kick, overhand right, left hook, takedown",
  28: "Sprawl, front headlock, gator roll",
  29: "Jab, cross, duck under, back take",
  30: "Push kick, spinning heel kick, clinch, throw",
  31: "Parry, elbow strike, knee, hip throw",
  32: "Inside leg kick, jab, cross, outside leg kick, takedown",
  33: "Overhand right, left hook, right uppercut, ankle pick",
  34: "Clinch, knee strike, foot sweep, arm bar",
  35: "Fake jab, right uppercut, left hook, takedown",
  36: "Front kick, spinning back fist, clinch, suplex",
  37: "Slip, body shot, hook, high kick",
  38: "Jab, cross, level change, ankle pick",
  39: "Low kick, overhand right, left hook, clinch, throw",
  40: "Catch kick, counter punch, takedown",
  41: "Jab, cross, bob and weave, liver shot, clinch",
  42: "Push kick, cross, hook, leg kick",
  43: "Feint takedown, uppercut, hook, knee strike",
  44: "Parry, cross counter, hook, takedown",
  45: "Clinch, knee strike, outside trip",
  46: "Inside leg kick, jab, cross, high kick",
  47: "Overhand right, left hook, level change, double leg",
  48: "Sprawl, front headlock, snap down",
  49: "Jab, cross, slip, body shot, clinch, throw",
  50: "Low kick, jab, cross, spinning back kick",
  51: "Feint jab, right hook, left uppercut, takedown",
  52: "Catch punch, counter elbow, knee, throw",
  53: "Push kick, spinning back fist, takedown",
  54: "Slip, right uppercut, left hook, right low kick",
  55: "Jab, cross, level change, single leg, lift, slam",
  56: "Clinch, dirty boxing, knee strike, foot sweep",
  57: "Inside leg kick, cross, hook, outside leg kick, clinch",
  58: "Overhand right, left hook, right uppercut, double leg",
  59: "Front kick, jab, cross, high kick",
  60: "Feint kick, right hook, left uppercut, takedown",
  61: "Sprawl, front headlock, arm drag to back take",
  62: "Jab, cross, duck under, suplex",
  63: "Low kick, overhand right, left hook, clinch, knee",
  64: "Parry, counter cross, hook, spinning back kick",
  65: "Clinch, knee strike, hip throw, ground control",
  66: "Fake jab, right uppercut, left hook, leg kick",
  67: "Push kick, cross, hook, takedown",
  68: "Slip, body shot, hook, high kick, clinch",
  69: "Jab, cross, level change, ankle pick, ground and pound",
  70: "Inside leg kick, jab, cross, outside leg kick, spinning back fist",
  71: "Overhand right, left hook, right uppercut, clinch, throw",
  72: "Catch kick, sweep, mount, submission attempt",
  73: "Front kick, spinning heel kick, takedown",
  74: "Feint takedown, uppercut, hook, high kick",
  75: "Parry, elbow strike, knee, outside trip",
  76: "Clinch, dirty boxing, knee strike, inside trip",
  77: "Low kick, jab, cross, spinning back kick, clinch",
  78: "Slip jab, counter cross, left hook, right low kick, takedown",
  79: "Sprawl, front headlock, go behind",
  80: "Jab, cross, bob and weave, liver shot, takedown",
  81: "Push kick, overhand right, left hook, clinch, throw",
  82: "Feint jab, right hook, left uppercut, leg kick",
  83: "Catch punch, counter knee, clinch, throw",
  84: "Inside leg kick, cross, hook, high kick, takedown",
  85: "Overhand right, left hook, level change, single leg",
  86: "Front kick, jab, cross, spinning back fist",
  87: "Slip, right uppercut, left hook, takedown",
  88: "Jab, cross, duck under, back take, rear naked choke",
  89: "Low kick, overhand right, left hook, right elbow",
  90: "Parry, counter hook, cross, knee strike",
  91: "Clinch, knee strike, foot sweep, arm lock",
  92: "Fake takedown, uppercut, hook, spinning back kick",
  93: "Push kick, cross, hook, outside leg kick, clinch",
  94: "Slip, body shot, hook, high kick, takedown",
  95: "Jab, cross, level change, double leg, ground and pound",
  96: "Inside leg kick, jab, cross, outside leg kick, spinning heel kick",
  97: "Overhand right, left hook, right uppercut, clinch, suplex",
  98: "Catch kick, counter punch, takedown, submission attempt",
  99: "Front kick, spinning back fist, clinch, knee strike, throw",
  100: "Feint jab, right hook, left uppercut, leg kick, takedown"
  },

  'BJJ': {
    1: "Double leg takedown > Mount > Ground and pound",
  2: "Single leg takedown > Side control > Kimura",
  3: "Clinch > Hip throw > Armbar",
  4: "Sprawl > Front headlock > Guillotine choke",
  5: "Pull guard > Sweep > Rear naked choke",
  6: "Ankle pick > Knee on belly > Americana",
  7: "Arm drag > Back take > Rear naked choke",
  8: "Duck under > Back take > Bow and arrow choke",
  9: "Snap down > Front headlock > D'arce choke",
  10: "Osoto gari > Side control > North-south choke",
  11: "Collar tie > Knee tap > Mount > Ezekiel choke",
  12: "Arm wrap > Trip > Kesa gatame > Arm triangle",
  13: "Underhook > Lateral drop > Side control > Kimura",
  14: "Overhook > Uchi mata > Mount > Cross collar choke",
  15: "Wrist control > Foot sweep > Knee on belly > Straight armbar",
  16: "Two-on-one > Arm drag > Back take > Rear naked choke",
  17: "Collar grab defense > Arm drag > Single leg > Ground and pound",
  18: "Haymaker defense > Clinch > Hip throw > Mount",
  19: "Bear hug defense > Lateral drop > Side control > Americana",
  20: "Headlock defense > Switch > Back take > Rear naked choke",
  21: "Guard pull > Triangle choke > Armbar",
  22: "Double leg > Half guard pass > Mount > Arm triangle",
  23: "Single leg > Knee cut pass > Side control > Kimura",
  24: "Clinch > Foot sweep > Mount > Cross collar choke",
  25: "Sprawl > Spin behind > Back take > Bow and arrow choke",
  26: "Arm drag > Single leg > Knee on belly > Straight armbar",
  27: "Duck under > Waist lock > Suplex > Rear naked choke",
  28: "Snap down > Front headlock > Anaconda choke",
  29: "Osoto gari > Scarf hold > Americana",
  30: "Collar tie > Inside trip > Mount > Ezekiel choke",
  31: "Underhook > Outside trip > Side control > North-south choke",
  32: "Overhook > Harai goshi > Mount > Arm triangle",
  33: "Wrist control > Ankle pick > Knee on belly > Kimura",
  34: "Two-on-one > Russian tie > Single leg > Ground and pound",
  35: "Collar grab defense > Osoto gari > Side control > Americana",
  36: "Haymaker defense > Slip > Double leg > Mount",
  37: "Bear hug defense > Hip toss > Side control > Kimura",
  38: "Headlock defense > Roll > Mount > Cross collar choke",
  39: "Guard pull > Omoplata > Straight armlock",
  40: "Double leg > Toreando pass > Side control > Arm triangle",
  41: "Single leg > X-pass > Mount > Ezekiel choke",
  42: "Clinch > Uchi mata > Side control > North-south choke",
  43: "Sprawl > Go behind > Back take > Rear naked choke",
  44: "Arm drag > Kouchi gari > Knee on belly > Straight armbar",
  45: "Duck under > Body lock > Suplex > Arm triangle",
  46: "Snap down > Front headlock > Japanese necktie",
  47: "Osoto gari > Kesa gatame > Arm triangle",
  48: "Collar tie > Ankle pick > Side control > Kimura",
  49: "Underhook > Sumi gaeshi > Mount > Cross collar choke",
  50: "Overhook > Ouchi gari > Side control > Americana",
  51: "Wrist control > De ashi barai > Knee on belly > Straight armbar",
  52: "Two-on-one > Fireman's carry > Side control > North-south choke",
  53: "Collar grab defense > Seoi nage > Mount > Ezekiel choke",
  54: "Haymaker defense > Bob and weave > Double leg > Ground and pound",
  55: "Bear hug defense > Ura nage > Side control > Kimura",
  56: "Headlock defense > Sit-through > Back take > Bow and arrow choke",
  57: "Guard pull > Scissor sweep > Mount > Cross collar choke",
  58: "Double leg > Stack pass > Mount > Arm triangle",
  59: "Single leg > Smash pass > Side control > Americana",
  60: "Clinch > Kosoto gake > Side control > Kimura",
  61: "Sprawl > Limp arm > Front headlock > Anaconda choke",
  62: "Arm drag > Tai otoshi > Mount > Ezekiel choke",
  63: "Duck under > Single leg > Knee on belly > Straight armbar",
  64: "Snap down > Spiral ride > Back take > Rear naked choke",
  65: "Osoto gari > Modified scarf hold > Arm triangle",
  66: "Collar tie > Double leg > Half guard pass > Mount",
  67: "Underhook > Uchi mata > Side control > Kimura",
  68: "Overhook > Tani otoshi > Mount > Cross collar choke",
  69: "Wrist control > Tomoe nage > Armbar",
  70: "Two-on-one > Knee tap > Side control > North-south choke",
  71: "Collar grab defense > Hip throw > Mount > Ezekiel choke",
  72: "Haymaker defense > Level change > Double leg > Ground and pound",
  73: "Bear hug defense > Sumi gaeshi > Mount > Arm triangle",
  74: "Headlock defense > Arm trap > Back take > Rear naked choke",
  75: "Guard pull > Flower sweep > Mount > Cross collar choke",
  76: "Double leg > Over-under pass > Side control > Kimura",
  77: "Single leg > Leg drag pass > Mount > Ezekiel choke",
  78: "Clinch > Ouchi gari > Side control > Americana",
  79: "Sprawl > Switch > Back take > Bow and arrow choke",
  80: "Arm drag > Ankle pick > Knee on belly > Straight armbar",
  81: "Duck under > High crotch > Knee on belly > Kimura",
  82: "Snap down > Cow catcher > D'arce choke",
  83: "Osoto gari > Knee on stomach > Straight armlock",
  84: "Collar tie > Single leg > Half guard pass > Mount",
  85: "Underhook > Kouchi gari > Side control > North-south choke",
  86: "Overhook > Sasae tsurikomi ashi > Mount > Arm triangle",
  87: "Wrist control > Sumi gaeshi > Armbar",
  88: "Two-on-one > Inside trip > Side control > Americana",
  89: "Collar grab defense > Double leg > Toreando pass > Mount",
  90: "Haymaker defense > Duck under > Back take > Rear naked choke",
  91: "Bear hug defense > Foot sweep > Side control > Kimura",
  92: "Headlock defense > Hip bump > Mount > Cross collar choke",
  93: "Guard pull > Pendulum sweep > Mount > Ezekiel choke",
  94: "Double leg > Pressure pass > Side control > Arm triangle",
  95: "Single leg > Bull fighter pass > Mount > Cross collar choke",
  96: "Clinch > Harai goshi > Side control > Americana",
  97: "Sprawl > Crossface > Front headlock > Anaconda choke",
  98: "Arm drag > Uchi mata > Mount > Arm triangle",
  99: "Duck under > Double leg > Half guard pass > Mount",
  100: "Snap down > Guillotine > Mount > Ezekiel choke",
  101: "Osoto gari > Side control > Paper cutter choke",
  102: "Collar tie > Foot sweep > Knee on belly > Straight armbar",
  103: "Underhook > Body lock takedown > Side control > Kimura",
  104: "Overhook > Kosoto gari > Mount > Cross collar choke",
  105: "Wrist control > Seoi nage > Armbar",
  106: "Two-on-one > Outside trip > Side control > North-south choke",
  107: "Collar grab defense > Arm drag > Back take > Rear naked choke",
  108: "Haymaker defense > Shoot > Single leg > Ground and pound",
  109: "Bear hug defense > Uchi mata > Mount > Ezekiel choke",
  110: "Headlock defense > Lateral drop > Side control > Americana",
  111: "Guard pull > Hip bump sweep > Mount > Arm triangle",
  112: "Double leg > Knee slice pass > Side control > Kimura",
  113: "Single leg > Backstep pass > Mount > Cross collar choke",
  114: "Clinch > Foot sweep > Side control > North-south choke",
  115: "Sprawl > Snap down > Front headlock > D'arce choke",
  116: "Arm drag > Ouchi gari > Knee on belly > Straight armbar",
  117: "Duck under > Ankle pick > Side control > Americana",
  118: "Snap down > Arm-in guillotine > Mount",
  119: "Osoto gari > Kesa gatame > Chest compression",
  120: "Collar tie > Lateral drop > Side control > Kimura",
  121: "Underhook > Sumi gaeshi > Armbar",
  122: "Overhook > Tai otoshi > Mount > Ezekiel choke",
  123: "Wrist control > Kouchi gari > Knee on belly > Straight armbar",
  124: "Two-on-one > Hip throw > Side control > Arm triangle",
  125: "Collar grab defense > Duck under > Back take > Bow and arrow choke",
  126: "Haymaker defense > Clinch > Osoto gari > Mount",
  127: "Bear hug defense > Suplex > Side control > Kimura",
  128: "Headlock defense > Sit-out > Back take > Rear naked choke",
  129: "Guard pull > Kimura sweep > Side control > Americana",
  130: "Double leg > Double under pass > Mount > Cross collar choke",
  131: "Single leg > Tripod pass > Side control > North-south choke",
  132: "Clinch > Inside trip > Mount > Arm triangle",
  133: "Sprawl > Spiral ride > Back take > Rear naked choke",
  134: "Arm drag > Fireman's carry > Side control > Kimura",
  135: "Duck under > Uchi mata > Mount > Ezekiel choke",
  136: "Snap down > Clock choke > Mount",
  137: "Osoto gari > Side control > Straight armlock",
  138: "Collar tie > Single leg > Knee cut pass > Mount",
  139: "Underhook > Harai goshi > Side control > Americana",
  140: "Overhook > De ashi barai > Mount > Cross collar choke",
  141: "Wrist control > Ankle pick > Side control > North-south choke",
  142: "Two-on-one > Kosoto gake > Mount > Arm triangle",
  143: "Collar grab defense > Snap down > Front headlock > Anaconda choke",
  144: "Haymaker defense > Slip > Clinch > Hip throw > Mount",
  145: "Bear hug defense > Back trip > Side control > Kimura",
  146: "Headlock defense > Forward roll > Mount > Ezekiel choke",
  147: "Guard pull > Tripod sweep > Mount > Cross collar choke",
  148: "Double leg > Leg weave pass > Side control > Americana",
  149: "Single leg > Over-under pass > Mount > Arm triangle",
  150: "Clinch > Foot sweep > Knee on belly > Straight armbar",
  },

  'Wrestling': {
  1: "Double leg takedown to side control",
  2: "Single leg takedown to half guard",
  3: "Arm drag to rear naked choke",
  4: "Clinch to hip throw",
  5: "Sprawl to front headlock",
  6: "Ankle pick to knee on belly",
  7: "Snap down to guillotine choke",
  8: "Body lock to suplex",
  9: "Underhook to trip takedown",
  10: "Collar tie to knee strike",
  11: "Arm wrap to back take",
  12: "Duck under to waist lock takedown",
  13: "Overhook to lateral drop",
  14: "Wrist control to arm drag",
  15: "Leg lace to calf slicer",
  16: "Fireman's carry to armbar",
  17: "Shoulder throw to mount",
  18: "Ankle sweep to kneebar",
  19: "Arm trap to hip toss",
  20: "Headlock to throw",
  21: "Foot sweep to side control",
  22: "Arm spin to back mount",
  23: "Knee tap to north-south position",
  24: "Whizzer to outside trip",
  25: "Collar drag to anaconda choke",
  26: "Leg hook to sweep",
  27: "Arm control to kimura",
  28: "Clinch to knee tap",
  29: "Wrist lock to takedown",
  30: "Snap down to front choke",
  31: "Arm bar from guard",
  32: "Double underhooks to body lock takedown",
  33: "Single collar tie to elbow strike",
  34: "Leg ride to calf crush",
  35: "Arm triangle from mount",
  36: "Butterfly sweep to mount",
  37: "Ankle pick to leg lace",
  38: "Arm drag to single leg",
  39: "Collar tie to Russian tie",
  40: "Underhook to back take",
  41: "Snap down to cradle",
  42: "Arm wrap to suplex",
  43: "Wrist control to standing kimura",
  44: "Knee shield to sweep",
  45: "Arm trap to shoulder lock",
  46: "Head and arm control to throw",
  47: "Ankle pick to single leg X-guard",
  48: "Clinch to inside trip",
  49: "Arm drag to body lock",
  50: "Collar tie to head snap",
  51: "Underhook to outside trip",
  52: "Wrist control to Russian arm drag",
  53: "Knee tap to side control",
  54: "Arm wrap to back take",
  55: "Snap down to arm triangle",
  56: "Double leg to mount",
  57: "Single leg to back take",
  58: "Arm drag to duck under",
  59: "Clinch to foot sweep",
  60: "Sprawl to spin behind",
  61: "Ankle pick to back control",
  62: "Snap down to d'arce choke",
  63: "Body lock to mat return",
  64: "Underhook to lateral drop",
  65: "Collar tie to snap down",
  66: "Arm wrap to hip throw",
  67: "Duck under to rear bodylock",
  68: "Overhook to headlock throw",
  69: "Wrist control to single leg",
  70: "Leg lace to back take",
  71: "Fireman's carry to side control",
  72: "Shoulder throw to armbar",
  73: "Ankle sweep to leg lock",
  74: "Arm trap to sacrifice throw",
  75: "Headlock to arm triangle",
  76: "Foot sweep to mount",
  77: "Arm spin to kimura trap",
  78: "Knee tap to crucifix",
  79: "Whizzer to hip toss",
  80: "Collar drag to back mount",
  81: "Leg hook to back take",
  82: "Arm control to omoplata",
  83: "Clinch to suplex",
  84: "Wrist lock to arm drag",
  85: "Snap down to rear naked choke",
  86: "Guard pull to sweep",
  87: "Double underhooks to high crotch",
  88: "Single collar tie to level change",
  89: "Leg ride to turk",
  90: "Arm triangle to mount",
  91: "Butterfly guard to X-guard",
  92: "Ankle pick to single leg",
  93: "Arm drag to clinch",
  94: "Collar tie to arm drag",
  95: "Underhook to knee tap",
  96: "Snap down to front headlock",
  97: "Arm wrap to inside trip",
  98: "Wrist control to duck under",
  99: "Knee shield to back take",
  100: "Arm trap to double leg"
    },


    'Judo': {
    1: "O Goshi (Major Hip Throw)",
    2: "Seoi Nage (Shoulder Throw)",
    3: "Uchi Mata (Inner Thigh Throw)",
    4: "Tai Otoshi (Body Drop)",
    5: "Koshi Guruma (Hip Wheel)",
    6: "Harai Goshi (Hip Sweep)",
    7: "Sumi Gaeshi (Corner Reversal)",
    8: "Ippon Seoi Nage (One-Arm Shoulder Throw)",
    9: "Osoto Gari (Large Outer Reap)",
    10: "Osoto Otoshi (Large Outer Drop)",
    11: "Ashi Guruma (Foot Wheel)",
    12: "De Ashi Barai (Advanced Foot Sweep)",
    13: "Okuri Ashi Barai (Sliding Foot Sweep)",
    14: "Sasae Tsurikomi Ashi (Supporting Foot Lift Sweep)",
    15: "Hiza Guruma (Knee Wheel)",
    16: "Uchi Ashi Barai (Inner Foot Sweep)",
    17: "Kouchi Gari (Small Inner Reap)",
    18: "Kouchi Barai (Small Inner Sweep)",
    19: "Ashi Tori Zemi (Foot Catching)",
    20: "Tsurikomi Ashi (Lifting Foot Sweep)",
    21: "Tomoe Nage (Circle Throw)",
    22: "Sumi Gaeshi (Corner Reversal)",
    23: "Ura Nage (Back Throw)",
    24: "Yoko Gake (Side Hook)",
    25: "Yoko Otoshi (Side Drop)",
    26: "Hane Goshi (Spring Hip Throw)",
    27: "Kani Basami (Crab Leg Sweep)",
    28: "Tani Otoshi (Valley Drop)",
    29: "Ashi Garami (Leg Trap)",
    30: "Uchi Mata Sukashi (Inner Thigh Reversal)",
    31: "Kesa Gatame (Scarf Hold)",
    32: "Yoko Shiho Gatame (Side Four Corner Hold)",
    33: "Tate Shiho Gatame (Top Four Corner Hold)",
    34: "Kami Shiho Gatame (Upper Four Corner Hold)",
    35: "Juji Gatame (Armbar)",
    36: "Ude Garami (Entangled Arm)",
    37: "Shime Waza (Strangulation Techniques)",
    38: "Kata Gatame (Shoulder Hold)",
    39: "Ashi Garami (Leg Entanglement)",
    40: "Hiza Gatame (Knee Hold)",
    41: "Atemi Waza (Striking Techniques)",
    42: "Kansetsu Waza (Joint Locks)",
    43: "Ashi Uke (Foot Block)",
    44: "Waki Gatame (Armpit Arm Lock)",
    45: "Atemi (Striking with the Open Hand)",
    46: "Ude Hishigi Juji Gatame (Armbar in Cross Position)",
    47: "Ashi Hishigi (Foot Lock)",
    48: "Ude Hishigi Ura (Reverse Arm Lock)",
    49: "Kote Hishigi (Wrist Lock)",
    50: "Kansetsu Waza Kata Gatame (Shoulder Lock)"
    },

  };


export default function App() {
 const [generatedTasks, setGeneratedTasks] = useState({});
 const [fontSize, setFontSize] = useState(16);
 const [isTraining, setIsTraining] = useState(false);
 const [currentStyle, setCurrentStyle] = useState(null);
 const [trainingInterval, setTrainingInterval] = useState(null);
 
 // Separate rest periods for combinations and HIIT timer
 const [comboRestPeriod, setComboRestPeriod] = useState(5);
 const [hiitRestPeriod, setHiitRestPeriod] = useState(10);
 
 const [isSettingsVisible, setIsSettingsVisible] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState(null);
 const [workPeriod, setWorkPeriod] = useState(30);
 const [timerMode, setTimerMode] = useState('rest');
 const [timeRemaining, setTimeRemaining] = useState(0);
 const [timerActive, setTimerActive] = useState(false);
 const [totalRounds, setTotalRounds] = useState(5);
 const [currentRound, setCurrentRound] = useState(1);
 
 // Enhanced speech system
 const [speechQueue, setSpeechQueue] = useState([]);
 const [isSpeaking, setIsSpeaking] = useState(false);
 const [timerSpeechPaused, setTimerSpeechPaused] = useState(false);
 const [comboSpeechPaused, setComboSpeechPaused] = useState(false);

 const taskOpacity = useRef(new Animated.Value(0)).current;
 const scaleAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
   retrieveSavedTasks();
   retrieveFontSize();
   retrieveComboRestPeriod();
   retrieveHiitRestPeriod();
   retrieveWorkPeriod();
   retrieveTotalRounds();
   retrieveSpeechSettings();
   return () => {
     Speech.stop();
   };
 }, []);

 // Enhanced speech queue processing
 useEffect(() => {
   const processSpeechQueue = async () => {
     if (speechQueue.length > 0 && !isSpeaking) {
       setIsSpeaking(true);
       const speechItem = speechQueue[0];
       
       try {
         // Use different speech rates for different types of speech
         const rate = speechItem.type === 'combo' ? 0.8 : 0.9;
         
         await Speech.speak(speechItem.text, {
           rate,
           onDone: () => {
             setSpeechQueue(prev => prev.slice(1));
             setIsSpeaking(false);
           },
           onError: () => {
             setSpeechQueue(prev => prev.slice(1));
             setIsSpeaking(false);
           }
         });
       } catch (error) {
         console.log('Speech error:', error);
         setIsSpeaking(false);
         setSpeechQueue(prev => prev.slice(1));
       }
     }
   };

   processSpeechQueue();
 }, [speechQueue, isSpeaking]);

 // Improved speech queue management
 const addToSpeechQueue = (text, type = 'timer') => {
   // Check if we should add this speech item
   const shouldAdd = type === 'timer' ? !timerSpeechPaused : !comboSpeechPaused;
   
   if (shouldAdd) {
     // Give combo speech higher priority by adding it to the front of the queue
     if (type === 'combo' && speechQueue.length > 0) {
       setSpeechQueue(prev => [{ text, type }, ...prev]);
     } else {
       setSpeechQueue(prev => [...prev, { text, type }]);
     }
   }
 };

 // Save and retrieve speech settings
 const saveSpeechSettings = async () => {
   try {
     const settings = {
       timerSpeechPaused,
       comboSpeechPaused
     };
     await AsyncStorage.setItem('speechSettings', JSON.stringify(settings));
   } catch (error) {
     console.log('Error saving speech settings:', error);
   }
 };

 const retrieveSpeechSettings = async () => {
   try {
     const settings = await AsyncStorage.getItem('speechSettings');
     if (settings !== null) {
       const { timerSpeechPaused: timerPaused, comboSpeechPaused: comboPaused } = JSON.parse(settings);
       setTimerSpeechPaused(timerPaused);
       setComboSpeechPaused(comboPaused);
     }
   } catch (error) {
     console.log('Error retrieving speech settings:', error);
   }
 };

 // Save speech settings when they change
 useEffect(() => {
   saveSpeechSettings();
 }, [timerSpeechPaused, comboSpeechPaused]);

 useEffect(() => {
   let interval = null;
   
   if (timerActive) {
     interval = setInterval(() => {
       setTimeRemaining(prevTime => {
         if (prevTime <= 1) {
           const newMode = timerMode === 'work' ? 'rest' : 'work';
           setTimerMode(newMode);
           
           // Timer announcements
           if (newMode === 'work') {
             addToSpeechQueue("Begin work period", 'timer');
             if (timerMode === 'work') {
               if (currentRound >= totalRounds) {
                 addToSpeechQueue("Workout complete!", 'timer');
                 setTimerActive(false);
                 setCurrentRound(1);
                 return 0;
               } else {
                 const nextRound = currentRound + 1;
                 addToSpeechQueue(`Round ${nextRound}`, 'timer');
                 setCurrentRound(nextRound);
               }
             }
           } else {
             addToSpeechQueue("Rest now", 'timer');
           }
           
           // Use different rest periods for work vs. rest
           return newMode === 'work' ? workPeriod : hiitRestPeriod;
         } else if (prevTime <= 3 && prevTime > 0) {
           // Countdown the last 3 seconds
           addToSpeechQueue(prevTime.toString(), 'timer');
           return prevTime - 1;
         }
         return prevTime - 1;
       });
     }, 1000);
   }
   
   return () => {
     clearInterval(interval);
   };
 }, [timerActive, timerMode, timeRemaining, workPeriod, hiitRestPeriod, currentRound, totalRounds]);

 const startHiitTimer = () => {
   addToSpeechQueue("Starting workout. Round 1", 'timer');
   setTimerMode('work');
   setTimeRemaining(workPeriod);
   setCurrentRound(1);
   setTimerActive(true);
 };

 const stopHiitTimer = () => {
   setTimerActive(false);
   setTimeRemaining(0);
   // Don't clear the speech queue, only stop current speech if any
   Speech.stop();
 };

 // Functions for combo rest period
 const retrieveComboRestPeriod = async () => {
   try {
     const savedRestPeriod = await AsyncStorage.getItem('comboRestPeriod');
     if (savedRestPeriod !== null) {
       setComboRestPeriod(JSON.parse(savedRestPeriod));
     }
   } catch (error) {
     console.log('Error retrieving combo rest period:', error);
   }
 };

 const saveComboRestPeriod = async (newRestPeriod) => {
   try {
     await AsyncStorage.setItem('comboRestPeriod', JSON.stringify(newRestPeriod));
   } catch (error) {
     console.log('Error saving combo rest period:', error);
   }
 };

 const updateComboRestPeriod = (newPeriod) => {
   setComboRestPeriod(newPeriod);
   saveComboRestPeriod(newPeriod);
   
   if (isTraining && currentStyle) {
     stopTrainingSession();
     startTrainingSession(currentStyle);
   }
 };

 // Functions for HIIT rest period
 const retrieveHiitRestPeriod = async () => {
   try {
     const savedRestPeriod = await AsyncStorage.getItem('hiitRestPeriod');
     if (savedRestPeriod !== null) {
       setHiitRestPeriod(JSON.parse(savedRestPeriod));
     }
   } catch (error) {
     console.log('Error retrieving HIIT rest period:', error);
   }
 };

 const saveHiitRestPeriod = async (newRestPeriod) => {
   try {
     await AsyncStorage.setItem('hiitRestPeriod', JSON.stringify(newRestPeriod));
   } catch (error) {
     console.log('Error saving HIIT rest period:', error);
   }
 };

 const updateHiitRestPeriod = (newPeriod) => {
   setHiitRestPeriod(newPeriod);
   saveHiitRestPeriod(newPeriod);
 };

 const TimerDisplay = () => {
   const formatTime = (seconds) => {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
   };

   return (
     <View style={styles.timerContainer}>
       <View style={[
         styles.timerCircle, 
         { borderColor: timerMode === 'work' ? '#f44336' : '#4CAF50' }
       ]}>
         <Text style={[
           styles.timerText, 
           { color: timerMode === 'work' ? '#f44336' : '#4CAF50' }
         ]}>
           {formatTime(timeRemaining)}
         </Text>
         <Text style={styles.timerModeText}>
           {timerActive ? (timerMode === 'work' ? 'WORK' : 'REST') : 'READY'}
         </Text>
       </View>
       
       <Text style={styles.roundsText}>
         Round {currentRound}/{totalRounds}
       </Text>
       
       <View style={styles.timerControls}>
         {!timerActive ? (
           <TouchableOpacity
             style={[styles.controlButton, { backgroundColor: '#4CAF50' }]}
             onPress={startHiitTimer}
           >
             <Ionicons name="play" size={24} color="#fff" />
           </TouchableOpacity>
         ) : (
           <TouchableOpacity
             style={[styles.controlButton, { backgroundColor: '#f44336' }]}
             onPress={stopHiitTimer}
           >
             <Ionicons name="stop" size={24} color="#fff" />
           </TouchableOpacity>
         )}
       </View>

       {/* Test button for speech */}
       <TouchableOpacity 
         style={styles.testButton}
         onPress={() => addToSpeechQueue("Test voice announcement", 'timer')}
       >
         <Text style={styles.testButtonText}>Test Voice</Text>
       </TouchableOpacity>
     </View>
   );
 };

 const updateWorkPeriod = (newPeriod) => {
   setWorkPeriod(newPeriod);
   saveWorkPeriod(newPeriod);
 };

 const updateTotalRounds = (newRounds) => {
   setTotalRounds(newRounds);
   saveTotalRounds(newRounds);
 };

 const saveWorkPeriod = async (newWorkPeriod) => {
   try {
     await AsyncStorage.setItem('workPeriod', JSON.stringify(newWorkPeriod));
   } catch (error) {
     console.log('Error saving work period:', error);
   }
 };

 const retrieveWorkPeriod = async () => {
   try {
     const savedWorkPeriod = await AsyncStorage.getItem('workPeriod');
     if (savedWorkPeriod !== null) {
       setWorkPeriod(JSON.parse(savedWorkPeriod));
     }
   } catch (error) {
     console.log('Error retrieving work period:', error);
   }
 };

 const saveTotalRounds = async (newTotalRounds) => {
   try {
     await AsyncStorage.setItem('totalRounds', JSON.stringify(newTotalRounds));
   } catch (error) {
     console.log('Error saving total rounds:', error);
   }
 };

 const retrieveTotalRounds = async () => {
   try {
     const savedTotalRounds = await AsyncStorage.getItem('totalRounds');
     if (savedTotalRounds !== null) {
       setTotalRounds(JSON.parse(savedTotalRounds));
     }
   } catch (error) {
     console.log('Error retrieving total rounds:', error);
   }
 };

 const animateTaskGeneration = () => {
   Animated.sequence([
     Animated.timing(taskOpacity, {
       toValue: 0,
       duration: 200,
       useNativeDriver: true
     }),
     Animated.timing(taskOpacity, {
       toValue: 1,
       duration: 500,
       useNativeDriver: true
     })
   ]).start();
 };

 const speakCombination = async (combination) => {
   try {
     // Use the queue system for speaking combinations with 'combo' type
     addToSpeechQueue(combination, 'combo');
     return true;
   } catch (error) {
     console.error('Error in speakCombination:', error);
     return false;
   }
 };

 const startTrainingSession = (style) => {
   setIsTraining(true);
   setCurrentStyle(style);

   const generateAndSpeak = () => {
     const tasks = taskDifficulties[style];
     const taskLevels = Object.keys(tasks);
     const randomLevel = taskLevels[Math.floor(Math.random() * taskLevels.length)];
     const task = tasks[randomLevel];
     
     setGeneratedTasks(prev => ({ ...prev, [style]: task }));
     animateTaskGeneration();
     speakCombination(task);
   };

   generateAndSpeak();
   // Use the comboRestPeriod for the interval
   const interval = setInterval(generateAndSpeak, comboRestPeriod * 1000);
   setTrainingInterval(interval);
 };

 const stopTrainingSession = () => {
   setIsTraining(false);
   // Stop current speech but don't clear the queue
   Speech.stop();
   if (trainingInterval) {
     clearInterval(trainingInterval);
     setTrainingInterval(null);
   }
 };

 const generateTask = (stat) => {
   const tasks = taskDifficulties[stat];
   const taskLevels = Object.keys(tasks);
   const randomLevel = Math.floor(Math.random() * taskLevels.length);
   const taskLevel = taskLevels[randomLevel];
   const task = tasks[taskLevel];
   setGeneratedTasks({ ...generatedTasks, [stat]: task });
   animateTaskGeneration();
 };

 const handleZoomIn = () => {
   const newFontSize = Math.min(fontSize + (fontSize * 0.1), width / 20);
   setFontSize(newFontSize);
   saveFontSize(newFontSize);
 };

 const handleZoomOut = () => {
   const newFontSize = Math.max(fontSize - (fontSize * 0.1), width / 40);
   setFontSize(newFontSize);
   saveFontSize(newFontSize);
 };

 const saveFontSize = async (newFontSize) => {
   try {
     await AsyncStorage.setItem('fontSize', JSON.stringify(newFontSize));
   } catch (error) {
     console.log('Error saving font size:', error);
   }
 };

 const retrieveFontSize = async () => {
   try {
     const savedFontSize = await AsyncStorage.getItem('fontSize');
     if (savedFontSize !== null) {
       setFontSize(JSON.parse(savedFontSize));
     }
   } catch (error) {
     console.log('Error retrieving font size:', error);
   }
 };

 const saveTasks = async () => {
   try {
     const tasksToSave = JSON.stringify(generatedTasks);
     await AsyncStorage.setItem('generatedTasks', tasksToSave);
   } catch (error) {
     console.log('Error saving tasks:', error);
   }
 };

 const retrieveSavedTasks = async () => {
   try {
     const savedTasks = await AsyncStorage.getItem('generatedTasks');
     if (savedTasks !== null) {
       setGeneratedTasks(JSON.parse(savedTasks));
     }
   } catch (error) {
     console.log('Error retrieving tasks:', error);
   }
 };

 useEffect(() => {
   saveTasks();
 }, [generatedTasks]);

 const CategoryCard = ({ category, task }) => {
   const isSelected = selectedCategory === category;
   const cardScale = useRef(new Animated.Value(1)).current;

   useEffect(() => {
     if (isSelected) {
       Animated.spring(cardScale, {
         toValue: 1.05,
         friction: 3,
         useNativeDriver: true,
       }).start();
     } else {
       Animated.spring(cardScale, {
         toValue: 1,
         friction: 3,
         useNativeDriver: true,
       }).start();
     }
   }, [isSelected]);

   return (
     <TouchableOpacity 
       onPress={() => setSelectedCategory(category)}
       activeOpacity={0.9}
     >
       <Animated.View 
         style={[
           styles.categoryCard,
           {
             transform: [{ scale: cardScale }],
             backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
           }
         ]}
       >
         <LinearGradient
           colors={isSelected ? ['#4a90e2', '#357abd'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
           style={styles.categoryGradient}
         >
           <Text style={styles.categoryTitle}>{category}</Text>
           <View style={styles.taskContainer}>
             <Text style={styles.taskText}>{task || 'Tap to generate'}</Text>
           </View>
           <View style={styles.cardControls}>
             <TouchableOpacity 
               style={styles.controlButton}
               onPress={() => generateTask(category)}
             >
               <Ionicons name="refresh" size={22} color="#fff" />
             </TouchableOpacity>
             {!isTraining ? (
               <TouchableOpacity
                 style={[styles.controlButton, styles.playButton]}
                 onPress={() => startTrainingSession(category)}
               >
                 <Ionicons name="play" size={22} color="#fff" />
               </TouchableOpacity>
             ) : currentStyle === category && (
               <TouchableOpacity
                 style={[styles.controlButton, styles.stopButton]}
                 onPress={stopTrainingSession}
               >
                 <Ionicons name="stop" size={22} color="#fff" />
               </TouchableOpacity>
             )}
           </View>
         </LinearGradient>
       </Animated.View>
     </TouchableOpacity>
   );
 };

 return (
   <SafeAreaView style={styles.container}>
     <StatusBar barStyle="light-content" />
     <LinearGradient
       colors={['#1a1a2e', '#16213e']}
       style={styles.gradient}
     >
       <View style={styles.header}>
         <Text style={styles.headerTitle}>Martial Arts Training</Text>
         <View style={styles.headerControls}>
           <TouchableOpacity 
             style={styles.iconButton}
             onPress={() => setIsSettingsVisible(true)}
           >
             <Ionicons name="settings-outline" size={24} color="#fff" />
           </TouchableOpacity>
           <TouchableOpacity 
             style={styles.iconButton}
             onPress={handleZoomOut}
           >
             <Ionicons name="remove-outline" size={24} color="#fff" />
           </TouchableOpacity>
           <TouchableOpacity 
             style={styles.iconButton}
             onPress={handleZoomIn}
           >
             <Ionicons name="add-outline" size={24} color="#fff" />
           </TouchableOpacity>
         </View>
       </View>

       <ScrollView
         contentContainerStyle={styles.scrollContent}
         showsVerticalScrollIndicator={false}
       >
         {/* HIIT Timer Display */}
         <TimerDisplay />
         
         {/* Category Cards */}
         {Object.entries(taskDifficulties).map(([category, tasks]) => (
           <CategoryCard
             key={category}
             category={category}
             task={generatedTasks[category]}
           />
         ))}
       </ScrollView>

       <Modal
         animationType="slide"
         transparent={true}
         visible={isSettingsVisible}
         onRequestClose={() => setIsSettingsVisible(false)}
       >
         <BlurView intensity={100} style={styles.modalContainer}>
           <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Training Settings</Text>
             
             {/* Add ScrollView for scrollable settings */}
             <ScrollView 
               style={styles.modalScroll}
               contentContainerStyle={styles.modalScrollContent}
               showsVerticalScrollIndicator={true}
             >
               <Text style={styles.modalSubtitle}>Combinations Settings</Text>
               <Text style={styles.settingLabel}>Combinations Rest Period</Text>
               <View style={styles.restButtons}>
                 {[10, 15, 20, 25, 30, 35].map((seconds) => (
                   <TouchableOpacity
                     key={seconds}
                     style={[
                       styles.restButton,
                       comboRestPeriod === seconds && styles.restButtonActive
                     ]}
                     onPress={() => updateComboRestPeriod(seconds)}
                   >
                     <Text style={[
                       styles.restButtonText,
                       comboRestPeriod === seconds && styles.restButtonTextActive
                     ]}>
                       {seconds}s
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>

               <Text style={styles.modalSubtitle}>HIIT Timer Settings</Text>

               <Text style={styles.settingLabel}>Work Period Duration</Text>
               <View style={styles.restButtons}>
                 {[20, 30, 45, 60, 90, 120, 180].map((seconds) => (
                   <TouchableOpacity
                     key={`work-${seconds}`}
                     style={[
                       styles.restButton,
                       workPeriod === seconds && styles.restButtonActive
                     ]}
                     onPress={() => updateWorkPeriod(seconds)}
                   >
                     <Text style={[
                       styles.restButtonText,
                       workPeriod === seconds && styles.restButtonTextActive
                     ]}>
                       {seconds}s
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>

               <Text style={styles.settingLabel}>HIIT Rest Period Duration</Text>
               <View style={styles.restButtons}>
                 {[10, 15, 20, 30, 45, 60].map((seconds) => (
                   <TouchableOpacity
                     key={`hiit-rest-${seconds}`}
                     style={[
                       styles.restButton,
                       hiitRestPeriod === seconds && styles.restButtonActive
                     ]}
                     onPress={() => updateHiitRestPeriod(seconds)}
                   >
                     <Text style={[
                       styles.restButtonText,
                       hiitRestPeriod === seconds && styles.restButtonTextActive
                     ]}>
                       {seconds}s
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>

               <Text style={styles.settingLabel}>Total Rounds</Text>
               <View style={styles.restButtons}>
                 {[3, 5, 8, 10, 12, 15].map((rounds) => (
                   <TouchableOpacity
                     key={`rounds-${rounds}`}
                     style={[
                       styles.restButton,
                       totalRounds === rounds && styles.restButtonActive
                     ]}
                     onPress={() => updateTotalRounds(rounds)}
                   >
                     <Text style={[
                       styles.restButtonText,
                       totalRounds === rounds && styles.restButtonTextActive
                     ]}>
                       {rounds}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>

               <Text style={styles.modalSubtitle}>Speech Settings</Text>
               
               <View style={styles.toggleRow}>
                 <Text style={styles.toggleLabel}>Timer Announcements</Text>
                 <TouchableOpacity 
                   style={[styles.toggleButton, !timerSpeechPaused && styles.toggleActive]} 
                   onPress={() => setTimerSpeechPaused(!timerSpeechPaused)}
                 >
                   <Text style={styles.toggleText}>{timerSpeechPaused ? 'OFF' : 'ON'}</Text>
                 </TouchableOpacity>
               </View>
               
               <View style={styles.toggleRow}>
                 <Text style={styles.toggleLabel}>Combination Announcements</Text>
                 <TouchableOpacity 
                   style={[styles.toggleButton, !comboSpeechPaused && styles.toggleActive]} 
                   onPress={() => setComboSpeechPaused(!comboSpeechPaused)}
                 >
                   <Text style={styles.toggleText}>{comboSpeechPaused ? 'OFF' : 'ON'}</Text>
                 </TouchableOpacity>
               </View>
             </ScrollView>

             <TouchableOpacity
               style={styles.closeButton}
               onPress={() => setIsSettingsVisible(false)}
             >
               <Text style={styles.closeButtonText}>Done</Text>
             </TouchableOpacity>
           </View>
         </BlurView>
       </Modal>
     </LinearGradient>
   </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#1a1a2e',
 },
 gradient: {
   flex: 1,
 },
 header: {
   paddingHorizontal: 20,
   paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
   paddingBottom: 10,
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
 },
 headerTitle: {
   fontSize: 24,
   fontWeight: 'bold',
   color: '#fff',
 },
 headerControls: {
   flexDirection: 'row',
   gap: 10,
 },
 iconButton: {
   width: 40,
   height: 40,
   borderRadius: 20,
   backgroundColor: 'rgba(255,255,255,0.1)',
   justifyContent: 'center',
   alignItems: 'center',
 },
 scrollContent: {
   padding: 20,
   gap: 20,
 },
 categoryCard: {
   borderRadius: 16,
   overflow: 'hidden',
   elevation: 5,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.25,
   shadowRadius: 3.84,
 },
 categoryGradient: {
   padding: 20,
 },
 categoryTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#fff',
   marginBottom: 10,
 },
 taskContainer: {
   backgroundColor: 'rgba(0,0,0,0.2)',
   borderRadius: 12,
   padding: 15,
   marginBottom: 15,
   minHeight: 80,
   justifyContent: 'center',
 },
 taskText: {
   fontSize: 16,
   color: '#fff',
   textAlign: 'center',
 },
 cardControls: {
   flexDirection: 'row',
   justifyContent: 'center',
   gap: 15,
 },
 controlButton: {
   width: 48,
   height: 48,
   borderRadius: 24,
   backgroundColor: 'rgba(255,255,255,0.2)',
   justifyContent: 'center',
   alignItems: 'center',
 },
 playButton: {
   backgroundColor: '#4CAF50',
 },
 stopButton: {
   backgroundColor: '#f44336',
 },
 modalContainer: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: 'rgba(0,0,0,0.5)',
 },
 modalContent: {
   width: '90%',
   backgroundColor: '#1a1a2e',
   borderRadius: 20,
   padding: 25,
   paddingBottom: 15,
   alignItems: 'center',
   elevation: 5,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.25,
   shadowRadius: 3.84,
   maxHeight: '85%',
 },
 modalScroll: {
   width: '100%',
   maxHeight: '80%',
 },
 modalScrollContent: {
   paddingBottom: 10,
 },
 modalTitle: {
   fontSize: 24,
   fontWeight: 'bold',
   color: '#fff',
   marginBottom: 20,
 },
 modalSubtitle: {
   fontSize: 16,
   color: '#fff',
   marginBottom: 15,
   alignSelf: 'flex-start',
   fontWeight: 'bold',
 },
 restButtons: {
   flexDirection: 'row',
   flexWrap: 'wrap',
   justifyContent: 'center',
   gap: 10,
   marginBottom: 25,
 },
 restButton: {
   paddingVertical: 10,
   paddingHorizontal: 20,
   borderRadius: 25,
   backgroundColor: 'rgba(255,255,255,0.1)',
   minWidth: 70,
   alignItems: 'center',
 },
 restButtonActive: {
   backgroundColor: '#4a90e2',
 },
 restButtonText: {
   color: '#fff',
   fontSize: 16,
 },
 restButtonTextActive: {
   fontWeight: 'bold',
 },
 closeButton: {
   backgroundColor: '#4a90e2',
   paddingVertical: 12,
   paddingHorizontal: 30,
   borderRadius: 25,
   marginTop: 10,
 },
 closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
  },
  timerCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerModeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  roundsText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: '#fff',
    alignSelf: 'flex-start',
    marginTop: 15,
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toggleActive: {
    backgroundColor: '#4a90e2',
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});