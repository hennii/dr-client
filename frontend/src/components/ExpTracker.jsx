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

const fullyAsleepMsg = "Asleep and storing rested experience."

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

function parseRestedExp(str) {
  const match = str.match(
    /Rested EXP Stored:\s*(.+?)\s+Usable This Cycle:\s*(.+?)\s+Cycle Refreshes:\s*(.+)$/
  );

  if (!match) return null;

  return {
    rexp: match[1],
    usable: match[2],
    refreshes: match[3]
  };
}

function parseSleep(str) {
  if (/You are relaxed/.test(str)) {
    return "Asleep and draining experience."
  } else if (/You are fully relaxed/.test(str)) {
    return fullyAsleepMsg;
  } else {
    return "Awake and earning experience."
  }
}

function toMinutes(str) {
  str = str.toLowerCase().trim();

  // Format like "4:33 hour"
  const hourColonMatch = str.match(/^(\d+):(\d+)\s*hour/);
  if (hourColonMatch) {
    const hours = parseInt(hourColonMatch[1], 10);
    const minutes = parseInt(hourColonMatch[2], 10);
    return hours * 60 + minutes;
  }

  // Format like "22 minute"
  const minutesMatch = str.match(/^(\d+)\s*minute/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }

  // Format like "4 hours"
  const hoursMatch = str.match(/^(\d+)\s*hour/);
  if (hoursMatch) {
    return parseInt(hoursMatch[1], 10) * 60;
  }

  const lessThanMinute = str.match(/less than a minute/)
  if (lessThanMinute) {
    return 1;
  }

  // Format like "none"
  const none = str.match(/none/)
  if (none) {
    return 0;
  }

  throw new Error("Invalid time format");
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')} hours`;
  }

  return `${minutes} minutes`;
}

function formatFutureTime(minutesToAdd) {
  const now = new Date();
  const future = new Date(now);
  future.setMinutes(future.getMinutes() + minutesToAdd);

  const timeString = future.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Compare dates (ignore time)
  const isTomorrow =
    future.getDate() !== now.getDate() ||
    future.getMonth() !== now.getMonth() ||
    future.getFullYear() !== now.getFullYear();

  return `${timeString} ${isTomorrow ? "tomorrow" : "today"}`;
}

export default function ExpTracker({ exp }) {
  const skills = useMemo(() => {
    return Object.entries(exp)
      .filter(([, data]) => data.rank != null)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [exp]);

  const summaryData = useMemo(() => {
    return exp.rexp ? parseRestedExp(exp.rexp.text) : {};
  }, [exp]);

  
  const sleepMsg = exp.sleep ? parseSleep(exp.sleep.text) : null;
  const isAsleep = sleepMsg === fullyAsleepMsg;

  const calcRexpDuration = () => {
    const rexpMinutes = toMinutes(summaryData.rexp);
    const usableMinutes = toMinutes(summaryData.usable);
    if (rexpMinutes > 0 && usableMinutes > 0) {
      return rexpMinutes > usableMinutes ? usableMinutes : rexpMinutes;
    }
    return 0;
  };

  const usableMinutes = summaryData.usable ? toMinutes(summaryData.usable) : null;
  const rexpDuration = summaryData.rexp ? calcRexpDuration() : null;
  const rexpDurationMsg = summaryData.rexp ? formatMinutes(rexpDuration) : null;
  const rexpEndTime = rexpDuration ? formatFutureTime(rexpDuration) : null;
  const storedAndWaiting = summaryData.rexp ? toMinutes(summaryData.rexp) > 0 && !usableMinutes : null;

  const rexpDurationSummary = (
    <div>
    {rexpDuration > 0 &&
      <div className="exp-rexp-summary on">
        Using REXP for the next {rexpDurationMsg}
        {rexpEndTime &&
          <div> (ending at {rexpEndTime})</div>
        }
      </div>
    }
    {rexpDuration === 0 && (
      <>
        <div className="exp-rexp-summary off">
          Not currently using REXP
          {storedAndWaiting && (
            <span> (restarting at {formatFutureTime(toMinutes(summaryData.refreshes))})</span>
          )}
        </div>
      </>
    )}
    </div>
  )

  const summary = (
    <div className="exp-summary">
      <div className="exp-total">Total skills: {skills.length}</div>
      <div className="exp-rexp">
        <div className="exp-rexp-title">Rested Experience</div>
        {!isAsleep && (
          <div>
            {rexpDurationSummary}
            <div className="exp-stored">Stored: &nbsp;&nbsp;&nbsp;{summaryData.rexp}</div>
            <div className="exp-usable">Usable: &nbsp;&nbsp;&nbsp;{summaryData.usable}</div>
            <div className="exp-refreshes">Refreshes: {summaryData.refreshes}</div>
          </div>
        )}
        {sleepMsg && <div className="exp-sleep">{sleepMsg}</div>}
      </div>
    </div>
  )

  if (skills.length === 0) {
    return <div className="exp-tracker exp-empty">No skills tracked yet</div>;
  }

  return (
    <div className={`exp-tracker ${isAsleep ? 'asleep' : ''}`}>
      <table className="exp-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th className="text-align-center">Rank</th>
            <th>Mindstate</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {skills.map(([name, data]) => (
            <tr key={name}>
              <td className="exp-skill">{name}</td>
              <td className="exp-rank">
                <div className="exp-whole">{data.rank}</div>
                <div className="exp-pct">{data.percent}%</div>
              </td>
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
      {summary}
    </div>
  );
}
