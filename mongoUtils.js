//v2.4.4
const { MongoClient } = require('mongodb');
require('dotenv').config();
const { prefix } = require('./utils');

const uri = process.env.uri;
const mongoClient = new MongoClient(uri);
////
const DB = "P2Lock";
const defaultPrefix = prefix;
////
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
    try {
        const configCollection = mongoClient.db(DB).collection('config');
        const configDocument = await configCollection.findOne({ guildId });
        return configDocument ? configDocument.prefix || defaultPrefix : defaultPrefix;
    } catch (error) {
        console.error('Error fetching prefix from MongoDB:', error);
        return defaultPrefix;
    }
}

async function updatePrefixForServer(guildId, newPrefix) {
    try {
        const configCollection = mongoClient.db(DB).collection('config');
        const filter = { guildId };
        const update = { $set: { prefix: newPrefix } };
        const options = { upsert: true };
        const result = await configCollection.updateOne(filter, update, options);
        return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
        console.error('Error updating prefix in MongoDB:', error);
        return false;
    }
}

// Delay
async function getDelay(guildId) {
    try {
        const configCollection = mongoClient.db(DB).collection('config');
        const configDocument = await configCollection.findOne({ guildId });
        return configDocument ? configDocument.delay || "0" : "0";
    } catch (error) {
        console.error('Error fetching delay from MongoDB:', error);
        return "0";
    }
}

async function updateDelay(guildId, newDelay) {
    try {
        const configCollection = mongoClient.db(DB).collection('config');
        const filter = { guildId };
        const update = { $set: { delay: newDelay } };
        const options = { upsert: true };
        const result = await configCollection.updateOne(filter, update, options);
        return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
        console.error('Error updating delay in MongoDB:', error);
        return false;
    }
}

// Timer
async function getTimer(guildId) {
    try {
        const configCollection = mongoClient.db(DB).collection('config');
        const configDocument = await configCollection.findOne({ guildId });
        return configDocument ? configDocument.timer || "0" : "0";
    } catch (error) {
        console.error('Error fetching timer from MongoDB:', error);
        return "0";
    }
}

async function updateTimer(guildId, newTimer) {
    try {
        const configCollection = mongoClient.db(DB).collection('config');
        const filter = { guildId };
        const update = { $set: { timer: newTimer } };
        const options = { upsert: true };
        const result = await configCollection.updateOne(filter, update, options);
        return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
        console.error('Error updating timer in MongoDB:', error);
        return false;
    }
}

// Toggle
async function saveToggleableFeatures(guildId, features) {
    try {
        const toggleableCollection = mongoClient.db(DB).collection('toggleable_features');
        const result = await toggleableCollection.updateOne(
            { _id: guildId },
            { $set: { features } },
            { upsert: true }
        );
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Error saving toggleable features to MongoDB:', error);
        return false;
    }
}

async function loadToggleableFeatures(guildId) {
    try {
        const toggleableCollection = mongoClient.db(DB).collection('toggleable_features');
        const document = await toggleableCollection.findOne({ _id: guildId });
        return document ? document.features : getDefaultToggleableFeatures();
    } catch (error) {
        console.error('Error loading toggleable features from MongoDB:', error);
        return getDefaultToggleableFeatures();
    }
}

function getDefaultToggleableFeatures() {
    return {
        includeShinyHuntPings: true,
        includeRarePings: true,
        includeRegionalPings: true,
        includeCollectionPings: false,
        includeEventPings: false,
        includeQuestPings: false,
        includeTypePings: false,
        pingAfk: true,
        autoPin: false,
        adminMode: false,
    };
}

// Blacklist
async function saveBlacklistedChannels(guildId, channels) {
    try {
        const database = mongoClient.db(DB);
        const collection = database.collection('blacklisted_channels');

        await collection.updateOne({ guildId }, { $set: { channels } }, { upsert: true });
    } catch (error) {
        console.error('Error saving blacklisted channels:', error);
    }
}

async function loadBlacklistedChannels(guildId) {
    try {
        const database = mongoClient.db(DB);
        const collection = database.collection('blacklisted_channels');

        const result = await collection.findOne({ guildId });

        if (result) {
            return result.channels || [];
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error loading blacklisted channels:', error);
        return [];
    }
}

// Active Locks
async function saveActiveLock(guildId, channelId, botId, lockTime, unlockTime) {
    try {
        const locksCollection = mongoClient.db(DB).collection('active_locks');
        const filter = { guildId, channelId };
        const update = { 
            $set: { 
                guildId,
                channelId,
                botId,
                lockTime,
                unlockTime
            } 
        };
        const options = { upsert: true };
        const result = await locksCollection.updateOne(filter, update, options);
        return result.modifiedCount > 0 || result.upsertedCount > 0;
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
        return await locksCollection.find({botId}).toArray();
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
async function saveEventList(mon) {
    try {
        const collection = mongoClient.db(DB).collection('event_list');
        const filter = { _id: "list" };
        const update = { $set: { mon } };
        const options = { upsert: true };
        await collection.updateOne(filter, update, options);
        return true;
    } catch (error) {
        console.error('Error saving event list:', error);
        return false;
    }
}

async function getEventList() {
    try {
        const collection = mongoClient.db(DB).collection('event_list');
        const doc = await collection.findOne({ _id: "list" });
        return doc ? doc.mon : [];
    } catch (error) {
        console.error('Error loading event list:', error);
        return [];
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
    getEventList
};
