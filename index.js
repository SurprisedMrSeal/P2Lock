//v2.5.7
const { Client, GatewayIntentBits, Partials, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ActivityType, MessageFlags } = require('discord.js');
const { connectToMongo, getPrefixForServer, loadToggleableFeatures, getActiveLocks, removeActiveLock, getTimer } = require('./mongoUtils');
const { P2, version } = require('./utils');
require('dotenv').config();
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
const slashCommands = [];
const commands = new Map();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases) command.aliases.forEach(alias => client.commands.set(alias, command));
    }
    if (command.data) slashCommands.push(command.data.toJSON());
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Connect to MongoDB
connectToMongo();

// Ready Event
client.on('ready', async () => {
    try {
        client.user.setPresence({
            activities: [{ name: `@P2Lock help | 🔒`, type: ActivityType.Playing }],
            status: 'idle'
        });

        global.BotID = client.user.id;

        const rest = new REST({ version: '10' }).setToken(process.env.token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('Successfully registered global slash commands.');

        global.BotRegexp = new RegExp(`<@!?${global.BotID}>`);

        console.log(`${client.user.tag} v${version} is online and ready!`);

        // Process any active locks
        const activeLocks = await getActiveLocks(global.BotID);
        if (activeLocks.length === 0) {
            console.log('No active locks found');
            return;
        }

        console.log(`Found ${activeLocks.length} active locks to process`);

        for (const lock of activeLocks) {
            try {
                const guild = client.guilds.cache.get(lock.guildId);
                if (!guild) {
                    await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                    continue;
                }

                const channel = guild.channels.cache.get(lock.channelId);
                if (!channel) {
                    await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                    continue;
                }

                if (P2) {
                    try {
                        const overwrite = channel.permissionOverwrites.cache.get(P2);
                        if (overwrite) {
                            const deniedView = overwrite.deny.has(PermissionFlagsBits.ViewChannel);
                            const deniedSend = overwrite.deny.has(PermissionFlagsBits.SendMessages);
                            if (!deniedView && !deniedSend) {
                                await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                                continue;
                            }
                        } else {
                            // No overwrite, check effective permissions
                            const permissions = channel.permissionsFor(P2);
                            if (permissions && permissions.has(PermissionFlagsBits.ViewChannel) && permissions.has(PermissionFlagsBits.SendMessages)) {
                                await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                                continue;
                            }
                        }

                    } catch (error) {
                        console.error(`Error checking permissions for P2 in ${channel.id}:`, error);
                        await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                        continue;
                    }
                }

                const now = Math.floor(Date.now() / 1000);
                const unlockTime = lock.unlockTime;

                if (now >= unlockTime) {
                    const targetMember = await guild.members.fetch(P2).catch(() => null);
                    const timerMinutes = await getTimer(guild.id);
                    if (targetMember) {
                        const overwrite = channel.permissionOverwrites.cache.get(P2);
                        if (overwrite && (overwrite.deny.has(PermissionFlagsBits.ViewChannel) || overwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                            await channel.permissionOverwrites.delete(P2);
                            await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);
                        }
                    }
                    await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                } else {
                    const remainingTime = (unlockTime - now) * 1000;
                    setTimeout(async () => {
                        try {
                            const targetMember = await guild.members.fetch(P2).catch(() => null);
                            if (!targetMember) {
                                await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                                return;
                            }

                            const overwrite = channel.permissionOverwrites.cache.get(P2);
                            if (!overwrite || (!overwrite.deny.has(PermissionFlagsBits.ViewChannel) && !overwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                                await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                                return;
                            }

                            await channel.permissionOverwrites.delete(P2);
                            const timerMinutes = Math.round((unlockTime - lock.lockTime) / 60);
                            await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);
                            await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                        } catch (error) {
                            console.error('Error in scheduled unlock:', error);
                            await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
                        }
                    }, remainingTime);
                }
            } catch (error) {
                console.error(`Error processing lock for channel ${lock.channelId}:`, error);
                await removeActiveLock(lock.guildId, lock.botId, lock.channelId);
            }
        }
    } catch (error) {
        console.error('Error during bot startup:', error);
    }
});

// Prefix commands

const cooldowns = new Map();
const COOLDOWN_TIME = 1.5 * 1000;

async function handlePrefixCommand(msg) {
    if (msg.author.bot || !msg.guild) return;

    try {
        const prefix = await getPrefixForServer(msg.guild.id);
        const content = msg.content.trim();
        let usedPrefix = null;

        if (prefix && content.startsWith(prefix)) {
            usedPrefix = prefix;
        }

        if (!usedPrefix) {
            const mentionMatch = content.match(/^<@!?(\d+)>/);
            if (mentionMatch && mentionMatch[1] === client.user.id) {
                usedPrefix = mentionMatch[0];
            }
        }

        if (!usedPrefix) return;

        const args = content.slice(usedPrefix.length).trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();
        if (!cmd) return;
        const command = client.commands.get(cmd);
        if (command && command.execute) {

            const now = Date.now();
            const cooldownKey = `${msg.guild.id}-${msg.author.id}`;

            if (cooldowns.has(cooldownKey)) {
                const expiration = cooldowns.get(cooldownKey);
                if (now < expiration) {
                    const remaining = ((expiration - now) / 1000).toFixed(1);
                    return msg.react('🕜').catch(() => {});
                }
            }

            cooldowns.set(cooldownKey, now + COOLDOWN_TIME);
            setTimeout(() => cooldowns.delete(cooldownKey), COOLDOWN_TIME);

            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages) ||
                !msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.ViewChannel)) {
                msg.react('🤐');
                msg.author.send('⚠️ I need the `Send Messages` and `View Channel` permissions to run this command! 🤐')
                    .catch(() => { });
                return;
            }

            await command.execute(msg, args, client);
        }
    } catch (error) {
        console.error('Error handling prefix command:', error);
        if (msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) {
            msg.reply('⚠️ Hmm, something prevented me from executing this command, try again later.').catch(console.error);
        }
    }
}

