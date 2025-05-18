#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Cloudflare End-to-End Tests${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler is not installed. Please install it with 'npm install -g wrangler'${NC}"
    exit 1
fi

# Check if user is logged in to Cloudflare
echo -e "${YELLOW}Checking Cloudflare login status...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Cloudflare. Please run 'wrangler login' first.${NC}"
    exit 1
fi

# Deploy to Cloudflare
echo -e "${YELLOW}Deploying to Cloudflare...${NC}"
wrangler deploy

# Test authentication endpoints
echo -e "${YELLOW}Testing authentication endpoints...${NC}"
echo -e "${YELLOW}1. Testing signup endpoint...${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST https://openhouse3.pages.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}')

if [[ $SIGNUP_RESPONSE == *"user"* ]]; then
  echo -e "${GREEN}✓ Signup successful${NC}"
  USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Signup failed: $SIGNUP_RESPONSE${NC}"
  exit 1
fi

echo -e "${YELLOW}2. Testing login endpoint...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST https://openhouse3.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

if [[ $LOGIN_RESPONSE == *"user"* ]]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Login failed: $LOGIN_RESPONSE${NC}"
  exit 1
fi

# Test data endpoints
echo -e "${YELLOW}Testing data endpoints...${NC}"
echo -e "${YELLOW}1. Testing create room endpoint...${NC}"
ROOM_RESPONSE=$(curl -s -X POST https://openhouse3.pages.dev/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Room","description":"A test room"}')

if [[ $ROOM_RESPONSE == *"id"* ]]; then
  echo -e "${GREEN}✓ Room creation successful${NC}"
  ROOM_ID=$(echo $ROOM_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Room creation failed: $ROOM_RESPONSE${NC}"
  exit 1
fi

echo -e "${YELLOW}2. Testing create card endpoint...${NC}"
CARD_RESPONSE=$(curl -s -X POST "https://openhouse3.pages.dev/api/cards?roomId=$ROOM_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Test Card","cardType":"what"}')

if [[ $CARD_RESPONSE == *"id"* ]]; then
  echo -e "${GREEN}✓ Card creation successful${NC}"
  CARD_ID=$(echo $CARD_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Card creation failed: $CARD_RESPONSE${NC}"
  exit 1
fi

echo -e "${YELLOW}3. Testing get cards endpoint...${NC}"
CARDS_RESPONSE=$(curl -s -X GET "https://openhouse3.pages.dev/api/cards?roomId=$ROOM_ID" \
  -H "Authorization: Bearer $TOKEN")

if [[ $CARDS_RESPONSE == *"id"* ]]; then
  echo -e "${GREEN}✓ Get cards successful${NC}"
else
  echo -e "${RED}✗ Get cards failed: $CARDS_RESPONSE${NC}"
  exit 1
fi

# Test KV endpoints
echo -e "${YELLOW}Testing KV endpoints...${NC}"
echo -e "${YELLOW}1. Testing KV put endpoint...${NC}"
KV_PUT_RESPONSE=$(curl -s -X PUT "https://openhouse3.pages.dev/api/kv/test-key" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '"test-value"')

if [[ $KV_PUT_RESPONSE == *"Success"* ]]; then
  echo -e "${GREEN}✓ KV put successful${NC}"
else
  echo -e "${RED}✗ KV put failed: $KV_PUT_RESPONSE${NC}"
  exit 1
fi

echo -e "${YELLOW}2. Testing KV get endpoint...${NC}"
KV_GET_RESPONSE=$(curl -s -X GET "https://openhouse3.pages.dev/api/kv/test-key" \
  -H "Authorization: Bearer $TOKEN")

if [[ $KV_GET_RESPONSE == *"test-value"* ]]; then
  echo -e "${GREEN}✓ KV get successful${NC}"
else
  echo -e "${RED}✗ KV get failed: $KV_GET_RESPONSE${NC}"
  exit 1
fi

# Clean up test data
echo -e "${YELLOW}Cleaning up test data...${NC}"
curl -s -X DELETE "https://openhouse3.pages.dev/api/cards?cardId=$CARD_ID" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X DELETE "https://openhouse3.pages.dev/api/rooms?roomId=$ROOM_ID" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X DELETE "https://openhouse3.pages.dev/api/kv/test-key" \
  -H "Authorization: Bearer $TOKEN"

echo -e "${GREEN}All tests completed successfully!${NC}"
echo -e "${GREEN}Your Cloudflare deployment is working correctly.${NC}" 