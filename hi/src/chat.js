import React, { useState, useEffect } from "react";
import { socket } from "./socket";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  useEffect(() => {
    // Listen for messages from server
    socket.on("message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    // Cleanup listener when component unmounts
    return () => {
      socket.off("message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() === "") return;
    socket.emit("message", { user: "Me", text: message });
    setMessage("");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      <h2>Two-Way Chat</h2>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "5px",
          height: "200px",
          overflowY: "scroll",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {chat.map((msg, index) => (
          <div key={index}>
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        style={{ width: "70%", padding: "5px" }}
      />
      <button onClick={sendMessage} style={{ padding: "5px 10px" }}>
        Send
      </button>
    </div>
  );
}
