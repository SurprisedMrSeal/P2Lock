const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.uri;
const mongoClient = new MongoClient(uri);
////
const DB = "P2Lock";
const defaultPrefix = ";";
////
async function connectToMongo() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB Atlas');
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
    updateTimer
};