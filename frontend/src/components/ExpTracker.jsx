import React, { useMemo } from "react";

const LEARNING_COLORS = {
  "clear": "#666666",        //  0 - gray
  "dabbling": "#777768",     //  1
  "perusing": "#88886a",     //  2
  "learning": "#99996c",     //  3
  "thoughtful": "#aaaa6e",   //  4
  "thinking": "#bbbb70",     //  5
  "considering": "#c4bc60",  //  6
  "pondering": "#ccbc50",    //  7
  "ruminating": "#d4bc40",   //  8
  "concentrating": "#dcbc30",//  9
  "attentive": "#e4c020",    // 10
  "deliberative": "#e8c410", // 11
  "interested": "#ecc800",   // 12 - peak yellow
  "examining": "#e4c800",    // 13
  "understanding": "#dcca00",// 14
  "absorbing": "#d0cc00",    // 15
  "intrigued": "#c4ce00",    // 16
  "scrutinizing": "#b4d000", // 17
  "analyzing": "#a4d200",    // 18
  "studious": "#94d400",     // 19
  "focused": "#84d800",      // 20
  "very focused": "#78dc00", // 21
  "engaged": "#6ce000",      // 22
  "very engaged": "#60e400", // 23
  "cogitating": "#54e800",   // 24
  "fascinated": "#4cec00",   // 25
  "captivated": "#44f000",   // 26
  "engrossed": "#40f200",    // 27
  "riveted": "#3cf400",      // 28
  "very riveted": "#38f600",// 29
  "rapt": "#34f800",         // 30
  "very rapt": "#32fa00",    // 31
  "enthralled": "#31fc00",   // 32
  "nearly locked": "#30fe00",// 33
  "mind lock": "#2fff00",    // 34 - bright green
};

const MINDSTATE_NUM = Object.fromEntries(
  Object.keys(LEARNING_COLORS).map((key, i) => [key, i])
);
const MINDSTATE_MAX = Object.keys(LEARNING_COLORS).length - 1;

function learningColor(state) {
  if (!state) return "#666666";
  return LEARNING_COLORS[state.toLowerCase()] || "#999999";
}

function mindstateLabel(state) {
  if (!state) return "-";
  const num = MINDSTATE_NUM[state.toLowerCase()];
  return num != null ? `${num}/${MINDSTATE_MAX}` : state;
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
            {/* <th></th> */}
            <th>Mindstate</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {skills.map(([name, data]) => (
            <tr key={name}>
              <td className="exp-skill">{name}</td>
              <td className="exp-rank">{data.rank} <span className="exp-pct">{data.percent}%</span></td>
              {/* <td className="exp-pct"></td> */}
              <td
                className="exp-state"
                style={{ color: learningColor(data.state) }}
              >
                {data.state || "-"}
              </td>
              <td className="exp-mindstate" style={{ color: learningColor(data.state) }}>{mindstateLabel(data.state)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
