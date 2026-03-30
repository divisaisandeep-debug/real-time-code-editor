import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

export default function RoomEditor() {
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);

  const userId = useRef(Math.random().toString(36).substring(7));
  const username = useRef("User");

  const [room, setRoom] = useState("");

  useEffect(() => {
    // 👤 Ask username
    username.current =
      window.prompt("Enter your name 👤") || "User";

    // 📁 Get room safely
    const roomId =
      window.location.pathname.replace("/", "") || "room1";

    setRoom(roomId);

    // 🔌 WebSocket
    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/${roomId}`
    );

    ws.onopen = () => {
      console.log("Connected to room:", roomId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (!editorRef.current) return;

      // 🧠 CODE SYNC
      if (data.type === "code") {
        const currentValue = editorRef.current.getValue();

        if (currentValue !== data.code) {
          const position = editorRef.current.getPosition();

          isRemoteChange.current = true;
          editorRef.current.setValue(data.code);

          if (position) {
            editorRef.current.setPosition(position);
          }
        }
      }

      // 🎯 CURSOR SYNC
      if (
        data.type === "cursor" &&
        data.userId !== userId.current
      ) {
        const decorations = [
          {
            range: new window.monaco.Range(
              data.line,
              data.column,
              data.line,
              data.column + 1
            ),
            options: {
              className: "remoteCursor",
              hoverMessage: {
                value: `${data.username}`,
              },
            },
          },
        ];

        editorRef.current.deltaDecorations([], decorations);
      }
    };

    wsRef.current = ws;

    return () => ws.close();
  }, []);

  // ✍️ SEND CODE
  const handleChange = (value) => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(
        JSON.stringify({
          type: "code",
          code: value,
          userId: userId.current,
          username: username.current,
        })
      );
    }
  };

  // 🎯 SEND CURSOR
  const handleCursor = () => {
    if (
      !editorRef.current ||
      !wsRef.current ||
      wsRef.current.readyState !== 1
    )
      return;

    const position = editorRef.current.getPosition();

    wsRef.current.send(
      JSON.stringify({
        type: "cursor",
        line: position.lineNumber,
        column: position.column,
        userId: userId.current,
        username: username.current,
      })
    );
  };

  return (
    <div style={{ height: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      
      {/* 🔥 HEADER */}
      <div
        style={{
          padding: "10px 20px",
          background: "#1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #334155",
        }}
      >
        <h2 style={{ margin: 0 }}>🚀 CodeCollab</h2>

        <div style={{ display: "flex", gap: "15px" }}>
          <span>👤 {username.current}</span>
          <span>📁 Room: {room}</span>
        </div>
      </div>

      {/* 💻 EDITOR */}
      <div style={{ padding: "10px" }}>
        <Editor
          height="85vh"
          theme="vs-dark"
          defaultLanguage="javascript"
          defaultValue="// Start coding..."
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            window.monaco = monaco;
            editor.onDidChangeCursorPosition(handleCursor);
          }}
          onChange={handleChange}
        />
      </div>

      {/* 🎨 CURSOR STYLE */}
      <style>{`
        .remoteCursor {
          border-left: 2px solid red;
        }
      `}</style>
    </div>
  );
}
