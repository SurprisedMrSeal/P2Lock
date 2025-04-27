//v2.2.2
const { Client, GatewayIntentBits, Partials, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ActivityType } = require('discord.js');
const { connectToMongo, getPrefixForServer, loadToggleableFeatures, getActiveLocks, removeActiveLock, getTimer } = require('./mongoUtils');
const { P2 } = require('./utils');
require('dotenv').config();
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const startTime = Date.now();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Create collections for prefix and slash commands
client.commands = new Collection();
const slashCommands = [];

// Load commands
const commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    // register prefix and slash commands
    if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases) command.aliases.forEach(alias => client.commands.set(alias, command));
    }
    // collect slash command data
    if (command.data) slashCommands.push(command.data.toJSON());
}

// Load events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// connect to mongo
connectToMongo();

// status/startup
client.on('ready', async () => {
    client.user.setPresence({
        activities: [{ name: `@P2Lock help | 🔒`, type: ActivityType.Playing }],
        status: 'idle'
    });

    // register global slash commands (replace existing)
    const rest = new REST({ version: '10' }).setToken(process.env.token);
    try {
        // Register (overwrite) global slash commands
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('Successfully registered global slash commands.');
    } catch (error) {
        console.error('Error registering global slash commands:', error);
    }

    BotID = client.user.id;
    BotRegexp = new RegExp(`<@!?${BotID}>`);

    console.log(`${client.user.tag} is online and ready!`);
    
    // Check for active locks that need to be processed
    //console.log('Checking for active locks...');
    try {
        const activeLocks = await getActiveLocks();
        
        if (activeLocks.length > 0) {
            console.log(`Found ${activeLocks.length} active locks to process`);
            
            for (const lock of activeLocks) {
                try {
                    // Get the guild and channel
                    const guild = client.guilds.cache.get(lock.guildId);
                    if (!guild) {
                        //console.log(`Guild ${lock.guildId} not found, removing lock`);
                        await removeActiveLock(lock.guildId, lock.channelId);
                        continue;
                    }
                    
                    const channel = guild.channels.cache.get(lock.channelId);
                    if (!channel) {
                        //console.log(`Channel ${lock.channelId} not found, removing lock`);
                        await removeActiveLock(lock.guildId, lock.channelId);
                        continue;
                    }
                    
                    // Check if the unlock time has passed
                    const now = Math.floor(Date.now() / 1000);
                    const unlockTime = lock.unlockTime;
                    
                    if (now >= unlockTime) {
                        // Unlock time has passed, unlock the channel
                        //console.log(`Unlocking channel ${channel.name} in ${guild.name} (unlock time has passed)`);
                        
                        try {
                            const targetMember = await guild.members.fetch(lock.targetId).catch(() => null);
                            const timerMinutes = await getTimer(msg.guild.id);
                            if (targetMember) {
                                const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                                if (overwrite && (overwrite.deny.has(PermissionFlagsBits.ViewChannel) || 
                                                 overwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                                    // Channel is still locked, unlock it
                                    await channel.permissionOverwrites.delete(targetMember.id);
                                    await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);
                                }
                            }
                        } catch (error) {
                            console.error(`Error unlocking channel ${channel.name}:`, error);
                        }
                        
                        // Remove the lock from the database
                        await removeActiveLock(lock.guildId, lock.channelId);
                    } else {
                        // Unlock time is in the future, set up a new timer
                        const remainingTime = (unlockTime - now) * 1000; // convert to milliseconds
                        //console.log(`Setting up timer for ${channel.name} in ${guild.name} (${Math.round(remainingTime/1000/60)} minutes remaining)`);
                        
                        setTimeout(async () => {
                            try {
                                const targetMember = await guild.members.fetch(lock.targetId).catch(() => null);
                                if (!targetMember) {
                                    await removeActiveLock(lock.guildId, lock.channelId);
                                    return;
                                }
                                
                                const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                                if (!overwrite || 
                                    (!overwrite.deny.has(PermissionFlagsBits.ViewChannel) && 
                                     !overwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                                    // Channel is already unlocked
                                    await removeActiveLock(lock.guildId, lock.channelId);
                                    return;
                                }
                                
                                // Unlock the channel
                                await channel.permissionOverwrites.delete(targetMember.id);
                                
                                // Send a notification about the auto-unlock
                                const timerMinutes = Math.round((unlockTime - lock.lockTime) / 60);
                                await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);
                                
                                // Remove the lock from the database
                                await removeActiveLock(lock.guildId, lock.channelId);
                            } catch (error) {
                                console.error('Error in scheduled unlock:', error);
                                await removeActiveLock(lock.guildId, lock.channelId);
                            }
                        }, remainingTime);
                    }
                    
                } catch (error) {
                    console.error(`Error processing lock for channel ${lock.channelId}:`, error);
                    await removeActiveLock(lock.guildId, lock.channelId);
                }
            }
        } else {
            console.log('No active locks found');
        }
    } catch (error) {
        console.error('Error checking active locks:', error);
    }
});

