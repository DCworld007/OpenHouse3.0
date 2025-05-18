-- Combined migration file for Cloudflare D1

-- User table
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  image TEXT
);

-- PlanningRoom table
CREATE TABLE IF NOT EXISTS PlanningRoom (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ownerId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- RoomMember table
CREATE TABLE IF NOT EXISTS RoomMember (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Card table
CREATE TABLE IF NOT EXISTS Card (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  notes TEXT,
  cardType TEXT,
  imageUrl TEXT,
  groupId TEXT,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- CardRoomLink table
CREATE TABLE IF NOT EXISTS CardRoomLink (
  cardId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  PRIMARY KEY (cardId, roomId)
);

-- Message table
CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  userId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Reaction table
CREATE TABLE IF NOT EXISTS Reaction (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  userId TEXT NOT NULL,
  messageId TEXT,
  cardId TEXT,
  createdAt TEXT NOT NULL
);

-- ActivityLog table for activity feed persistence
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  groupId TEXT NOT NULL,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  context TEXT, -- JSON string
  timestamp INTEGER NOT NULL
);

-- InviteTokens table
CREATE TABLE IF NOT EXISTS InviteTokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  planningRoomId TEXT NOT NULL,
  generatedByUserId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expiresAt TEXT,
  maxUses INTEGER,
  usesCount INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1, -- 1 for true, 0 for false
  FOREIGN KEY (planningRoomId) REFERENCES PlanningRoom(id) ON DELETE CASCADE,
  FOREIGN KEY (generatedByUserId) REFERENCES User(id) ON DELETE CASCADE
);

-- Index on token for faster lookups when validating invites
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON InviteTokens(token);

-- Index for querying active tokens for a specific room
CREATE INDEX IF NOT EXISTS idx_invite_tokens_room_active ON InviteTokens(planningRoomId, isActive);

-- LinkedGroup table to store links between planning rooms
CREATE TABLE IF NOT EXISTS LinkedGroup (
  sourceGroupId TEXT NOT NULL,
  linkedGroupId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (sourceGroupId, linkedGroupId)
); 