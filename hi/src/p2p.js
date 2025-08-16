// Peer-to-Peer Communication for Decentralized Messaging
class P2PMessaging {
  constructor() {
    this.peers = new Map();
    this.localConnection = null;
    this.dataChannels = new Map();
    this.isInitialized = false;
    this.roomId = null;
    this.onMessageCallback = null;
  }

  // Initialize P2P for a room
  async initialize(roomId, onMessage) {
    this.roomId = roomId;
    this.onMessageCallback = onMessage;
    this.isInitialized = true;
    
    // Setup WebRTC configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    console.log('P2P messaging initialized for room:', roomId);
  }

  // Create peer connection
  async createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    
    // Create data channel for messaging
    const dataChannel = pc.createDataChannel('messages', {
      ordered: true
    });
    
    dataChannel.onopen = () => {
      console.log('Data channel opened with peer:', peerId);
      this.dataChannels.set(peerId, dataChannel);
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(message, peerId);
        }
      } catch (error) {
        console.error('Failed to parse P2P message:', error);
      }
    };
    
    dataChannel.onclose = () => {
      console.log('Data channel closed with peer:', peerId);
      this.dataChannels.delete(peerId);
    };
    
    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(message, peerId);
          }
        } catch (error) {
          console.error('Failed to parse incoming P2P message:', error);
        }
      };
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to peer via signaling server
        this.sendSignalingMessage(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };
    
    this.peers.set(peerId, pc);
    return pc;
  }

  // Send message to all connected peers
  broadcastMessage(message) {
    const messageData = JSON.stringify(message);
    
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(messageData);
          console.log('Message sent to peer:', peerId);
        } catch (error) {
          console.error('Failed to send message to peer:', peerId, error);
        }
      }
    });
  }

  // Send message to specific peer
  sendToPeer(peerId, message) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify(message));
        console.log('Direct message sent to peer:', peerId);
      } catch (error) {
        console.error('Failed to send direct message to peer:', peerId, error);
      }
    }
  }

  // Handle signaling messages
  async handleSignalingMessage(peerId, message) {
    const pc = this.peers.get(peerId) || await this.createPeerConnection(peerId);
    
    switch (message.type) {
      case 'offer':
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignalingMessage(peerId, {
          type: 'answer',
          answer: answer
        });
        break;
        
      case 'answer':
        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        break;
        
      case 'ice-candidate':
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        break;
    }
  }

  // Create offer for new peer
  async createOffer(peerId) {
    const pc = await this.createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    this.sendSignalingMessage(peerId, {
      type: 'offer',
      offer: offer
    });
  }

  // Send signaling message via server
  sendSignalingMessage(peerId, message) {
    // This would be sent via the Socket.IO server
    if (window.socket) {
      window.socket.emit('p2p-signal', {
        targetPeer: peerId,
        roomId: this.roomId,
        message: message
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    const status = {
      totalPeers: this.peers.size,
      connectedChannels: this.dataChannels.size,
      activeConnections: 0
    };
    
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        status.activeConnections++;
      }
    });
    
    return status;
  }

  // Cleanup connections
  cleanup() {
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.close();
      }
    });
    
    this.peers.forEach((pc) => {
      pc.close();
    });
    
    this.peers.clear();
    this.dataChannels.clear();
    this.isInitialized = false;
    this.roomId = null;
    this.onMessageCallback = null;
    
    console.log('P2P connections cleaned up');
  }

  // Check if P2P is available as fallback
  isP2PAvailable() {
    return this.dataChannels.size > 0;
  }

  // Sync messages with peers (for redundancy)
  syncMessages(messages) {
    const syncData = {
      type: 'message-sync',
      messages: messages,
      timestamp: Date.now()
    };
    
    this.broadcastMessage(syncData);
  }
}

// Export singleton instance
export const p2pMessaging = new P2PMessaging();
export default P2PMessaging;