// prefix commands
client.on('messageCreate', async msg => {
    if (msg.author.bot) return;
    if (!msg.guild) return;
    if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) return;

    const prefix = await getPrefixForServer(msg.guild.id);
    const content = msg.content.trim();
    let usedPrefix = null;
    // 1) check for custom text prefix
    if (prefix && content.startsWith(prefix)) {
        usedPrefix = prefix;
    }
    // 2) check for mention prefix via regex
    if (!usedPrefix) {
        const mentionMatch = content.match(/^<@!?(\d+)>/);
        if (mentionMatch && mentionMatch[1] === client.user.id) {
            usedPrefix = mentionMatch[0];
        }
    }
    // no valid prefix or mention -> ignore
    if (!usedPrefix) return;
    // parse arguments
    const args = content.slice(usedPrefix.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    // Execute command if it exists
    const command = client.commands.get(cmd);
    if (command && command.execute) {
        try {
            await command.execute(msg, args, client);
        } catch (error) {
            console.error(error);
            msg.reply('There was an error executing that command!').catch(console.error);
        }
    }
});

// slash commands and button interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.executeInteraction) return;
        try {
            await command.executeInteraction(interaction, client);
        } catch (error) {
            console.error(error);
            if (!interaction.replied) await interaction.reply({ content: 'There was an error executing that command!', ephemeral: true });
        }
    } else if (interaction.isButton() && interaction.customId === 'unlock') {
        await interaction.deferUpdate();
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.followUp({ content: '⚠️ Error: I don\'t have the `Manage Roles` permission to unlock this channel.', ephemeral: true });
        }
        if (toggleableFeatures.adminMode && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.followUp({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', ephemeral: true });
        }
        if (!interaction.channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
            return interaction.followUp({ content: '❌ You must have the `Send Messages` permission to unlock this channel.', ephemeral: true });
        }
        const channel = interaction.channel;
        // resolve the locked user as a guild member
        const targetMember = await interaction.guild.members.fetch(P2);
        const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
        if (overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
            // unlock permissions for that user
            await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });
            // mention the user without pinging
            const userMention = `<@${interaction.user.id}>`;
            await interaction.followUp({
                content: `This channel has been unlocked by ${userMention}!`,
                allowedMentions: { users: [] }
            });
            
            // Remove the lock from the database if it exists
            try {
                await removeActiveLock(interaction.guild.id, channel.id);
                //console.log(`Removed lock for channel ${channel.id} in guild ${interaction.guild.id} via button interaction`);
            } catch (error) {
                console.error(`Error removing lock from database: ${error}`);
            }
        } else {
            await interaction.followUp({ content: 'This channel is already unlocked.', ephemeral: true });
        }
        // disable button
        const row = ActionRowBuilder.from(interaction.message.components[0]);
        row.components[0].setDisabled(true);
        await interaction.message.edit({ components: [row] });
    }
});

client.login(process.env.token);
