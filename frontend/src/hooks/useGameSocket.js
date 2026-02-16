import { useReducer, useEffect, useRef, useCallback } from "react";

const MAX_LINES = 2000;
const MAX_STREAM_LINES = 200;

const initialState = {
  gameLines: [],
  vitals: {},
  room: {},
  compass: [],
  hands: { left: "Empty", right: "Empty" },
  spell: null,
  indicators: {},
  connected: false,
  exp: {},
  activeSpells: "",
  streams: {},
  scriptWindows: {},
  roundtime: null,
  casttime: null,
  charName: null,
  mono: false,
};

function appendLines(existing, newLine, max) {
  const updated = [...existing, newLine];
  return updated.length > max ? updated.slice(-max) : updated;
}

function reducer(state, action) {
  switch (action.type) {
    case "connected":
      return { ...state, connected: true };
    case "disconnected":
      return {
        ...state,
        connected: false,
        gameLines: appendLines(
          state.gameLines,
          { segments: [{ text: "*** Connection lost ***", style: "disconnect", bold: true }] },
          MAX_LINES
        ),
      };
    case "snapshot":
      return {
        ...state,
        vitals: action.state.vitals || {},
        room: action.state.room || {},
        compass: action.state.compass || [],
        hands: action.state.hands || { left: "Empty", right: "Empty" },
        spell: action.state.spell,
        indicators: action.state.indicators || {},
        charName: action.state.char_name || null,
        roundtime: action.state.roundtime || null,
        casttime: action.state.casttime || null,
        exp: action.state.exp || {},
        activeSpells: action.state.active_spells || "",
      };
    case "text": {
      const seg = {
        text: action.text,
        style: action.style || null,
        bold: action.bold || false,
        mono: action.mono || false,
      };
      if (action.prompt) {
        return {
          ...state,
          gameLines: appendLines(
            state.gameLines,
            { segments: [seg], prompt: true },
            MAX_LINES
          ),
        };
      }
      // Merge with previous line if it hasn't been ended by a line_break
      const prev = state.gameLines[state.gameLines.length - 1];
      if (prev && !prev.prompt && !prev.ended && prev.segments) {
        const merged = [...state.gameLines];
        merged[merged.length - 1] = {
          ...prev,
          segments: [...prev.segments, seg],
        };
        return { ...state, gameLines: merged };
      }
      return {
        ...state,
        gameLines: appendLines(
          state.gameLines,
          { segments: [seg], prompt: false },
          MAX_LINES
        ),
      };
    }
    case "stream": {
      const streamLine = { text: action.text, ts: Date.now() };
      const streamId = action.id;

      // Update per-stream buffer
      const streamLines = state.streams[streamId] || [];
      const newStreamLines = appendLines(streamLines, streamLine, MAX_STREAM_LINES);
      const newStreams = { ...state.streams, [streamId]: newStreamLines };

      // Also add thoughts/deaths/arrivals to main game text
      const showInMain = ["thoughts", "death", "atmospherics", "arrivals"].includes(streamId);
      let newGameLines = state.gameLines;
      if (showInMain) {
        const gameLine = {
          segments: [{ text: action.text, style: "stream" }],
          streamId: streamId,
        };
        newGameLines = appendLines(state.gameLines, gameLine, MAX_LINES);
      }

      // Handle active spells stream
      const newActiveSpells = streamId === "percWindow" ? action.text : state.activeSpells;

      return {
        ...state,
        streams: newStreams,
        gameLines: newGameLines,
        activeSpells: newActiveSpells,
      };
    }
    case "line_break": {
      const last = state.gameLines[state.gameLines.length - 1];
      if (last && !last.ended && last.segments) {
        const updated = [...state.gameLines];
        updated[updated.length - 1] = { ...last, ended: true };
        return { ...state, gameLines: updated };
      }
      return state;
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
    case "exp":
      return {
        ...state,
        exp: {
          ...state.exp,
          [action.skill]: parseExp(action.skill, action.text),
        },
      };
    case "roundtime":
      return { ...state, roundtime: action.value };
    case "casttime":
      return { ...state, casttime: action.value };
    case "char_name":
      return { ...state, charName: action.name };
    case "output_mode":
      return { ...state, mono: action.mono };
    case "script_window": {
      const sw = { ...state.scriptWindows };
      switch (action.action) {
        case "add":
          sw[action.name] = { title: action.title || action.name, lines: [] };
          break;
        case "write":
          if (sw[action.name]) {
            sw[action.name] = {
              ...sw[action.name],
              lines: [...sw[action.name].lines, action.text],
            };
          }
          break;
        case "clear":
          if (sw[action.name]) {
            sw[action.name] = { ...sw[action.name], lines: [] };
          }
          break;
        case "remove":
          delete sw[action.name];
          break;
        default:
          break;
      }
      return { ...state, scriptWindows: sw };
    }
    case "batch":
      return action.events.reduce(reducer, state);
    default:
      return state;
  }
}

function parseExp(skill, text) {
  const match = text.match(/(\d+)\s+(\d+)%\s*(.*)$/);
  if (match) {
    return {
      text,
      rank: parseInt(match[1], 10),
      percent: parseInt(match[2], 10),
      state: match[3].trim() || null,
    };
  }
  return { text, rank: null, percent: null, state: null };
}

export function useGameSocket() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const intentionalClose = useRef(false);

  useEffect(() => {
    function connect() {
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
          if (Array.isArray(data)) {
            dispatch({ type: "batch", events: data });
          } else {
            dispatch(data);
          }
        } catch (e) {
          console.error("[ws] Parse error:", e);
        }
      };

      ws.onclose = (event) => {
        console.log(`[ws] Disconnected (code=${event.code})`);
        dispatch({ type: "disconnected" });
        if (!intentionalClose.current) {
          reconnectTimer.current = setTimeout(() => {
            console.log("[ws] Reconnecting...");
            connect();
          }, 2000);
        }
      };

      ws.onerror = (err) => {
        console.error("[ws] Error:", err);
      };
    }

    connect();

    return () => {
      intentionalClose.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
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
    exp: state.exp,
    activeSpells: state.activeSpells,
    streams: state.streams,
    scriptWindows: state.scriptWindows,
    roundtime: state.roundtime,
    casttime: state.casttime,
    charName: state.charName,
    send,
  };
}
