import React, { useState, useRef, useCallback, useEffect } from "react";

export default function CommandInput({ onSend, inputRef: externalRef, insertTextRef, addToHistoryRef, navigateHistoryRef }) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const localRef = useRef(null);
  const inputRef = externalRef || localRef;
  const pendingCursor = useRef(null);

  const insertAtCursor = useCallback((text) => {
    const el = inputRef.current;
    const start = el ? (el.selectionStart ?? value.length) : value.length;
    const end = el ? (el.selectionEnd ?? value.length) : value.length;
    setValue(value.slice(0, start) + text + value.slice(end));
    pendingCursor.current = start + text.length;
  }, [value, inputRef]);

  useEffect(() => {
    if (insertTextRef) insertTextRef.current = insertAtCursor;
  }, [insertTextRef, insertAtCursor]);

  useEffect(() => {
    if (addToHistoryRef) addToHistoryRef.current = (cmd) => {
      setHistory((prev) => [cmd, ...prev].slice(0, 100));
      setHistoryIndex(-1);
    };
    if (navigateHistoryRef) navigateHistoryRef.current = (direction) => {
      if (direction === "up") {
        setHistoryIndex((prev) => {
          const next = Math.min(prev + 1, history.length - 1);
          if (next >= 0 && next < history.length) setValue(history[next]);
          return next;
        });
      } else {
        setHistoryIndex((prev) => {
          const next = prev - 1;
          if (next < 0) { setValue(""); return -1; }
          setValue(history[next]);
          return next;
        });
      }
    };
  });

  useEffect(() => {
    if (pendingCursor.current !== null) {
      const cursor = pendingCursor.current;
      pendingCursor.current = null;
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      }
    }
  });

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = value.trim();
        if (cmd) {
          onSend(cmd);
          setHistory((prev) => [cmd, ...prev].slice(0, 100));
        } else {
          onSend("");
        }
        setValue("");
        setHistoryIndex(-1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = Math.min(prev + 1, history.length - 1);
          if (next >= 0 && next < history.length) {
            setValue(history[next]);
          }
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = prev - 1;
          if (next < 0) {
            setValue("");
            return -1;
          }
          setValue(history[next]);
          return next;
        });
      }
    },
    [value, history, onSend]
  );

  return (
    <div className="command-area">
      <div className="command-input">
        <span className="prompt-char">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
