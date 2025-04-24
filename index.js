const { Client, GatewayIntentBits, Partials, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ActivityType } = require('discord.js');
const { connectToMongo, getPrefixForServer, loadToggleableFeatures } = require('./mongoUtils');
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