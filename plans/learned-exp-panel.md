# Learned Experience Panel

## Goal

Add a "Learned" tab to the ExpTracker panel that tracks skill rank gains since a session baseline, showing per-hour and per-day learning rates and TDP projections. Persist skill data across page refreshes using localStorage.

## Background

DragonRealms only sends exp data for skills that are currently learning (mindstate > clear). A character may have hundreds of skills but only a handful are ever in the exp stream at once. To show cumulative gains we need to remember the last-seen rank/percent for every skill, even after it drops out of the live stream.

## Data Model

### Baseline (`dr-exp-baseline` in localStorage)
```json
{
  "time": 1740000000000,
  "skills": {
    "Attunement": { "rank": 312, "percent": 45 },
    ...
  }
}
```
Set automatically on first skill data arrival. Reset manually via the Reset button.

### Last Known (`dr-exp-last-known` in localStorage)
```json
{
  "Attunement": { "rank": 314, "percent": 12, "state": "learning" },
  ...
}
```
Updated on every exp event. Survives page refresh. Used to compute gains when a skill is no longer in the live stream.

## UI: Two Tabs

### Current Tab (existing)
- Skill name, rank (whole + percent), mindstate color/label
- Rested experience summary
- Sleep status

### Learned Tab (new)
- Table: Skill | Gained | /hr | /day
- Sorted by gains descending
- Summary row: Total Ranks gained, TDP gained, rates
- Footer: "Learning For: Xh Ym" elapsed time + Reset button

## Gain Calculation

```
gained = (currentRank + currentPct/100) - (baseRank + basePct/100)
tdps   = gained * currentRank / 200
```

Rates use elapsed hours since baseline was set, minimum 1 minute to avoid division weirdness.

## Sleep / Rested Exp

- Detect sleep state from `exp.sleep.text` containing "relaxed" or "fully relaxed"
- Apply `.asleep` CSS class to container for visual distinction
- Show sleep status message in Current tab summary

## Reset Flow

1. Snapshot current skills immediately as new baseline (clears gains instantly, no visual flash)
2. Send `exp` command to flush all skill data from the game
3. After 1.5s, patch in any skills that arrived post-snapshot but weren't in the immediate snapshot
4. Clear `resetting` state

## localStorage Persistence

- `lastKnown` is loaded once on mount via a ref (not state) to avoid re-renders
- Updated synchronously on every skills render pass via a dirty-flag check
- Baseline is React state (triggers re-render on reset) but also mirrored to localStorage

## Implementation Notes

- `learningHours` is computed at most every 15 seconds via a ref to avoid expensive recalculations
- Baseline is auto-patched when skills arrive that weren't present at init time (late-arriving skills)
- `learnedSkills` only includes skills with positive gains — no-gain or regressed skills are hidden
- TDP formula: `gained * currentRank / 200` (standard DR formula)

## Files Changed

- `frontend/src/components/ExpTracker.jsx` — all logic and rendering
- `frontend/src/styles/game.css` — `.exp-tabs`, `.exp-tab-btn`, `.learned-*`, `.asleep` styles
