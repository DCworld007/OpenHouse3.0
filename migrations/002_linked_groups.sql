-- LinkedGroup table to store links between planning rooms
CREATE TABLE IF NOT EXISTS LinkedGroup (
  sourceGroupId TEXT NOT NULL,
  linkedGroupId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (sourceGroupId, linkedGroupId)
); 