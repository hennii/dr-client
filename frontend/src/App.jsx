import React from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import GameText from "./components/GameText";
import CommandInput from "./components/CommandInput";

export default function App() {
  const { gameLines, vitals, room, send, connected } = useGameSocket();

  return (
    <div className="app">
      <div className="status-bar">
        <span className={`connection-status ${connected ? "connected" : "disconnected"}`}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <GameText lines={gameLines} />
      <CommandInput onSend={send} />
    </div>
  );
}
