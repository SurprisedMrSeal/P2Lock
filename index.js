const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const chunk = require('lodash.chunk');

const token = config.token;
const prefix = config.prefix;
const BotID = config.BotID;
const BotRegexp = new RegExp(`<@!?${BotID}>`);

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT,
    ],
});

const commands = [
    { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
    { name: 'ping', description: `Checks the bot\'s latency.\n\`${prefix}ping\`` },
    { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock\` \`${prefix}l\`` },
    { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\` \`${prefix}u\`` },
    { name: 'pingafk', description: `[Pings the afk members (Poké-Name).](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk\` \`${prefix}pa\`` },
    { name: 'locklist', description: `Shows a list of locked channels.\n\`${prefix}locklist\` \`${prefix}ll\`` },
];

client.on('ready', () => {
    client.user.setPresence({
        activity: { name: `${prefix}help | ${version}`, type: 'PLAYING' },
        status: 'idle'
    });

    console.log(`${client.user.tag} is on!`);
});

// help
client.on('message', async msg => {
    if (msg.author.bot) return;
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg)
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();
    if (cmd === "help") {
        const user = msg.member.user;

        const embed = new MessageEmbed()
            .setTitle('Command List')
            .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
            .setDescription(`**Prefix:** \`${prefix}\` or <@!${BotID}>`)
            .setColor('#008080')
            .setFooter(`Version: ${version}`);

        commands.forEach(command => {
            embed.addField(`**${command.name}**`, command.description, false);
        });

        return msg.channel.send(embed);
    }
});

// ping
client.on('message', msg => {
  if (msg.author.bot) return;
  const firstArg = msg.content.split(' ')[0];
  if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
  const pingUsed = BotRegexp.test(firstArg)
  let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
  let cmd = args.shift();
  if (cmd == "ping") {
    const ping = msg.createdTimestamp - Date.now();
        return msg.channel.send(`🏓 **${Math.abs(ping)} ms**.`);
  }
});

// pingafk
client.on('message', async msg => {
    if (msg.author.bot) return;
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg);
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    if ((cmd === "pingafk" || cmd === "pa") && msg.reference) {
        const Pname = '874910942490677270';
        const referencedMessage = await msg.channel.messages.fetch(msg.reference.messageID).catch(console.error);

        if (referencedMessage && referencedMessage.content && referencedMessage.author.id === Pname) {
            const mentionedUsers = [];
            const userIdRegex = /(\d{17,19}) \(AFK\)/g;
            let match;

            const shinyHuntPingsSectionRegex = /\*\*✨Shiny Hunt Pings:\*\*([\s\S]*?)(?=(\*\*|$))/;
            const shinyHuntPingsSection = shinyHuntPingsSectionRegex.exec(referencedMessage.content);

            if (shinyHuntPingsSection && shinyHuntPingsSection[1]) {
                while ((match = userIdRegex.exec(shinyHuntPingsSection[1])) !== null) {
                    mentionedUsers.push(match[1]);
                }
            }

            const afkUsers = mentionedUsers
                .map(userId => `<@${userId}>`)
                .filter(userMention => !msg.content.includes(userMention));

            if (afkUsers.length > 0) {
                msg.channel.send(`Pinging AFK Hunters: ${afkUsers.join(' ')}`);
            } else {
                msg.channel.send('No AFK Hunters to ping.');
            }
        }
    }
});

// lock
client.on('message', async msg => {
    if (msg.author.bot) return;
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg)
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    if (cmd === "lock" || cmd === "l") {
        const userIdToDeny = "716390085896962058";

        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);
            const userPermissions = channel.permissionOverwrites.get(userIdToDeny);

            if (userPermissions) {
                await userPermissions.update({
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            } else {
                await channel.createOverwrite(userIdToDeny, {
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            }

            const lockMessage = await msg.channel.send('The channel has been locked. Click on 🔓 to unlock or type `' + prefix + 'unlock`.');
            await lockMessage.react('🔓');
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('Hmm, something prevented me from locking this channel.')
                .catch(error => console.error('Error sending lock error message:', error));
        }
    }
});

// unlock
client.on('message', async msg => {
    if (msg.author.bot) return;
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg);
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    if (cmd === "unlock" || cmd === "ul" || cmd === "u") {
        const userIdToAllow = "716390085896962058";

        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);
            const userPermissions = channel.permissionOverwrites.get(userIdToAllow);

            if (userPermissions && !userPermissions.allow.has(['VIEW_CHANNEL', 'SEND_MESSAGES'])) {
                await userPermissions.update({
                    VIEW_CHANNEL: true,
                    SEND_MESSAGES: true
                });

                const username = msg.author.username;

                const sentMessage = await msg.channel.send(`This channel has been unlocked by \`${username}\`!`);
            } else {
                return msg.channel.send('This channel is already unlocked.');
            }
        } catch (error) {
            console.error('Error in unlock command:', error);
            return msg.channel.send('Hmm, something prevented me from unlocking this channel.')
                .catch(error => console.error('Error sending unlock error message:', error));
        }
    }
});

