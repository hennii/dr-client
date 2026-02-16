import { useReducer, useEffect, useRef, useCallback } from "react";

const MAX_LINES = 2000;

const initialState = {
  gameLines: [],
  vitals: {},
  room: {},
  compass: [],
  hands: { left: "Empty", right: "Empty" },
  spell: null,
  indicators: {},
  connected: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "connected":
      return { ...state, connected: true };
    case "disconnected":
      return { ...state, connected: false };
    case "snapshot":
      return {
        ...state,
        vitals: action.state.vitals || {},
        room: action.state.room || {},
        compass: action.state.compass || [],
        hands: action.state.hands || { left: "Empty", right: "Empty" },
        spell: action.state.spell,
        indicators: action.state.indicators || {},
      };
    case "text": {
      const line = {
        text: action.text,
        style: action.style || null,
        bold: action.bold || false,
        mono: action.mono || false,
        prompt: action.prompt || false,
      };
      const newLines = [...state.gameLines, line];
      return {
        ...state,
        gameLines: newLines.length > MAX_LINES ? newLines.slice(-MAX_LINES) : newLines,
      };
    }
    case "stream": {
      const line = {
        text: action.text,
        style: "stream",
        streamId: action.id,
      };
      const newLines = [...state.gameLines, line];
      return {
        ...state,
        gameLines: newLines.length > MAX_LINES ? newLines.slice(-MAX_LINES) : newLines,
      };
    }
    case "vitals":
      return {
        ...state,
        vitals: { ...state.vitals, [action.id]: action.value },
      };
    case "room":
      return {
        ...state,
        room: { ...state.room, [action.field]: action.value },
      };
    case "compass":
      return { ...state, compass: action.dirs };
    case "hands":
      return { ...state, hands: { left: action.left, right: action.right } };
    case "spell":
      return { ...state, spell: action.name };
    case "indicator":
      return {
        ...state,
        indicators: { ...state.indicators, [action.id]: action.visible },
      };
    case "prompt":
      return { ...state, promptTime: action.time };
    default:
      return state;
  }
}

export function useGameSocket() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[ws] Connected");
      dispatch({ type: "connected" });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        dispatch(data);
      } catch (e) {
        console.error("[ws] Parse error:", e);
      }
    };

    ws.onclose = () => {
      console.log("[ws] Disconnected");
      dispatch({ type: "disconnected" });
    };

    ws.onerror = (err) => {
      console.error("[ws] Error:", err);
    };

    return () => {
      ws.close();
    };
  }, []);

  const send = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "command", text }));
    }
  }, []);

  return {
    gameLines: state.gameLines,
    vitals: state.vitals,
    room: state.room,
    compass: state.compass,
    hands: state.hands,
    spell: state.spell,
    indicators: state.indicators,
    connected: state.connected,
    send,
  };
}
