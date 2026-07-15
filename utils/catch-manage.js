// cache-manager.js
const NodeCache = require('node-cache');

// Create separate caches for different types of GET queries
const caches = {
  users: new NodeCache({ stdTTL: 600 }),        // 10 minutes
  counts: new NodeCache({ stdTTL: 300 }),       // 5 minutes  
  lists: new NodeCache({ stdTTL: 120 }),        // 2 minutes
  search: new NodeCache({ stdTTL: 60 })         // 1 minute
};

// Simple helper functions
const getFromCache = (cacheName, key) => {
  return caches[cacheName]?.get(key);
};

const setToCache = (cacheName, key, data, ttl) => {
  return caches[cacheName]?.set(key, data, ttl || caches[cacheName].options.stdTTL);
};

// Delete from cache
const deleteFromCache = (cacheName, key) => {
  return caches[cacheName]?.del(key);
};

// Check if key exists in cache
const hasInCache = (cacheName, key) => {
  return caches[cacheName]?.has(key);
};

// Get cache statistics
const getCacheStats = () => {
  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
};

// Clear specific cache
const clearCache = (cacheName) => {
  return caches[cacheName]?.flushAll();
};

// Clear all caches
const clearAllCaches = () => {
  Object.values(caches).forEach(cache => cache.flushAll());
};

module.exports = {
  getFromCache,
  setToCache,
  deleteFromCache,
  hasInCache,
  getCacheStats,
  clearCache,
  clearAllCaches,
  caches // Export if needed
};