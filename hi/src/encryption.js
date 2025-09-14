import CryptoJS from 'crypto-js';

class SecureMessaging {
  constructor() {
    this.roomKey = null;
    this.keyDerivationSalt = null;
  }

  // Generate a room-specific encryption key from ticket ID
  generateRoomKey(ticketId, roomId) {
    // Use ticket ID and room ID to create a deterministic but secure key
    // Store the base key material for consistency
    this.baseKeyMaterial = `${ticketId}-${roomId}`;
    this.keyDerivationSalt = CryptoJS.lib.WordArray.random(256/8);

    // Derive key using PBKDF2
    this.roomKey = CryptoJS.PBKDF2(this.baseKeyMaterial, this.keyDerivationSalt, {
      keySize: 256/32,
      iterations: 10000
    });

    return {
      key: this.roomKey.toString(),
      salt: this.keyDerivationSalt.toString()
    };
  }

  // Set room key from existing salt (for other participants)
  setRoomKey(ticketId, roomId, salt) {
    this.baseKeyMaterial = `${ticketId}-${roomId}`;
    this.keyDerivationSalt = CryptoJS.enc.Hex.parse(salt);

    this.roomKey = CryptoJS.PBKDF2(this.baseKeyMaterial, this.keyDerivationSalt, {
      keySize: 256/32,
      iterations: 10000
    });
  }

  // Get current salt for sharing with late joiners
  getCurrentSalt() {
    return this.keyDerivationSalt ? this.keyDerivationSalt.toString() : null;
  }

  // Encrypt message
  encryptMessage(message, username) {
    if (!this.roomKey) {
      throw new Error('Room key not initialized');
    }

    const timestamp = Date.now();
    const messageData = {
      text: message,
      username: username,
      timestamp: timestamp,
      id: this.generateMessageId()
    };

    // Convert to string and encrypt
    const messageString = JSON.stringify(messageData);
    const iv = CryptoJS.lib.WordArray.random(128/8);
    
    const encrypted = CryptoJS.AES.encrypt(messageString, this.roomKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encryptedData: encrypted.toString(),
      iv: iv.toString(),
      timestamp: timestamp,
      messageId: messageData.id
    };
  }

  // Decrypt message
  decryptMessage(encryptedData, iv) {
    if (!this.roomKey) {
      throw new Error('Room key not initialized');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.roomKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Failed to decrypt message');
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Generate unique message ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Clear encryption keys (for security)
  clearKeys() {
    this.roomKey = null;
    this.keyDerivationSalt = null;
  }

  // Generate integrity hash for message verification
  generateMessageHash(encryptedData, iv, timestamp) {
    const dataToHash = `${encryptedData}${iv}${timestamp}`;
    return CryptoJS.SHA256(dataToHash).toString();
  }

  // Verify message integrity
  verifyMessageIntegrity(encryptedData, iv, timestamp, hash) {
    const calculatedHash = this.generateMessageHash(encryptedData, iv, timestamp);
    return calculatedHash === hash;
  }

  // Generate ephemeral key for temporary messages
  generateEphemeralKey() {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  // Encrypt ephemeral message (auto-delete after reading)
  encryptEphemeralMessage(message, username, ephemeralKey) {
    const timestamp = Date.now();
    const messageData = {
      text: message,
      username: username,
      timestamp: timestamp,
      ephemeral: true,
      id: this.generateMessageId()
    };

    const messageString = JSON.stringify(messageData);
    const iv = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.enc.Hex.parse(ephemeralKey);
    
    const encrypted = CryptoJS.AES.encrypt(messageString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encryptedData: encrypted.toString(),
      iv: iv.toString(),
      timestamp: timestamp,
      messageId: messageData.id,
      ephemeral: true
    };
  }

  // Decrypt ephemeral message
  decryptEphemeralMessage(encryptedData, iv, ephemeralKey) {
    try {
      const key = CryptoJS.enc.Hex.parse(ephemeralKey);
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Failed to decrypt ephemeral message');
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Ephemeral decryption failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const secureMessaging = new SecureMessaging();
export default SecureMessaging;
