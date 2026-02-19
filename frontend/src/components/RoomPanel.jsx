import React from "react";

export default function RoomPanel({ room }) {
  return (
    <div className="room-panel">
      {room.title && (
        <div className="room-title">{room.title}</div>
      )}
{room.objs && (
        <div className="room-objs">
          <span dangerouslySetInnerHTML={{ __html: room.objs }} />
        </div>
      )}
      {room.players && (
        <div className="room-players">
          <span dangerouslySetInnerHTML={{ __html: room.players }} />
        </div>
      )}
      {room.exits && (
        <div className="room-exits">
          <span className="room-section-label">Exits: </span>
          <span dangerouslySetInnerHTML={{ __html: room.exits }} />
        </div>
      )}
    </div>
  );
}
