const { Client, Intents, MessageEmbed, ReactionCollector } = require('discord.js');
const config = require('./config.json');
require('dotenv').config();
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const chunk = require('lodash.chunk');
const startTime = Date.now();

const token = process.env.token;
const prefix = config.prefix;
const P2 = "716390085896962058";
const Pname = '874910942490677270';
const embedColor = "#008080";

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT,
    ],
});

function getRuntime() {
    const currentTime = Date.now();
    const uptime = currentTime - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// status
client.on('ready', () => {
    client.user.setPresence({
        activity: { name: `${prefix}help | 🔒`, type: 'PLAYING' },
        status: 'idle'
    });

    BotID = client.user.id;
    BotRegexp = new RegExp(`<@!?${BotID}>`);

    console.log(`${client.user.tag} is online and ready!`);
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
        const commands = [
            { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
            { name: 'ping', description: `Displays the bot\'s latency.\n\`${prefix}ping\`` },
            { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock\` \`${prefix}l\`` },
            { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\` \`${prefix}u\`` },
            { name: 'pingafk', description: `[Pings the afk members using Poké-Name.](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk\` \`${prefix}pa\`` },
            { name: 'locklist', description: `Shows a list of all the locked channels in the server.\n\`${prefix}locklist\` \`${prefix}ll\`` },
        ];

        const embed = new MessageEmbed()
            .setTitle('Command List')
            .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
            .setDescription(`**Prefix:** \`${prefix}\` or <@!${BotID}>`)
            .setColor(embedColor)
            .setFooter(`Version: ${version} | Uptime: ${getRuntime()}`);

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
    const pingUsed = BotRegexp.test(firstArg);
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    if (cmd === "lock" || cmd === "l") {

        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);
            const userPermissions = channel.permissionOverwrites.get(P2);

            if (userPermissions && userPermissions.deny.has('VIEW_CHANNEL')) {
                return msg.channel.send('This channel is already locked.');
            }

            if (userPermissions) {
                await userPermissions.update({
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            } else {
                await channel.createOverwrite(P2, {
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            }

            const username = msg.author.username;

            const lockMessage = await msg.channel.send(`This channel has been locked by \`${username}\`. Click on 🔓 or type \`${prefix}unlock\` to unlock!`);
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

        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);
            const userPermissions = channel.permissionOverwrites.get(P2);

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
client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === '🔓' && user.id !== client.user.id) {
        try {
            const message = reaction.message;
            const messageId = message.id;

            if (message.author.bot && message.content.includes('This channel has been locked')) {
                const channel = message.guild.channels.cache.get(message.channel.id);

                const fetchedMessage = await channel.messages.fetch(messageId);

                const userPermissions = channel.permissionsFor(P2);

                if (userPermissions && !userPermissions.has(['VIEW_CHANNEL', 'SEND_MESSAGES'])) {
                    await channel.updateOverwrite(P2, {
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true
                    });

                    const username = user.username;
                    await fetchedMessage.channel.send(`This channel has been unlocked by \`${username}\`!`);
                } else {
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
        (msg.content.includes('**Rare Ping:** ') || msg.content.includes('**Regional Ping:** ') || msg.content.toLowerCase().includes('shiny hunt pings: ') || msg.content.includes('Rare ping: ') || msg.content.includes('Regional ping: ')))
    ) {
        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);

            const existingPermissions = channel.permissionOverwrites.get(P2);

            if (existingPermissions && existingPermissions.deny.has('VIEW_CHANNEL')) {
                return;
            }

            const userPermissions = existingPermissions || channel.permissionOverwrites.get(P2);

            if (userPermissions) {
                await userPermissions.update({
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            } else {
                const targetUser = msg.guild.members.cache.get(P2);

                if (!targetUser) {
                    return msg.channel.send('Bot not found. Check if the <@!716390085896962058> is in your server.')
                        .catch(error => console.error('Error sending user not found message or reacting:', error));
                }

                await channel.createOverwrite(targetUser, {
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            }

            const lockMessage = await msg.channel.send(`This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock!`);
            lockMessage.react('🔓');
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('Hmm, something prevented me from locking this channel.\nChannel may already be locked.')
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

    if (cmd === "locklist" || cmd === "ll") {
        try {
            const guildChannels = msg.guild.channels.cache;
            const lockedChannels = guildChannels.filter(channel => {
                const permissions = channel.permissionOverwrites.get(P2);
                return permissions && permissions.deny.has('VIEW_CHANNEL');
            }).array();

            if (lockedChannels.length === 0) {
                return msg.channel.send('There are no locked channels.');
            }
            lockedChannels.sort((a, b) => b.lastModifiedTimestamp - a.lastModifiedTimestamp);

            const paginatedChannels = chunk(lockedChannels, 20);

            const totalLockedChannels = lockedChannels.length;

            let currentPage = 0;
            const embed = new MessageEmbed()
                .setColor(embedColor)
                .setFooter(`Page ${currentPage + 1}/${paginatedChannels.length}  (${paginatedChannels[currentPage].length} on this page)`);

            const sendEmbed = async () => {
                embed.setTitle(`Locked Channels (${totalLockedChannels})`);

                const channelsGroup1 = paginatedChannels[currentPage].slice(0, 10);
                const channelsGroup2 = paginatedChannels[currentPage].slice(10, 20);

                const field1Value = channelsGroup1.length > 0 ? channelsGroup1.map(channel => `<#${channel.id}>`).join('\n') : '\u200b';
                const field2Value = channelsGroup2.length > 0 ? channelsGroup2.map(channel => `<#${channel.id}>`).join('\n') : '\u200b';

                if (channelsGroup1.length > 0) {
                    embed.addField('\u200b', field1Value, true);
                }

                if (channelsGroup2.length > 0) {
                    embed.addField('\u200b', field2Value, true);
                }

                const sentMessage = await msg.channel.send(embed);
                if (paginatedChannels.length > 1) {
                    await sentMessage.react('◀️');
                    await sentMessage.react('▶️');

                    const collector = sentMessage.createReactionCollector((reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && !user.bot, { time: 1000 * 60 * 2 });

                    collector.on('collect', async (reaction, user) => {
                        await reaction.users.remove(user);
                        if (reaction.emoji.name === '◀️') {
                            currentPage = (currentPage === 0) ? paginatedChannels.length - 1 : currentPage - 1;
                        } else if (reaction.emoji.name === '▶️') {
                            currentPage = (currentPage === paginatedChannels.length - 1) ? 0 : currentPage + 1;
                        }
                        embed.setFooter(`Page ${currentPage + 1}/${paginatedChannels.length}  (${paginatedChannels[currentPage].length} on this page)`);

                        const newChannelsGroup1 = paginatedChannels[currentPage].slice(0, 10);
                        const newChannelsGroup2 = paginatedChannels[currentPage].slice(10, 20);

                        const newField1Value = newChannelsGroup1.length > 0 ? newChannelsGroup1.map(channel => `<#${channel.id}>`).join('\n') : '\u200b';
                        const newField2Value = newChannelsGroup2.length > 0 ? newChannelsGroup2.map(channel => `<#${channel.id}>`).join('\n') : '\u200b';

                        embed.fields = [];
                        if (newChannelsGroup1.length > 0) {
                            embed.addField('\u200b', newField1Value, true);
                        }
                        if (newChannelsGroup2.length > 0) {
                            embed.addField('\u200b', newField2Value, true);
                        }

                        await sentMessage.edit(embed);
                    });

                    collector.on('end', () => {
                        sentMessage.reactions.removeAll().catch(console.error);
                    });
                }
            };

            sendEmbed();
        } catch (error) {
            console.error('Error in locklist command:', error);
            return msg.channel.send('Hmm, something went wrong while retrieving the locked channels.')
                .catch(error => console.error('Error sending locklist error message:', error));
        }
    }
});

// info
client.on('message', async msg => {
    try {
        if (msg.author.bot) return;
        const firstArg = msg.content.split(' ')[0];
        if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
        const pingUsed = BotRegexp.test(firstArg);
        let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
        let cmd = args.shift();
        
        if (cmd === "info" || cmd === "invite") {
            const user = msg.member.user;
            const embed = new MessageEmbed()
                .setTitle('Bot Info')
                .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
                .setDescription(`**Prefix:** \`${prefix}\` or <@!${BotID}>\nA Bot that automatically(or manually) locks your Shinyhunt, rares and regionals for you!`)
                .setColor(embedColor)
                .addFields(
                    { name: 'Bot Invite', value: '[Link](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)', inline: true },
                    { name: 'GitHub', value: '[Old](https://github.com/SurprisedMrSeal/P2Lock) , [New](https://github.com/)', inline: true },
                    { name: 'Support Server', value: '[Link](https://discord.gg/sFszcSvMAp)', inline: true },
                    { name: 'TOS', value: '[Link](https://p2lock.carrd.co/#tos)', inline: true },
                    { name: 'Privacy Policy', value: '[Link](https://p2lock.carrd.co/#privacy)', inline: true },
                )
                .setFooter(`Version: ${version} | Uptime: ${getRuntime()}`);
            return msg.channel.send(embed);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
});

client.login(token);