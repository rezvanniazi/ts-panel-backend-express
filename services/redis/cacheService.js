const redis = require("./redis")

// Callback registry for cache updates - store by prefix pattern
let cacheUpdateCallbacks = new Map()

// Register callback for cache updates with prefix pattern
const onCacheUpdate = (prefix, callback) => {
    if (!cacheUpdateCallbacks.has(prefix)) {
        cacheUpdateCallbacks.set(prefix, [])
    }
    cacheUpdateCallbacks.get(prefix).push(callback)
}

// Remove callback for cache updates
const offCacheUpdate = (prefix, callback) => {
    if (cacheUpdateCallbacks.has(prefix)) {
        const callbacks = cacheUpdateCallbacks.get(prefix)
        const index = callbacks.indexOf(callback)
        if (index > -1) {
            callbacks.splice(index, 1)
        }
    }
}

// Get cached data
const getCache = async (key) => {
    try {
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null
    } catch (error) {
        console.error("❌ Redis Get Error:", error)
        return null
    }
}

// Set data in Redis with expiration
const setCache = async (key, value, ttl = 240) => {
    try {
        if (key.startsWith("teamspeak-")) {
            const oldValue = await getCache(key)
            const newValue = oldValue && typeof oldValue == "object" ? Object.assign({ ...oldValue }, value) : value
            if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
                return
            }

            await redis.set(key, JSON.stringify(newValue)) // EX = Expiry Time in seconds

            // Emit cache update event to registered callbacks that match the key prefix
            cacheUpdateCallbacks.forEach((callbacks, prefix) => {
                if (key.startsWith(prefix)) {
                    callbacks.forEach((callback) => {
                        try {
                            callback(key, newValue, oldValue)
                        } catch (error) {
                            console.error(`❌ Cache update callback error for ${key}:`, error)
                        }
                    })
                }
            })
        } else {
            await redis.set(key, JSON.stringify(value), "EX", ttl)
        }
    } catch (error) {
        console.error("❌ Redis Set Error:", error)
    }
}

// Delete cache key
const deleteCache = async (key) => {
    try {
        const oldValue = await getCache(key)
        await redis.del(key)

        // Emit cache delete event to registered callbacks that match the key prefix
        cacheUpdateCallbacks.forEach((callbacks, prefix) => {
            if (key.startsWith(prefix)) {
                callbacks.forEach((callback) => {
                    try {
                        callback(key, null, oldValue)
                    } catch (error) {
                        console.error(`❌ Cache delete callback error for ${key}:`, error)
                    }
                })
            }
        })
    } catch (error) {
        console.error("❌ Redis Delete Error:", error)
    }
}

module.exports = {
    setCache,
    getCache,
    onCacheUpdate,
    offCacheUpdate,
}
