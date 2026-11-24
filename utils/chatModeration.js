/** Lightweight abusive-word guardrail for DMs. */

const BLOCKED = [
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "chutiya",
  "madarchod",
  "bhosdike",
  "behenchod",
  "randi",
  "haraami",
  "harami",
];

const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findBlockedWord(text) {
  if (!text || typeof text !== "string") return null;
  const normalized = text.toLowerCase();
  for (const word of BLOCKED) {
    const re = new RegExp(`\\b${escapeReg(word)}\\b`, "i");
    if (re.test(normalized)) return word;
  }
  return null;
}

function assertCleanMessage(text) {
  const hit = findBlockedWord(text);
  if (hit) {
    const err = new Error("Message blocked: please keep the conversation respectful.");
    err.code = "ABUSIVE_LANGUAGE";
    throw err;
  }
  return true;
}

module.exports = { findBlockedWord, assertCleanMessage };
