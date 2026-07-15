const { postEmojiReaction, getQuestionEmojis, deleteEmojiReaction, checkUserEmojiReaction } = require("../controllers/emoji.controller");

const EmojiRotue = require("express").Router();

EmojiRotue.post('/', postEmojiReaction);
EmojiRotue.get('/:id/emojis', getQuestionEmojis);
EmojiRotue.delete('/:id', deleteEmojiReaction);
EmojiRotue.get('/check-user-emoji', checkUserEmojiReaction);

module.exports = EmojiRotue