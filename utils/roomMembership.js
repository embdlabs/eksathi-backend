/**
 * Room ids are string-concat of two numeric ids (either order).
 * Avoid simple `.includes()` — user 12 would match room "123…".
 */
function isUserInRoomId(roomId, userId) {
  const room = String(roomId || "");
  const uid = String(userId || "");
  if (!room || !uid) return false;
  for (let i = 1; i < room.length; i++) {
    if (room.slice(0, i) === uid || room.slice(i) === uid) return true;
  }
  return false;
}

function assertUserInRooms(userId, roomIds = []) {
  const rooms = (Array.isArray(roomIds) ? roomIds : [roomIds]).filter(Boolean);
  if (!rooms.length) return false;
  return rooms.every((r) => isUserInRoomId(r, userId));
}

module.exports = { isUserInRoomId, assertUserInRooms };
