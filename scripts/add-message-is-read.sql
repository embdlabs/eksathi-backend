-- Track DM read state for My Connections unread badges
ALTER TABLE messages
  ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0
  AFTER receiver_institute_id;

UPDATE messages SET is_read = 0 WHERE is_read IS NULL;
