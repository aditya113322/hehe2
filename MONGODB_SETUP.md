# 🍃 MongoDB Setup Guide

## 📋 Overview

Your secure chat application now uses MongoDB instead of SQLite for better scalability, cloud deployment, and advanced features like automatic document expiration (TTL).

## 🚀 Quick Setup Options

### Option 1: Local MongoDB (Development)

1. **Download MongoDB Community Server**
   - Visit: https://www.mongodb.com/try/download/community
   - Download for your operating system
   - Install with default settings

2. **Start MongoDB Service**
   ```bash
   # Windows (as Administrator)
   net start MongoDB
   
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

3. **Verify Installation**
   ```bash
   # Connect to MongoDB shell
   mongosh
   
   # Or check if service is running
   mongosh --eval "db.adminCommand('ismaster')"
   ```

### Option 2: MongoDB Atlas (Cloud - Recommended)

1. **Create Free Account**
   - Go to: https://www.mongodb.com/atlas
   - Sign up for free account
   - Create a new cluster (free tier available)

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

3. **Update Environment Variables**
   ```bash
   # In server/.env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/secure-chat-rooms
   ```

## 🔧 Configuration

### Environment Variables

Create `server/.env` file:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/secure-chat-rooms

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Database Features

#### Automatic Document Expiration (TTL)
- **Tickets**: Automatically deleted when `expiresAt` time is reached
- **Chat Rooms**: Automatically deleted when `expiresAt` time is reached
- **No manual cleanup required** - MongoDB handles it automatically

#### Indexes for Performance
- **Tickets**: Indexed on `roomId`, `status`, `expiresAt`
- **Payments**: Indexed on `razorpayOrderId`, `status`, `createdAt`
- **Chat Rooms**: Indexed on `ticketId`, `isActive`, `expiresAt`

#### Data Models

**Tickets Collection:**
```javascript
{
  _id: "uuid",
  paymentId: "payment_uuid",
  roomId: "room_uuid", 
  creatorName: "John Doe",
  amount: 1000,
  status: "active",
  expiresAt: ISODate("2024-01-01T12:00:00Z"),
  createdAt: ISODate("2024-01-01T11:00:00Z"),
  updatedAt: ISODate("2024-01-01T11:00:00Z")
}
```

**Payments Collection:**
```javascript
{
  _id: "uuid",
  razorpayPaymentId: "pay_xxx",
  razorpayOrderId: "order_xxx",
  razorpaySignature: "signature_xxx",
  amount: 1000,
  currency: "INR",
  status: "completed",
  ticketId: "ticket_uuid",
  metadata: {
    creatorName: "John Doe"
  },
  createdAt: ISODate("2024-01-01T11:00:00Z"),
  updatedAt: ISODate("2024-01-01T11:00:00Z")
}
```

**Chat Rooms Collection:**
```javascript
{
  _id: "room_uuid",
  ticketId: "ticket_uuid",
  creatorName: "John Doe",
  isActive: true,
  expiresAt: ISODate("2024-01-01T12:00:00Z"),
  participants: [
    {
      username: "John Doe",
      joinedAt: ISODate("2024-01-01T11:00:00Z"),
      socketId: "socket_id",
      isOnline: true
    }
  ],
  settings: {
    maxParticipants: 50,
    allowEphemeralMessages: true,
    autoDeleteAfterExpiry: true
  },
  stats: {
    totalMessages: 0,
    totalParticipants: 0,
    peakConcurrentUsers: 0
  },
  createdAt: ISODate("2024-01-01T11:00:00Z"),
  updatedAt: ISODate("2024-01-01T11:00:00Z")
}
```

## 🛠️ Development Commands

### Start Application
```bash
cd server
npm install
npm start
```

### MongoDB Shell Commands
```bash
# Connect to local MongoDB
mongosh

# Switch to your database
use secure-chat-rooms

# View collections
show collections

# View tickets
db.tickets.find().pretty()

# View active chat rooms
db.chatrooms.find({isActive: true}).pretty()

# View payment records
db.payments.find().pretty()

# Check indexes
db.tickets.getIndexes()
```

### Useful Queries
```javascript
// Find all active tickets
db.tickets.find({status: "active", expiresAt: {$gt: new Date()}})

// Find expired rooms
db.chatrooms.find({$or: [{expiresAt: {$lt: new Date()}}, {isActive: false}]})

// Count documents
db.tickets.countDocuments()
db.payments.countDocuments()
db.chatrooms.countDocuments()

// Drop collections (careful!)
db.tickets.drop()
db.payments.drop()
db.chatrooms.drop()
```

## 🔍 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T11:00:00.000Z",
  "database": {
    "status": "healthy",
    "timestamp": "2024-01-01T11:00:00.000Z"
  },
  "stats": {
    "activeRooms": 5,
    "totalTickets": 10,
    "connectedUsers": 15
  },
  "uptime": 3600
}
```

### Database Monitoring
- **Connection Status**: Automatic reconnection on failure
- **Cleanup Jobs**: Automatic cleanup every 5-30 minutes
- **Performance**: Indexed queries for fast lookups
- **TTL**: Automatic document expiration

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```
   **Solution**: Start MongoDB service or check connection string

2. **Authentication Failed**
   ```
   Error: Authentication failed
   ```
   **Solution**: Check username/password in connection string

3. **Database Not Found**
   ```
   Database 'secure-chat-rooms' not found
   ```
   **Solution**: MongoDB creates database automatically on first write

4. **Index Creation Failed**
   ```
   Error creating index
   ```
   **Solution**: Check MongoDB version compatibility

### Performance Tips

1. **Use Indexes**: All queries use indexed fields
2. **Connection Pooling**: Configured for optimal performance
3. **TTL Indexes**: Automatic cleanup reduces storage
4. **Aggregation**: Use for complex queries

## 🔐 Security Considerations

### MongoDB Security
- **Authentication**: Enable authentication in production
- **Network Security**: Use VPN or private networks
- **Encryption**: Enable encryption at rest and in transit
- **Access Control**: Limit database user permissions

### Application Security
- **Input Validation**: All inputs are validated
- **No SQL Injection**: Using Mongoose prevents injection
- **Data Sanitization**: Sensitive data is not logged
- **Connection Security**: Secure connection strings

## 📊 Migration from SQLite

If you have existing SQLite data, you can migrate:

1. **Export SQLite Data**
   ```bash
   sqlite3 chat_rooms.db .dump > backup.sql
   ```

2. **Convert to MongoDB**
   - Parse SQL dump
   - Transform to MongoDB documents
   - Import using mongoimport or custom script

3. **Verify Migration**
   - Check document counts
   - Verify data integrity
   - Test application functionality

## 🌐 Production Deployment

### MongoDB Atlas (Recommended)
- **Automatic Backups**: Built-in backup and restore
- **Global Clusters**: Deploy close to users
- **Monitoring**: Built-in performance monitoring
- **Security**: Enterprise-grade security features

### Self-Hosted MongoDB
- **Replica Sets**: For high availability
- **Sharding**: For horizontal scaling
- **Monitoring**: Use MongoDB Compass or ops tools
- **Backups**: Regular automated backups

---

**🎉 Your secure chat application now uses MongoDB for better scalability and cloud deployment!**

**🔒 All security features remain intact with improved performance and reliability.**
