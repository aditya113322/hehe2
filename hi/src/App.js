import React, { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import "./App.css";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("Guest");
  const [room, setRoom] = useState("general");
  const [joined, setJoined] = useState(false);

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Socket event listeners
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("system", (text) => {
      setMessages((m) => [...m, { id: Date.now(), system: true, text }]);
    });

    socket.on("message", (payload) => {
      setMessages((m) => [...m, payload]);
    });

    socket.on("typing", ({ username: u, isTyping }) => {
      if (isTyping) setTypingUser(u);
      else setTypingUser((curr) => (curr === u ? null : curr));
    });

    socket.on("users", (list) => setUsers(list));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("system");
      socket.off("message");
      socket.off("typing");
      socket.off("users");
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (socket.disconnected) socket.connect();
    socket.emit("join", { room, username });
    setJoined(true);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit("message", input.trim(), (ack) => {
      // Optional delivery ACK handling
      // console.log("ACK:", ack);
    });
    setInput("");
    emitTyping(false);
  };

  const emitTyping = (isTyping) => {
    socket.emit("typing", isTyping);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    emitTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1000);
  };

  const switchRoom = (next) => {
    setRoom(next);
    socket.emit("switch-room", next);
    setMessages([]);
  };

  return (
    <div className="chat-wrap">
      <header>
        <h1>Adarak Wali Chai Chat ☕</h1>
        <span className={`status ${connected ? "on" : "off"}`}></span>
      </header>

      {!joined ? (
        <form className="join" onSubmit={handleJoin}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
          />
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Room (e.g., general)"
          />
          <button type="submit">Join</button>
        </form>
      ) : (
        <>
          <div className="topbar">
            <div className="room">
              Room: <strong>{room}</strong>
            </div>
            <div className="rooms">
              <button onClick={() => switchRoom("general")}>#general</button>
              <button onClick={() => switchRoom("chhatarpur")}>#chhatarpur</button>
            </div>
            <div className="users">
              👥 {users.length} | {users.map((u) => u.username).join(", ")}
            </div>
          </div>

          <div className="messages">
            {messages.map((m) =>
              m.system ? (
                <div className="msg system" key={m.id}>— {m.text} —</div>
              ) : (
                <div className="msg" key={m.id}>
                  <span className="user">{m.username}:</span> <span>{m.text}</span>
                </div>
              )
            )}
            {typingUser && <div className="typing">{typingUser} is typing…</div>}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message…"
            />
            <button type="submit">Send</button>
          </form>

          {/* Your two-way messages from earlier */}
          <div className="cards">
            <div className="card">
              <span className="blush">😊</span> किसको बोलूँ हेलो, किसको बोलूँ हाय,<br />
              टेंशन भगाए बस अदरक वाली चाय! <span className="blush">🥰</span><br />
              <strong>तो फिर… चाय पीने चले क्या? 😄</strong>
            </div>
            <div className="card reply">
              <span className="blush">😎</span> मे भी चलता हूँ छतरपुर! 🚗
            </div>
          </div>
        </>
      )}
    </div>
  );
}
