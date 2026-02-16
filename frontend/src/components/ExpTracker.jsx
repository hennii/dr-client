import React, { useMemo } from "react";

const LEARNING_COLORS = {
  "clear": "#666666",
  "dabbling": "#808080",
  "perusing": "#999999",
  "learning": "#aaaaaa",
  "thoughtful": "#bbbb88",
  "thinking": "#cccc66",
  "considering": "#ccaa44",
  "pondering": "#cc8833",
  "ruminating": "#cc6622",
  "understanding": "#cc5500",
  "absorbing": "#dd6633",
  "intrigued": "#dd7744",
  "scrutinizing": "#dd8855",
  "analyzing": "#ee9944",
  "studious": "#eeaa33",
  "focused": "#eebb22",
  "very focused": "#eedd22",
  "engaged": "#eeee44",
  "very engaged": "#eeff44",
  "cogitating": "#ccff44",
  "fascinated": "#aaff44",
  "captivated": "#88ff44",
  "engrossed": "#66ff44",
  "riveted": "#44ff44",
  "very riveted": "#44ff88",
  "rapt": "#44ffaa",
  "very rapt": "#44ffcc",
  "enthralled": "#44ffee",
  "nearly locked": "#44eeff",
  "mind lock": "#44ccff",
  "attentive": "#44aaff",
};

function learningColor(state) {
  if (!state) return "#666666";
  return LEARNING_COLORS[state.toLowerCase()] || "#999999";
}

export default function ExpTracker({ exp }) {
  const skills = useMemo(() => {
    return Object.entries(exp)
      .filter(([, data]) => data.rank != null)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [exp]);

  if (skills.length === 0) {
    return <div className="exp-tracker exp-empty">No skills tracked yet</div>;
  }

  return (
    <div className="exp-tracker">
      <table className="exp-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Rank</th>
            <th>%</th>
            <th>Learning</th>
          </tr>
        </thead>
        <tbody>
          {skills.map(([name, data]) => (
            <tr key={name}>
              <td className="exp-skill">{name}</td>
              <td className="exp-rank">{data.rank}</td>
              <td className="exp-pct">{data.percent}%</td>
              <td
                className="exp-state"
                style={{ color: learningColor(data.state) }}
              >
                {data.state || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