// react to unlock
const lockUserId = '716390085896962058';

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === '🔓' && user.id !== client.user.id) {
        try {
            const message = reaction.message;
            const messageId = message.id;

            // Check if the reacted message is from the bot and contains lock message content
            if (message.author.bot && message.content.includes('The channel has been locked. Click on 🔓 to unlock or')) {
                const userIdToAllow = "716390085896962058";
                const channel = message.guild.channels.cache.get(message.channel.id);

                const fetchedMessage = await channel.messages.fetch(messageId);

                const userPermissions = channel.permissionsFor(userIdToAllow);

                // Check if the user has locked permissions and the channel is locked
                if (userPermissions && !userPermissions.has(['VIEW_CHANNEL', 'SEND_MESSAGES'])) {
                    // Update channel permissions to allow viewing and sending messages
                    await channel.updateOverwrite(userIdToAllow, {
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true
                    });

                    const username = user.username;
                    // Send a message indicating the channel has been unlocked
                    await fetchedMessage.channel.send(`This channel has been unlocked by \`${username}\`.`);
                } else {
                    // Send a message indicating the channel is already unlocked
                    await fetchedMessage.channel.send('This channel is already unlocked.');
                }
            }
        } catch (error) {
            console.error('Error in unlock command:', error);
            return message.channel.send('Hmm, something prevented me from unlocking this channel.')
                .catch(error => console.error('Error sending unlock error message:', error));
        }
    }
});

// shinyhunt/rare/regional autolock (Poké-Name and P2 Assistant)
client.on('message', async msg => {
    if (
        (msg.author.id === '874910942490677270' || msg.author.id === '854233015475109888') &&
        ((msg.content.startsWith('**✨Shiny Hunt Pings:** ')) ||
        (msg.content.includes('**Rare Ping:** ') || msg.content.includes('**Regional Ping:** ') || msg.content.includes('Shiny hunt pings: ') || msg.content.includes('Rare ping: ') || msg.content.includes('Regional ping: ')))
    ) {
        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);

            const existingPermissions = channel.permissionOverwrites.get(lockUserId);

            if (existingPermissions && existingPermissions.deny.has('VIEW_CHANNEL')) {
                return;
            }

            const userPermissions = existingPermissions || channel.permissionOverwrites.get(lockUserId);

            if (userPermissions) {
                await userPermissions.update({
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            } else {
                const targetUser = msg.guild.members.cache.get(lockUserId);

                if (!targetUser) {
                    return msg.channel.send('User not found. Check if the bot is in your server.')
                        .catch(error => console.error('Error sending user not found message or reacting:', error));
                }

                await channel.createOverwrite(targetUser, {
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            }

            const lockMessage = await msg.channel.send(`The channel has been locked. Click on 🔓 to unlock or type \`${prefix}unlock\`.`);
            lockMessage.react('🔓');
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('Hmm, something prevented me from locking this channel.')
                .catch(error => console.error('Error sending lock error message:', error));
        }
    }
});

// locklist
client.on('message', async msg => {
    if (msg.author.bot) return;
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg);
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    // Define the command and its alias
    if (cmd === "locklist" || cmd === "ll") {
        try {
            // Retrieve the guild's channels
            const guildChannels = msg.guild.channels.cache;
            // Filter the locked channels
            const lockedChannels = guildChannels.filter(channel => {
                const permissions = channel.permissionOverwrites.get(lockUserId);
                return permissions && permissions.deny.has('VIEW_CHANNEL');
            }).array();

            // Paginate the locked channels into chunks of 20
            const paginatedChannels = chunk(lockedChannels, 20);

            // Create and send an embed for each page
            for (let i = 0; i < paginatedChannels.length; i++) {
                const embed = new MessageEmbed()
                    .setTitle('Locked Channels')
                    .setDescription(`Page ${i + 1}/${paginatedChannels.length}`)
                    .setColor('#008080');

                paginatedChannels[i].forEach(channel => {
                    embed.addField(channel.name, `<#${channel.id}>`, true);
                });

                await msg.channel.send(embed);
            }
        } catch (error) {
            console.error('Error in locklist command:', error);
            return msg.channel.send('Hmm, something went wrong while retrieving the locked channels.')
                .catch(error => console.error('Error sending locklist error message:', error));
        }
    }
});

client.login(token);