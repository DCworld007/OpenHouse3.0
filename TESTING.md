# Testing OpenHouse3.0

This document provides instructions for testing the OpenHouse3.0 application both locally and on Cloudflare.

## Prerequisites

Before running the tests, make sure you have the following installed:

- Node.js (v16 or higher)
- npm (v7 or higher)
- Wrangler CLI (`npm install -g wrangler`)
- curl (for API testing)

## Local Testing

To test the application locally:

1. Make sure you have all dependencies installed:
   ```bash
   npm install
   ```

2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your specific values.

3. Run the local testing script:
   ```bash
   ./test-local.sh
   ```

This script will:
- Start a local development server
- Test all API endpoints (auth, data, KV)
- Clean up test data
- Stop the server

## Cloudflare Testing

To test the application on Cloudflare:

1. Make sure you're logged in to Cloudflare:
   ```bash
   wrangler login
   ```

2. Set up your Cloudflare environment variables:
   ```bash
   wrangler secret put JWT_SECRET
   ```

3. Run the Cloudflare testing script:
   ```bash
   ./test-cloudflare.sh
   ```

This script will:
- Deploy your application to Cloudflare
- Test all API endpoints (auth, data, KV)
- Clean up test data

## Manual Testing

If you prefer to test manually, you can use the following curl commands:

### Authentication

#### Signup
```bash
curl -X POST https://openhouse3.pages.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

#### Login
```bash
curl -X POST https://openhouse3.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Data

#### Create Room
```bash
curl -X POST https://openhouse3.pages.dev/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Room","description":"A test room"}'
```

#### Create Card
```bash
curl -X POST "https://openhouse3.pages.dev/api/cards?roomId=ROOM_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"Test Card","cardType":"what"}'
```

#### Get Cards
```bash
curl -X GET "https://openhouse3.pages.dev/api/cards?roomId=ROOM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### KV

#### Put Value
```bash
curl -X PUT "https://openhouse3.pages.dev/api/kv/test-key" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '"test-value"'
```

#### Get Value
```bash
curl -X GET "https://openhouse3.pages.dev/api/kv/test-key" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

If you encounter any issues during testing:

1. Check the Cloudflare logs:
   ```bash
   wrangler tail
   ```

2. Verify your environment variables:
   ```bash
   wrangler secret list
   ```

3. Check the database:
   ```bash
   wrangler d1 execute openhouse3 --command="SELECT * FROM User"
   ```

4. If all else fails, you can reset your database:
   ```bash
   wrangler d1 execute openhouse3 --file=./prisma/migrations/init.sql
   ``` 