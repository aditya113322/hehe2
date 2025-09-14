import React, { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import PaymentForm from "./PaymentForm";
import JoinRoom from "./JoinRoom";
import TicketDisplay from "./TicketDisplay";
import RoomTimer from "./RoomTimer";
import HomePage from "./HomePage";
import { secureMessaging } from "./encryption";
import { p2pMessaging } from "./p2p";
import "./App.css";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [currentView, setCurrentView] = useState("home"); // home, payment, join, ticket, chat
  const [ticketInfo, setTicketInfo] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [joined, setJoined] = useState(false);

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [pendingMessages, setPendingMessages] = useState([]);
  const encryptionReadyRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const messageCleanupRef = useRef(null);

  // Debug function to check encryption status
  const debugEncryptionStatus = () => {
    console.log('🔍 Encryption Status Debug:');
    console.log('  - State:', isEncryptionReady);
    console.log('  - Ref:', encryptionReadyRef.current);
    console.log('  - Room Info:', roomInfo);
    console.log('  - Connected:', connected);
  };

  useEffect(() => {
    // Socket event listeners
    socket.on("connect", () => {
      console.log("✅ Connected to server");
      setConnected(true);
      setConnectionStatus('connected');
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setConnected(false);
      setConnectionStatus('disconnected');
      setIsEncryptionReady(false);
      encryptionReadyRef.current = false;
    });

    socket.on("system", (text) => {
      setMessages((m) => [...m, { id: Date.now(), system: true, text }]);
    });

    // Handle encrypted messages
    socket.on("encrypted-message", (encryptedPayload) => {
      console.log('🔒 Received encrypted message:', encryptedPayload);
      console.log('🔍 Current encryption status:', encryptionReadyRef.current);

      try {
        if (!encryptionReadyRef.current) {
          console.warn('⚠️ Encryption not ready, cannot decrypt message');
          console.log('⏳ Queuing message for later decryption');
          // TODO: Queue message for later processing
          return;
        }

        const decryptedMessage = secureMessaging.decryptMessage(
          encryptedPayload.encryptedData,
          encryptedPayload.iv
        );

        console.log('✅ Decrypted message:', decryptedMessage);

        if (decryptedMessage) {
          setMessages((m) => [...m, {
            ...decryptedMessage,
            encrypted: true,
            messageId: encryptedPayload.messageId
          }]);
        }
      } catch (error) {
        console.error('❌ Failed to decrypt message:', error);
        console.error('Encryption payload:', encryptedPayload);
        console.error('Encryption ready ref:', encryptionReadyRef.current);
        console.error('Encryption ready state:', isEncryptionReady);
      }
    });

    // Handle ephemeral encrypted messages
    socket.on("ephemeral-message", (encryptedPayload) => {
      console.log('🔥 Received ephemeral message:', encryptedPayload);
      console.log('🔍 Current encryption status:', encryptionReadyRef.current);

      try {
        if (!encryptionReadyRef.current) {
          console.warn('⚠️ Encryption not ready, cannot decrypt ephemeral message');
          return;
        }

        const decryptedMessage = secureMessaging.decryptEphemeralMessage(
          encryptedPayload.encryptedData,
          encryptedPayload.iv,
          encryptedPayload.ephemeralKey
        );

        console.log('✅ Decrypted ephemeral message:', decryptedMessage);

        if (decryptedMessage) {
          setMessages((m) => [...m, {
            ...decryptedMessage,
            encrypted: true,
            ephemeral: true,
            messageId: encryptedPayload.messageId
          }]);

          // Auto-delete ephemeral message after 10 seconds
          setTimeout(() => {
            setMessages((m) => m.filter(msg => msg.messageId !== encryptedPayload.messageId));
          }, 10000);
        }
      } catch (error) {
        console.error('❌ Failed to decrypt ephemeral message:', error);
        console.error('Ephemeral payload:', encryptedPayload);
        console.error('Encryption ready ref:', encryptionReadyRef.current);
      }
    });

    // Legacy message handler (for backward compatibility)
    socket.on("message", (payload) => {
      setMessages((m) => [...m, payload]);
    });

    socket.on("typing", ({ username: u, isTyping }) => {
      if (isTyping) setTypingUser(u);
      else setTypingUser((curr) => (curr === u ? null : curr));
    });

    socket.on("users", (list) => setUsers(list));

    socket.on("room-deleted", ({ message, clearMessages }) => {
      alert(message);
      if (clearMessages) {
        // Clear all messages, encryption keys, and P2P connections
        setMessages([]);
        secureMessaging.clearKeys();
        p2pMessaging.cleanup();
        setIsEncryptionReady(false);
        encryptionReadyRef.current = false;
      }
      setCurrentView("home");
      setJoined(false);
      setUsers([]);
    });

    socket.on("room-expired", ({ message, clearMessages }) => {
      alert(message);
      if (clearMessages) {
        // Clear all messages, encryption keys, and P2P connections
        setMessages([]);
        secureMessaging.clearKeys();
        p2pMessaging.cleanup();
        setIsEncryptionReady(false);
        encryptionReadyRef.current = false;
      }
      setCurrentView("home");
      setJoined(false);
      setUsers([]);
    });

    // Handle forced room data cleanup
    socket.on("clear-room-data", ({ roomId }) => {
      console.log(`Clearing all data for room: ${roomId}`);
      setMessages([]);
      secureMessaging.clearKeys();
      p2pMessaging.cleanup();
      setIsEncryptionReady(false);
      encryptionReadyRef.current = false;
      setCurrentView("home");
      setJoined(false);
      setUsers([]);
    });

    // Handle encryption salt from room creator
    socket.on("encryption-salt", ({ salt, ticketId, roomId }) => {
      console.log('🔑 Received encryption salt:', { salt: salt.substring(0, 10) + '...', ticketId, roomId });
      try {
        secureMessaging.setRoomKey(ticketId, roomId, salt);
        setIsEncryptionReady(true);
        encryptionReadyRef.current = true;
        console.log('✅ Encryption initialized from room creator');

        // Clear the timeout since encryption is now ready
        if (window.encryptionTimeout) {
          clearTimeout(window.encryptionTimeout);
          window.encryptionTimeout = null;
          console.log('🕐 Cleared encryption timeout');
        }

        // Process any pending messages
        if (pendingMessages.length > 0) {
          console.log(`📤 Processing ${pendingMessages.length} pending messages`);
          pendingMessages.forEach(msg => {
            sendPendingMessage(msg);
          });
          setPendingMessages([]);
        }
      } catch (error) {
        console.error('❌ Failed to initialize encryption from salt:', error);
      }
    });

    // Handle request to provide encryption salt (for room creators)
    socket.on("provide-encryption-salt", ({ roomId, requesterId }) => {
      console.log('📞 Room creator asked to provide salt to:', requesterId);

      if (roomInfo && roomInfo.roomId === roomId && isEncryptionReady) {
        // Get the current salt and share it with the requester
        const currentSalt = secureMessaging.getCurrentSalt();
        if (currentSalt) {
          console.log('📤 Providing encryption salt to requester');
          socket.emit("share-encryption-salt", {
            roomId: roomId,
            salt: currentSalt,
            ticketId: roomInfo.ticketId
          });
        } else {
          console.error('❌ Room creator has no salt to share');
        }
      } else {
        console.error('❌ Room creator cannot provide salt - not ready or wrong room');
        console.log('Room info:', roomInfo);
        console.log('Encryption ready:', isEncryptionReady);
      }
    });

    // P2P signaling handlers
    socket.on("p2p-signal", ({ fromPeer, roomId, message }) => {
      p2pMessaging.handleSignalingMessage(fromPeer, message);
    });

    socket.on("peer-available", ({ peerId, username }) => {
      console.log('New peer available:', username, peerId);
      // Initiate P2P connection with new peer
      p2pMessaging.createOffer(peerId);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("system");
      socket.off("message");
      socket.off("encrypted-message");
      socket.off("ephemeral-message");
      socket.off("encryption-salt");
      socket.off("provide-encryption-salt");
      socket.off("typing");
      socket.off("users");
      socket.off("room-deleted");
      socket.off("room-expired");
      socket.off("clear-room-data");
    };
  }, []);

  const handleJoinRoom = async (joinData) => {
    if (socket.disconnected) socket.connect();

    socket.emit("join", {
      ticketId: joinData.ticketId,
      username: joinData.username
    }, async (response) => {
      if (response.error) {
        alert(`Failed to join room: ${response.error}`);
        return;
      }

      // Initialize encryption for the room
      try {
        console.log('🔐 Initializing encryption for room:', response.roomId);

        if (response.isCreator) {
          // Room creator generates the master key and shares it
          console.log('👑 User is room creator - generating master key');
          const keyData = secureMessaging.generateRoomKey(joinData.ticketId, response.roomId);
          console.log('🔑 Generated master room key and salt');

          // Share encryption salt with other room participants
          socket.emit("share-encryption-salt", {
            roomId: response.roomId,
            salt: keyData.salt,
            ticketId: joinData.ticketId
          });
          console.log('📤 Shared master encryption salt with other participants');

          setIsEncryptionReady(true);
          encryptionReadyRef.current = true;
          console.log('✅ Encryption ready for room creator:', response.roomId);
        } else {
          // Non-creator waits for encryption salt from room creator
          console.log('👤 User is participant - waiting for encryption salt from creator');
          setIsEncryptionReady(false);
          encryptionReadyRef.current = false;

          // Request encryption salt from room creator
          socket.emit("request-encryption-salt", {
            roomId: response.roomId,
            ticketId: joinData.ticketId
          });
          console.log('📥 Requested encryption salt from room creator');

          // Set timeout in case salt is not received (longer for production)
          const timeoutDuration = window.location.hostname === 'localhost' ? 10000 : 20000;
          const timeoutId = setTimeout(() => {
            // Check current encryption status
            console.warn(`⚠️ Encryption salt not received within ${timeoutDuration/1000} seconds`);
            console.log('Current encryption ready state:', isEncryptionReady);
            console.log('Current encryption ready ref:', encryptionReadyRef.current);
            console.log('Socket connected:', socket.connected);
            console.log('Socket ID:', socket.id);
            if (!encryptionReadyRef.current) {
              alert('Unable to establish secure connection. Please try rejoining the room.');
            }
          }, timeoutDuration);

          // Store timeout ID to clear it if encryption becomes ready
          window.encryptionTimeout = timeoutId;
        }

        // Initialize P2P messaging for decentralized communication
        await p2pMessaging.initialize(response.roomId, (message) => {
          // Handle P2P messages as backup communication
          if (message.type === 'encrypted-message') {
            try {
              const decryptedMessage = secureMessaging.decryptMessage(
                message.encryptedData,
                message.iv
              );

              if (decryptedMessage) {
                setMessages((m) => [...m, {
                  ...decryptedMessage,
                  encrypted: true,
                  p2p: true,
                  messageId: message.messageId
                }]);
              }
            } catch (error) {
              console.error('Failed to decrypt P2P message:', error);
            }
          }
        });

        // Announce peer availability
        socket.emit("announce-peer", { roomId: response.roomId });

      } catch (error) {
        console.error('Failed to initialize encryption:', error);
        alert('Failed to initialize secure messaging');
        return;
      }

      setRoomInfo({
        roomId: response.roomId,
        isCreator: response.isCreator,
        expiresAt: response.expiresAt,
        username: joinData.username,
        ticketId: joinData.ticketId
      });
      setJoined(true);
      setCurrentView("chat");
    });
  };

  const handlePaymentSuccess = (paymentData) => {
    setTicketInfo(paymentData);
    setCurrentView("ticket");
  };

  const handleEnterRoom = () => {
    handleJoinRoom({
      ticketId: ticketInfo.ticketId,
      username: ticketInfo.creatorName
    });
  };

  const handleDeleteRoom = () => {
    if (roomInfo?.isCreator) {
      socket.emit("delete-room", (response) => {
        if (response.error) {
          alert(`Failed to delete room: ${response.error}`);
        } else {
          alert("Room deleted successfully");
          setCurrentView("home");
          setJoined(false);
          setMessages([]);
          setUsers([]);
        }
      });
    }
  };

  const sendPendingMessage = (messageData) => {
    try {
      if (messageData.ephemeral) {
        const ephemeralKey = secureMessaging.generateEphemeralKey();
        const encryptedMessage = secureMessaging.encryptEphemeralMessage(
          messageData.text,
          messageData.username,
          ephemeralKey
        );

        socket.emit("ephemeral-message", {
          ...encryptedMessage,
          ephemeralKey
        });
      } else {
        const encryptedMessage = secureMessaging.encryptMessage(
          messageData.text,
          messageData.username
        );

        socket.emit("encrypted-message", encryptedMessage);
      }

      // Add to local messages
      setMessages((m) => [...m, {
        id: Date.now(),
        text: messageData.text,
        username: messageData.username,
        timestamp: Date.now(),
        encrypted: true,
        ephemeral: messageData.ephemeral
      }]);

      console.log('✅ Pending message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send pending message:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) {
      console.log('⚠️ Empty message, not sending');
      return;
    }

    const messageData = {
      text: input.trim(),
      username: roomInfo.username,
      ephemeral: ephemeralMode
    };

    if (!encryptionReadyRef.current) {
      console.log('⚠️ Encryption not ready, queuing message');
      console.log('🔍 Encryption ref status:', encryptionReadyRef.current);
      console.log('🔍 Encryption state status:', isEncryptionReady);
      setPendingMessages(prev => [...prev, messageData]);
      setInput('');
      return;
    }

    console.log('📤 Sending message:', input.trim());

    try {
      sendPendingMessage(messageData);
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      alert('Failed to send secure message');
      return;
    }

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

  // Handle navigation from HomePage
  const handleCreateRoomClick = () => {
    setCurrentView("payment");
  };

  const handleJoinRoomClick = () => {
    setCurrentView("join");
  };

  return (
    <div className="app">
      {currentView === "home" && (
        <HomePage
          onCreateRoom={handleCreateRoomClick}
          onJoinRoom={handleJoinRoomClick}
        />
      )}

      {currentView === "payment" && (
        <PaymentForm
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => setCurrentView("home")}
        />
      )}

      {currentView === "join" && (
        <JoinRoom
          onJoinSuccess={handleJoinRoom}
          onCancel={() => setCurrentView("home")}
        />
      )}

      {currentView === "ticket" && ticketInfo && (
        <TicketDisplay
          ticketInfo={ticketInfo}
          onEnterRoom={handleEnterRoom}
        />
      )}

      {currentView === "chat" && joined && (
        <div className="chat-wrap">
          <header>
            <h1>Secure Chat Room 🔒</h1>
            <span className={`status ${connected ? "on" : "off"}`}></span>
          </header>
        <>
          <div className="topbar">
            <div className="room">
              Room: <strong>{roomInfo?.roomId}</strong>
              {roomInfo?.isCreator && <span className="creator-badge">Creator</span>}
            </div>
<<<<<<< HEAD
            <div className="rooms">
              <button onClick={() => switchRoom("general")}>#general</button>
              <button onClick={() => switchRoom("chhatarpur")}>#chhatarpur</button>
            </div>
            <div className="users">
              👥 {users.length} | {users.map((u) => u.username).join(", ")}
=======

            <div className="room-info">
              {roomInfo?.expiresAt && (
                <RoomTimer
                  expiresAt={roomInfo.expiresAt}
                  onExpired={() => {
                    alert("Room has expired!");
                    setCurrentView("home");
                    setJoined(false);
                  }}
                />
              )}

              <div className="users">
                👥 {users.length} | {users.map((u) => u.username).join(", ")}
              </div>

            <div className="encryption-status">
              {isEncryptionReady ? (
                <span className="encryption-ready">🔐 Encrypted</span>
              ) : (
                <span className="encryption-waiting">⏳ Setting up encryption...</span>
              )}
              {pendingMessages.length > 0 && (
                <span className="pending-messages">📤 {pendingMessages.length} pending</span>
              )}
              <button
                onClick={debugEncryptionStatus}
                style={{marginLeft: '10px', fontSize: '12px', padding: '2px 6px'}}
                title="Debug encryption status"
              >
                🔍 Debug
              </button>
            </div>
            </div>

            <div className="room-controls">
              <button
                onClick={() => setCurrentView("home")}
                className="leave-button"
              >
                Leave Room
              </button>

              {roomInfo?.isCreator && (
                <button
                  onClick={handleDeleteRoom}
                  className="delete-button"
                >
                  Delete Room
                </button>
              )}
>>>>>>> d00a03ac40041cad889a30aa27b8e5dd7b6c4617
            </div>
          </div>

          <div className="messages">
            {messages.map((m) =>
              m.system ? (
                <div className="msg system" key={m.id}>— {m.text} —</div>
              ) : (
                <div className={`msg ${m.encrypted ? 'encrypted' : ''} ${m.ephemeral ? 'ephemeral' : ''}`} key={m.id || m.messageId}>
                  <div className="message-header">
                    <span className="user">{m.username}:</span>
                    {m.encrypted && <span className="encryption-icon">🔒</span>}
                    {m.ephemeral && <span className="ephemeral-icon">🔥</span>}
                  </div>
                  <span className="message-text">{m.text}</span>
                  {m.ephemeral && (
                    <div className="ephemeral-timer">
                      <small>This message will disappear...</small>
                    </div>
                  )}
                </div>
              )
            )}
            {typingUser && <div className="typing">{typingUser} is typing…</div>}
          </div>

          <div className="message-controls">
            <div className="encryption-status">
              {isEncryptionReady ? (
                <span className="encrypted-badge">🔒 End-to-End Encrypted</span>
              ) : (
                <span className="not-encrypted-badge">⚠️ Encryption Not Ready</span>
              )}
            </div>

            <div className="ephemeral-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={ephemeralMode}
                  onChange={(e) => setEphemeralMode(e.target.checked)}
                />
                Disappearing Messages (10s)
              </label>
            </div>
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder={ephemeralMode ? "Type a disappearing message…" : "Type an encrypted message…"}
              disabled={!isEncryptionReady}
            />
            <button type="submit" disabled={!isEncryptionReady}>
              {ephemeralMode ? "Send 🔥" : "Send 🔒"}
            </button>
          </form>

          {/* Your two-way messages from earlier */}

        </>
        </div>
      )}
    </div>
  );
}
