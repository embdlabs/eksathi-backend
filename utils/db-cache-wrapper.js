const { mysqlcon } = require("../model/db");
const { getFromCache, setToCache } = require("./catch-manage"); // Fix typo if needed

// Convert callback to promise
const queryPromise = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    mysqlcon.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

// Cached query function
const cachedQuery = async (options) => {
  const { cacheName, cacheKey, sql, params = [], ttl } = options;

  // Try to get from cache first
  const cached = getFromCache(cacheName, cacheKey);
  if (cached !== undefined) {
    return {
      data: cached,
      fromCache: true,
      timestamp: new Date().toISOString()
    };
  }

  // Execute database query using queryPromise
  const data = await queryPromise(sql, params); // Fixed: use queryPromise
  
  // Store in cache
  if (data !== undefined) {
    setToCache(cacheName, cacheKey, data, ttl);
  }
  
  return {
    data: data,
    fromCache: false,
    timestamp: new Date().toISOString()
  };
};

module.exports = { queryPromise, cachedQuery };