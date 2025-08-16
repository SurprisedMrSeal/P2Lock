module.exports = { ver: '2.10.0' };

const { MongoClient } = require('mongodb');
require('dotenv').config();
const { prefix } = require('./utils');

const uri = process.env.uri;
const mongoClient = new MongoClient(uri);
////
const DB = "P2Lock";
const defaultPrefix = prefix;
////

// --- In-memory caches ---
const prefixCache = new Map();          // guildId -> prefix
const delayCache = new Map();           // guildId -> delay
const timerCache = new Map();           // guildId -> timer
const toggleCache = new Map();          // guildId -> toggle features
const blacklistedCache = new Map();     // guildId -> channels
const eventListCache = { mon: [] };     // global cache
const customListCache = new Map();      // guildId -> mon array
const afkOptOutCache = new Set();       // userIds

// --- Connect to MongoDB ---
async function connectToMongo() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB Atlas');
        await setupTTLIndex();
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
    }
}

// Prefix
async function getPrefixForServer(guildId) {
    if (prefixCache.has(guildId)) return prefixCache.get(guildId);
    try {
        const doc = await mongoClient.db(DB).collection('config').findOne({ guildId });
        const value = doc?.prefix || defaultPrefix;
        prefixCache.set(guildId, value);
        return value;
    } catch (error) {
        console.error('Error fetching prefix from MongoDB:', error);
        return defaultPrefix;
    }
}

async function updatePrefixForServer(guildId, newPrefix) {
    try {
        await mongoClient.db(DB).collection('config').updateOne(
            { guildId },
            { $set: { prefix: newPrefix } },
            { upsert: true }
        );
        prefixCache.set(guildId, newPrefix);
        return true;
    } catch (error) {
        console.error('Error updating prefix in MongoDB:', error);
        return false;
    }
}

// Delay
async function getDelay(guildId) {
    if (delayCache.has(guildId)) return delayCache.get(guildId);
    try {
        const doc = await mongoClient.db(DB).collection('config').findOne({ guildId });
        const value = doc?.delay || "0";
        delayCache.set(guildId, value);
        return value;
    } catch (error) {
        console.error('Error fetching delay from MongoDB:', error);
        return "0";
    }
}

async function updateDelay(guildId, newDelay) {
    try {
        await mongoClient.db(DB).collection('config').updateOne(
            { guildId },
            { $set: { delay: newDelay } },
            { upsert: true }
        );
        delayCache.set(guildId, newDelay);
        return true;
    } catch (error) {
        console.error('Error updating delay in MongoDB:', error);
        return false;
    }
}

// Timer
async function getTimer(guildId) {
    if (timerCache.has(guildId)) return timerCache.get(guildId);
    try {
        const doc = await mongoClient.db(DB).collection('config').findOne({ guildId });
        const value = doc?.timer || "0";
        timerCache.set(guildId, value);
        return value;
    } catch (error) {
        console.error('Error fetching timer from MongoDB:', error);
        return "0";
    }
}

async function updateTimer(guildId, newTimer) {
    try {
        await mongoClient.db(DB).collection('config').updateOne(
            { guildId },
            { $set: { timer: newTimer } },
            { upsert: true }
        );
        timerCache.set(guildId, newTimer);
        return true;
    } catch (error) {
        console.error('Error updating timer in MongoDB:', error);
        return false;
    }
}

// Toggle Features
async function loadToggleableFeatures(guildId) {
    if (toggleCache.has(guildId)) return toggleCache.get(guildId);

    try {
        const doc = await mongoClient.db(DB).collection('toggleable_features').findOne({ _id: guildId });
        const defaults = getDefaultToggleableFeatures();
        const stored = doc?.features || {};
        const merged = { ...defaults, ...stored };
        toggleCache.set(guildId, merged);
        return merged;
    } catch (error) {
        console.error('Error loading toggleable features from MongoDB:', error);
        return getDefaultToggleableFeatures();
    }
}

async function saveToggleableFeatures(guildId, features) {
    try {
        await mongoClient.db(DB).collection('toggleable_features').updateOne(
            { _id: guildId },
            { $set: { features } },
            { upsert: true }
        );
        toggleCache.set(guildId, features);
        return true;
    } catch (error) {
        console.error('Error saving toggleable features to MongoDB:', error);
        return false;
    }
}

function getDefaultToggleableFeatures() {
    return {
        includeShinyHuntPings: true,
        includeRarePings: true,
        includeRegionalPings: true,
        includeCollectionPings: false,
        includeQuestPings: false,
        includeTypePings: false,
        includeEventPings: false,
        includeCustomLocks: false,
        lockAfk: true,
        pingAfk: false,
        autoPin: false,
        adminMode: false,
    };
}

// Blacklisted Channels
async function loadBlacklistedChannels(guildId) {
    if (blacklistedCache.has(guildId)) return blacklistedCache.get(guildId);

    try {
        const doc = await mongoClient.db(DB).collection('blacklisted_channels').findOne({ guildId });
        const channels = doc?.channels || [];
        blacklistedCache.set(guildId, channels);
        return channels;
    } catch (error) {
        console.error('Error loading blacklisted channels:', error);
        return [];
    }
}

async function saveBlacklistedChannels(guildId, channels) {
    try {
        await mongoClient.db(DB).collection('blacklisted_channels').updateOne(
            { guildId },
            { $set: { channels } },
            { upsert: true }
        );
        blacklistedCache.set(guildId, channels);
        return true;
    } catch (error) {
        console.error('Error saving blacklisted channels:', error);
        return false;
    }
}

