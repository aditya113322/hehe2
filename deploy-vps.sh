#!/bin/bash

# 🚀 VPS Deployment Script for Secure Chat App
# Usage: ./deploy-vps.sh

echo "🚀 Starting VPS deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="secure-chat-app"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="secure-chat"
PORT=5000

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "  App Name: $APP_NAME"
echo -e "  Directory: $APP_DIR"
echo -e "  Service: $SERVICE_NAME"
echo -e "  Port: $PORT"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js 18.x
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2...${NC}"
npm install -g pm2

# Install nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
apt install -y nginx

# Create app directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# Create package.json
echo -e "${YELLOW}📄 Creating package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "secure-chat-server",
  "version": "1.0.0",
  "description": "Secure Chat Application Server",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "simple": "node index-simple.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "mongodb": "^6.18.0",
    "mongoose": "^8.17.1",
    "nodemon": "^3.1.10",
    "razorpay": "^2.9.6",
    "socket.io": "^4.8.1",
    "uuid": "^11.1.0"
  }
}
EOF

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Create environment file
echo -e "${YELLOW}🔧 Creating environment configuration...${NC}"
cat > .env << 'EOF'
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/secure-chat-rooms

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_R5hxd295uoRa50
RAZORPAY_KEY_SECRET=KVWgxt11gKwRuAw6eOZp95TW

# Server Configuration
PORT=5000
NODE_ENV=production

# Security Configuration
JWT_SECRET=your_jwt_secret_for_future_use
ENCRYPTION_KEY=your_encryption_key_for_future_use
EOF

echo -e "${GREEN}✅ Basic setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "1. Copy your server files to: $APP_DIR"
echo -e "2. Run: ${YELLOW}pm2 start index.js --name $SERVICE_NAME${NC}"
echo -e "3. Run: ${YELLOW}pm2 startup${NC}"
echo -e "4. Run: ${YELLOW}pm2 save${NC}"
echo ""
echo -e "${YELLOW}🔧 Manual file copy required:${NC}"
echo -e "  - Copy server/index.js or server/index-simple.js"
echo -e "  - Copy server/models/ (if using MongoDB)"
echo -e "  - Copy server/config/ (if using MongoDB)"
echo ""
