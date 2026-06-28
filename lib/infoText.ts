/**
 * Explanatory copy for every graph, widget, and setting, surfaced through an
 * <InfoBubble>. Kept in one place so the wording can be reviewed and edited
 * without touching component code. Each entry is two short lines: `what` it is
 * and `how` to use it. The `title` drives the popover heading and the button's
 * aria-label ("About {title}").
 */
export interface InfoEntry {
  title: string;
  what: string;
  how: string;
}

export const INFO = {
  // --- Dashboard ---------------------------------------------------------
  vitals: {
    title: "Live readouts",
    what: "The three live numbers: coherence (0–100, how smooth and rhythmic your heartbeat is), bpm (your heart rate), and zone (scattered → building → coherent).",
    how: "Watch coherence and zone climb as you breathe with the orb.",
  },
  breathOrb: {
    title: "Breathing pacer",
    what: "The orb expands as you breathe in and contracts as you breathe out, setting your pace.",
    how: "Follow it with slow, even breaths — calm paced breathing is what builds coherence.",
  },
  pace: {
    title: "Pace",
    what: "Your breathing speed, in breaths per minute, that the orb follows.",
    how: "Most people are calmest around 5–6. Use the Resonance Finder to find your own best pace.",
  },
  achievement: {
    title: "Achievement",
    what: "Points earned this session — they add up faster the more coherent you are — shown against your goal.",
    how: "Stay in the building and coherent zones to fill the bar and complete the goal.",
  },
  resonance: {
    title: "Resonance Finder",
    what: "A guided sweep that holds several breathing paces in turn and measures your coherence at each.",
    how: 'Connect a strap and run it once, then tap "use this pace" to set your most coherent rate.',
  },
  heartRhythm: {
    title: "Heart rhythm",
    what: "Your beat-to-beat heart rate over the last 30 seconds.",
    how: "Paced breathing makes this trace rise and fall in smooth, regular waves — the visible sign of coherence.",
  },
  coherenceOverTime: {
    title: "Coherence over time",
    what: "Your coherence score over the last few minutes, with the three zone bands shaded behind it.",
    how: "Keep the line up in the green (coherent) band as long as you can.",
  },
  spectrum: {
    title: "HRV spectrum",
    what: "How your heart-rate variability is spread across breathing rates. A single tall peak means one steady rhythm.",
    how: "Aim for one tall bar inside the shaded band over your breathing pace — that's peak coherence.",
  },
  timeInZone: {
    title: "Time in zone",
    what: "How long this session you've spent in each zone: scattered, building, and coherent.",
    how: "Try to grow the coherent bar over the session.",
  },

  // --- Settings ----------------------------------------------------------
  achievementGoal: {
    title: "Achievement goal",
    what: "The points target that completes a session.",
    how: "Lower it for quick sessions, raise it for longer practice.",
  },
  zoneThresholds: {
    title: "Zone thresholds",
    what: "The coherence scores where you cross from scattered into building, and from building into coherent.",
    how: "Lower them to reach the green zone more easily. Building must stay below coherent.",
  },
  resonanceInterval: {
    title: "Resonance interval",
    what: "How many seconds the Resonance Finder holds each pace before scoring it.",
    how: "Longer intervals give steadier readings but make the whole sweep longer.",
  },
  reducedMotion: {
    title: "Reduced motion",
    what: "Whether the orb and background effects animate. Auto follows your system setting.",
    how: "Set it On to calm motion, or Off to always animate.",
  },
  theme: {
    title: "Theme",
    what: "Light or dark appearance. Auto follows your system.",
    how: "Pick whichever is easier on your eyes.",
  },

  // --- History -----------------------------------------------------------
  sessions: {
    title: "Your sessions",
    what: "Each past session as a row: a coherence sparkline, its date, duration and pace, and its average and peak coherence.",
    how: "Tap a row to expand it for a larger trace, then export to JSON/CSV or delete.",
  },
} satisfies Record<string, InfoEntry>;
