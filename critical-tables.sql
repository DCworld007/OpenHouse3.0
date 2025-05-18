-- Critical tables for invite functionality

-- PlanningRoom table - primary table needed for the invite function
CREATE TABLE IF NOT EXISTS PlanningRoom (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ownerId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- User table - needed for foreign keys
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  image TEXT
);

-- InviteTokens table - required for the invite functionality
CREATE TABLE IF NOT EXISTS InviteTokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  planningRoomId TEXT NOT NULL,
  generatedByUserId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expiresAt TEXT,
  maxUses INTEGER,
  usesCount INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1
);

-- Create a test planning room entry
INSERT OR IGNORE INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
VALUES ('516c95e0-37b7-43ad-bee5-52ebe433c404', 'Test Room', 'Test description', '101452305332594244500', 
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')); 