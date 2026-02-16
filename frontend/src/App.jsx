import React from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import Toolbar from "./components/Toolbar";
import GameText from "./components/GameText";
import CommandInput from "./components/CommandInput";
import Sidebar from "./components/Sidebar";

export default function App() {
  const {
    gameLines, vitals, room, compass, hands, spell, indicators,
    connected, exp, activeSpells, streams, scriptWindows, roundtime, casttime, send,
  } = useGameSocket();

  return (
    <div className="app">
      <Toolbar
        vitals={vitals}
        hands={hands}
        spell={spell}
        indicators={indicators}
      />
      <GameText lines={gameLines} />
      <CommandInput onSend={send} roundtime={roundtime} casttime={casttime} />
      <Sidebar
        room={room}
        exp={exp}
        streams={streams}
        activeSpells={activeSpells}
        compass={compass}
        scriptWindows={scriptWindows}
        onMove={send}
      />
    </div>
  );
}