// Active Locks
async function saveActiveLock(guildId, channelId, botId, lockTime, unlockTime) {
    try {
        const locksCollection = mongoClient.db(DB).collection('active_locks');
        await locksCollection.updateOne(
            { guildId, channelId },
            { $set: { guildId, channelId, botId, lockTime, unlockTime } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('Error saving active lock to MongoDB:', error);
        return false;
    }
}

async function removeActiveLock(guildId, botId, channelId) {
    try {
        const locksCollection = mongoClient.db(DB).collection('active_locks');
        const result = await locksCollection.deleteOne({ guildId, botId, channelId });
        return result.deletedCount > 0;
    } catch (error) {
        console.error('Error removing active lock from MongoDB:', error);
        return false;
    }
}

async function getActiveLocks(botId) {
    try {
        const locksCollection = mongoClient.db(DB).collection('active_locks');
        return await locksCollection.find({ botId }).toArray();
    } catch (error) {
        console.error('Error fetching active locks from MongoDB:', error);
        return [];
    }
}

async function getActiveLock(guildId, botId, channelId) {
    try {
        const locksCollection = mongoClient.db(DB).collection('active_locks');
        return await locksCollection.findOne({ guildId, botId, channelId });
    } catch (error) {
        console.error('Error fetching active lock from MongoDB:', error);
        return null;
    }
}

async function setupTTLIndex() {
    try {
        const locksCollection = mongoClient.db(DB).collection('active_locks');
        //await locksCollection.dropIndex("lockTime_1"); //uncomment if you change the expiration date
        await locksCollection.createIndex({ "lockTime": 1 }, { expireAfterSeconds: 172800 }); //48 hrs
    } catch (error) {
        console.error('Error creating TTL index:', error);
    }
}

// Event mon list
async function getEventList() {
    if (eventListCache.mon.length) return eventListCache.mon;

    try {
        const doc = await mongoClient.db(DB).collection('event_list').findOne({ _id: "list" });
        eventListCache.mon = doc?.mon || [];
        return eventListCache.mon;
    } catch (error) {
        console.error('Error loading event list:', error);
        return [];
    }
}

async function saveEventList(mon) {
    try {
        await mongoClient.db(DB).collection('event_list').updateOne(
            { _id: "list" },
            { $set: { mon } },
            { upsert: true }
        );
        eventListCache.mon = mon;
        return true;
    } catch (error) {
        console.error('Error saving event list:', error);
        return false;
    }
}

// Custom List
async function getCustomList(guildId) {
    if (customListCache.has(guildId)) return customListCache.get(guildId);

    try {
        const doc = await mongoClient.db(DB).collection('custom_list').findOne({ _id: guildId });
        const list = doc?.mon || [];
        customListCache.set(guildId, list);
        return list;
    } catch (error) {
        console.error('Error loading custom mon list:', error);
        return [];
    }
}

async function saveCustomList(mon, guildId) {
    try {
        await mongoClient.db(DB).collection('custom_list').updateOne(
            { _id: guildId },
            { $set: { mon } },
            { upsert: true }
        );
        customListCache.set(guildId, mon);
        return true;
    } catch (error) {
        console.error('Error saving custom mon list:', error);
        return false;
    }
}

// PingAfk opting in/out
async function getAfkPingOptOutList() {
    if (afkOptOutCache.size) return Array.from(afkOptOutCache);

    try {
        const doc = await mongoClient.db(DB).collection('pingafk_optout').findOne({ _id: "oolist" });
        const users = doc?.userIds || [];
        afkOptOutCache.clear();
        users.forEach(u => afkOptOutCache.add(u));
        return users;
    } catch (error) {
        console.error('Error fetching AFK opt-out list:', error);
        return [];
    }
}

async function toggleAfkPingOptOut(userId) {
    try {
        const collection = mongoClient.db(DB).collection('pingafk_optout');
        const doc = await collection.findOne({ _id: 'oolist' });

        let updatedUserIds;
        if (!doc) {
            updatedUserIds = [userId];
        } else {
            const isOptedOut = doc.userIds?.includes(userId);
            updatedUserIds = isOptedOut
                ? doc.userIds.filter(id => id !== userId)
                : [...doc.userIds, userId];
        }

        await collection.updateOne(
            { _id: 'oolist' },
            { $set: { userIds: updatedUserIds } },
            { upsert: true }
        );

        afkOptOutCache.clear();
        updatedUserIds.forEach(u => afkOptOutCache.add(u));

        return updatedUserIds.includes(userId); // true if now opted out
    } catch (error) {
        console.error('Error toggling AFK ping opt-out:', error);
        return false;
    }
}

module.exports = {
    connectToMongo,
    getPrefixForServer,
    updatePrefixForServer,
    saveToggleableFeatures,
    loadToggleableFeatures,
    getDefaultToggleableFeatures,
    saveBlacklistedChannels,
    loadBlacklistedChannels,
    getDelay,
    updateDelay,
    getTimer,
    updateTimer,
    saveActiveLock,
    removeActiveLock,
    getActiveLocks,
    getActiveLock,
    saveEventList,
    getEventList,
    saveCustomList,
    getCustomList,
    getAfkPingOptOutList,
    toggleAfkPingOptOut
};
