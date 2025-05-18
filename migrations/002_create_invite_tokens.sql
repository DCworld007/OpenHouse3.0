-- Migration to create the InviteTokens table

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

-- Optional: Index on token for faster lookups when validating invites
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON InviteTokens(token);

-- Optional: Index for querying active tokens for a specific room (e.g., for cleanup or listing active invites)
CREATE INDEX IF NOT EXISTS idx_invite_tokens_room_active ON InviteTokens(planningRoomId, isActive); 