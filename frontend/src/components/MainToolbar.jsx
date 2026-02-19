import React from "react";
import LogToggle from "./LogToggle";

export default function MainToolbar({ logStreams, sendMessage }) {
  return (
    <div className="main-toolbar">
      <LogToggle logStreams={logStreams} sendMessage={sendMessage} />
    </div>
  );
}
