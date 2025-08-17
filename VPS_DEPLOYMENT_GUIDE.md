# 🚀 VPS Deployment Guide for Secure Chat App

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ or similar
- Root access to the server
- Domain name (optional but recommended)
- Basic knowledge of Linux commands

## 🔧 Quick Deployment Steps

### Step 1: Connect to Your VPS

```bash
ssh root@srv961472
```

### Step 2: Run Auto-Setup Script

```bash
# Download and run the deployment script
curl -o deploy-vps.sh https://raw.githubusercontent.com/your-repo/deploy-vps.sh
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Step 3: Copy Server Files

**Option A: Using SCP (from your local machine)**
```bash
# Copy the entire server directory
scp -r server/ root@srv961472:/opt/secure-chat-app/

# Or copy individual files
scp server/index-simple.js root@srv961472:/opt/secure-chat-app/index.js
scp server/package.json root@srv961472:/opt/secure-chat-app/
```

**Option B: Manual Copy (on VPS)**
```bash
cd /opt/secure-chat-app

# Create the main server file
nano index.js
# Copy and paste the content from server/index-simple.js
```

### Step 4: Start the Application

```bash
cd /opt/secure-chat-app

# Install dependencies
npm install

# Start with PM2
pm2 start index.js --name secure-chat

# Enable auto-start on boot
pm2 startup
pm2 save
```

### Step 5: Configure Nginx (Optional)

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/secure-chat

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/secure-chat /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 🔧 Manual Deployment (Step by Step)

### 1. System Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx (optional)
apt install -y nginx
```

### 2. Application Setup

```bash
# Create app directory
mkdir -p /opt/secure-chat-app
cd /opt/secure-chat-app

# Create package.json
cat > package.json << 'EOF'
{
  "name": "secure-chat-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "socket.io": "^4.8.1",
    "uuid": "^11.1.0",
    "razorpay": "^2.9.6",
    "crypto": "^1.0.1"
  }
}
EOF

# Install dependencies
npm install
```

### 3. Environment Configuration

```bash
# Create .env file
cat > .env << 'EOF'
PORT=5000
NODE_ENV=production
RAZORPAY_KEY_ID=rzp_live_R5hxd295uoRa50
RAZORPAY_KEY_SECRET=KVWgxt11gKwRuAw6eOZp95TW
EOF
```

### 4. Copy Server Code

Create `index.js` with the production-ready server code:

```bash
nano index.js
```

Copy the entire content from `server/index-simple.js` (the updated version with production fixes).

### 5. Start and Monitor

```bash
# Start the application
pm2 start index.js --name secure-chat

# Monitor logs
pm2 logs secure-chat

# Check status
pm2 status

# Enable auto-start
pm2 startup
pm2 save
```

## 🔍 Testing Deployment

### 1. Check Server Status

```bash
# Check if server is running
pm2 status

# Check logs
pm2 logs secure-chat

# Check port
netstat -tlnp | grep :5000
```

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Should return:
{
  "status": "healthy",
  "timestamp": "...",
  "database": {"status": "in-memory"},
  "mongoConnected": false,
  "stats": {...}
}
```

### 3. Test from Browser

```
http://your-server-ip:5000/api/health
```

## 🔧 Troubleshooting

### Common Issues

**1. Port 5000 already in use:**
```bash
# Kill process using port 5000
sudo lsof -ti:5000 | xargs kill -9

# Or change port in .env file
echo "PORT=3000" >> .env
```

**2. Permission denied:**
```bash
# Fix permissions
chown -R root:root /opt/secure-chat-app
chmod -R 755 /opt/secure-chat-app
```

**3. PM2 not starting:**
```bash
# Restart PM2
pm2 restart secure-chat

# Or delete and recreate
pm2 delete secure-chat
pm2 start index.js --name secure-chat
```

**4. Nginx errors:**
```bash
# Check Nginx status
systemctl status nginx

# Check configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## 🌐 Frontend Configuration

Update your frontend to use the VPS server:

```javascript
// In hi/src/socket.js
const SOCKET_URL = "http://your-server-ip:5000";
// or with domain: "https://your-domain.com"

// In hi/src/PaymentForm.js and hi/src/JoinRoom.js
const API_URL = "http://your-server-ip:5000";
```

## 🔒 Security Considerations

### 1. Firewall Setup

```bash
# Install UFW
apt install ufw

# Allow SSH
ufw allow ssh

# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow your app port
ufw allow 5000

# Enable firewall
ufw enable
```

### 2. SSL Certificate (Recommended)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Memory usage
pm2 show secure-chat

# Restart if needed
pm2 restart secure-chat
```

### Log Management

```bash
# View logs
pm2 logs secure-chat

# Clear logs
pm2 flush

# Log rotation
pm2 install pm2-logrotate
```

## 🚀 Production Checklist

- [ ] Server running on VPS
- [ ] PM2 process manager configured
- [ ] Auto-start on boot enabled
- [ ] Nginx reverse proxy (optional)
- [ ] SSL certificate (recommended)
- [ ] Firewall configured
- [ ] Frontend updated with server URL
- [ ] Health check endpoint working
- [ ] WebSocket connections working
- [ ] Payment integration tested

Your secure chat application should now be running on your VPS! 🎉

**Server URL:** `http://srv961472:5000` or `http://your-domain.com`
**Health Check:** `http://srv961472:5000/api/health`