const recentMessages = new Map();

client.on('messageCreate', async msg => {
    if (msg.author.bot || !msg.guild) return;

    recentMessages.set(msg.id, Date.now());
    setTimeout(() => recentMessages.delete(msg.id), 10 * 1000);

    await handlePrefixCommand(msg);
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    if (!recentMessages.has(newMsg.id)) return;

    await handlePrefixCommand(newMsg);
});

// Slash commands and button interactions
client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages) ||
            !interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.ViewChannel))
            return interaction.reply({ content: "⚠️ I need the `Send Messages` and `View Channel` permissions to run this command! 🤐", flags: MessageFlags.Ephemeral });

        if (!interaction.inGuild())
            return interaction.reply({ content: '⚠️ This command cannot be run inside DMs :(' });
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.executeInteraction) return;
            await command.executeInteraction(interaction, client);

        } else if (interaction.isButton()) {
            if (interaction.customId === 'unlock') {
                await handleUnlockButton(interaction);
            } else if (interaction.customId.startsWith('timer_')) {
                await handleTimerButton(interaction);
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '⚠️ Hmm, something went wrong handling your interaction.', flags: MessageFlags.Ephemeral }).catch(console.error);
        }
    }
});

async function handleUnlockButton(interaction) {
    await interaction.deferUpdate().catch(console.error);

    try {
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.followUp({ content: '⚠️ Error: I don\'t have the `Manage Roles` permission to unlock this channel.', flags: MessageFlags.Ephemeral });
        }

        if (toggleableFeatures.adminMode &&
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.followUp({ content: '❌ You must have the `Manage Server` or `Administrator` permission to use this.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
            return interaction.followUp({ content: '❌ You need `Send Messages` permission to unlock this channel.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.channel;
        const targetMember = await interaction.guild.members.fetch(P2).catch(() => null);

        if (!targetMember) {
            return interaction.followUp({ content: `⚠️ Could not find <@${P2}> to unlock.`, flags: MessageFlags.Ephemeral });
        }

        const overwrite = channel.permissionOverwrites.cache.get(P2);
        if (overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
            await removeActiveLock(interaction.guild.id, global.BotID, channel.id);

nRowBuilder.from(interaction.message.components[0]);
            row.components[0].setDisabled(true);
            await interaction.message.edit({ components: [row] });
        } else {
            await interaction.followUp({ content: 'This channel is already unlocked.', flags: MessageFlags.Ephemeral });
            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[0].setDisabled(true);
            await interaction.message.edit({ components: [row] });
        }
    } catch (error) {
        console.error('Error handling unlock button:', error);
    }
}

client.login(process.env.token);