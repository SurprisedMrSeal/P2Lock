const { Client, Intents, MessageEmbed, ReactionCollector } = require('discord.js');
const { connectToMongo, getPrefixForServer, updatePrefixForServer, saveToggleableFeatures, loadToggleableFeatures, getDefaultToggleableFeatures, saveBlacklistedChannels, loadBlacklistedChannels } = require('./mongoUtils');
require('dotenv').config();
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const chunk = require('lodash.chunk');
const startTime = Date.now();

const P2 = "716390085896962058";
const Pname = "874910942490677270";
const P2a = "854233015475109888";
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
        activity: { name: `@P2Lock help | 🔒`, type: 'PLAYING' },
        status: 'idle'
    });

    BotID = client.user.id;
    BotRegexp = new RegExp(`<@!?${BotID}>`);

    console.log(`${client.user.tag} is online and ready!`);
});

// ## prefix commands ## //
client.on('message', async msg => {
    if (msg.author.bot) return;
    if (msg.channel.type === 'dm') return;
    const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
    const prefix = await getPrefixForServer(msg.guild.id);
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg)
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

// help
    if (cmd === "help") {
        const user = msg.member.user;

        const commands = [
            { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
            { name: 'ping', description: `Displays the bot\'s latency.\n\`${prefix}ping\`` },
            { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock\` \`${prefix}l\`` },
            { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\` \`${prefix}u\`` },
            { name: 'pingafk', description: `[Pings the afk members using Poké-Name.](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk\` \`${prefix}pa\`` },
            { name: 'locklist', description: `Shows a list of all the locked channels in the server.\n\`${prefix}locklist\` \`${prefix}ll\`` },
            { name: 'prefix', description: `Shows the current prefix and can be used to change it too.\n\`${prefix}prefix <>\`` },
            { name: 'toggle', description: `Lets you toggle specific settings.\n\`${prefix}toggle <>\`` },
            { name: 'info', description: `Gives you some information about the Bot.\n\`${prefix}info\`` },
            { name: 'blacklist', description: `Lets you blacklist channels from getting automatically locked.\n\`${prefix}blacklist <>\` \`${prefix}bl <>\`` },
        ];

        const itemsPerPage = 6;
        const totalPages = Math.ceil(commands.length / itemsPerPage);

        const embed = new MessageEmbed()
            .setTitle('Command List')
            .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
            .setDescription(`\`<>\` Indicates optional argument.`)
            .setColor(embedColor)
            .setFooter(`Version: ${version} | Uptime: ${getRuntime()}`);

        let page = 1;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = page * itemsPerPage;
        const pageCommands = commands.slice(startIndex, endIndex);

        pageCommands.forEach(command => {
            embed.addField(`**${command.name}**`, command.description, false);
        });

        embed.setFooter(`Page ${page}/${totalPages} | ${getRuntime()}`);

        const sentMessage = await msg.channel.send(embed);

        if (totalPages > 1) {
            await sentMessage.react('◀️');
            await sentMessage.react('▶️');

            const collector = sentMessage.createReactionCollector((reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && !user.bot, { time: 1000 * 60 * 2 });

            collector.on('collect', async (reaction, user) => {
                await reaction.users.remove(user);

                if (reaction.emoji.name === '◀️') {
                    page = page > 1 ? page - 1 : totalPages;
                } else if (reaction.emoji.name === '▶️') {
                    page = page < totalPages ? page + 1 : 1;
                }

                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = page * itemsPerPage;
                const pageCommands = commands.slice(startIndex, endIndex);

                embed.fields = [];
                pageCommands.forEach(command => {
                    embed.addField(`**${command.name}**`, command.description, false);
                });

                embed.setFooter(`Page ${page}/${totalPages} | ${getRuntime()}`);
                await sentMessage.edit(embed);
            });

            collector.on('end', () => {
                sentMessage.reactions.removeAll().catch(console.error);
            });
        }
    }
// prefix
    if (cmd === "prefix") {
        if (!msg.member.hasPermission('MANAGE_GUILD') && !msg.member.hasPermission('ADMINISTRATOR')) {
            return msg.channel.send('You must have the `Manage Server` permission or `Administrator` to use this command.');
        }
        if (args.length !== 1) {
            return msg.channel.send(`Current prefix: \`${prefix}\`\nUse \`${prefix}prefix <new_prefix>\` to change it.`);
        }

        const newPrefix = args[0];
        updatePrefixForServer(msg.guild.id, newPrefix)
            .then(() => {
                msg.channel.send(`Prefix updated to \`${newPrefix}\``);
            })
            .catch(error => {
                console.error('Error updating prefix:', error);
                msg.channel.send('An error occurred while updating the prefix.');
            });
    }
// ping
    if (cmd == "ping") {
        const ping = msg.createdTimestamp - Date.now();
        return msg.channel.send(`🏓 **${Math.abs(ping)} ms**.`);
    }
// pingafk
    if (cmd === "pingafk" || cmd === "pa") {
        if (!msg.reference) {
            msg.channel.send(`Please reply to a message from <@${Pname}> or <@${P2a}>.`);
            return;
        }
        if (!toggleableFeatures.pingAfk) {
            msg.channel.send(`This command is disabled. Please ask your server's staff if you feel it's wrong.`);
            return;
        }
        const referencedMessage = await msg.channel.messages.fetch(msg.reference.messageID).catch(console.error);
        //Pname
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
        //P2a
        else if (referencedMessage && referencedMessage.content && referencedMessage.author.id === P2a) {
            const mentionedUsers = [];
            const userIdRegex = /(\d{17,19}) \(AFK\)/g;
            let match;

            const shinyHuntPingsSectionRegex = /Shiny hunt pings:([\s\S]*?)(?=(Collection|Type|Quest|$))/i;
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
// lock
    if (cmd === "lock" || cmd === "l") {
        if (toggleableFeatures.adminMode && !msg.member.hasPermission('MANAGE_GUILD') && !msg.member.hasPermission('ADMINISTRATOR')) {
            return msg.channel.send('You must have the `Manage Server` permission or `Administrator` to use this command.');
        }
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

            if (toggleableFeatures.adminMode) {
                await msg.channel.send(`This channel has been locked. Ask an admin to unlock this channel.`);
            } else {
                const lockMessage = await msg.channel.send(`This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock!`);
                lockMessage.react('🔓');
            }
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('Hmm, something prevented me from locking this channel.')
                .catch(error => console.error('Error sending lock error message:', error));
        }
    }
// unlock
    if (cmd === "unlock" || cmd === "ul" || cmd === "u") {
        if (toggleableFeatures.adminMode && !msg.member.hasPermission('MANAGE_GUILD') && !msg.member.hasPermission('ADMINISTRATOR')) {
            return msg.channel.send('You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

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
// locklist
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
// info
    if (cmd === "info" || cmd === "invite") {
        const user = msg.member.user;
        const embed = new MessageEmbed()
            .setTitle('Bot Info')
            .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
            .setDescription(`**Prefix:** \`${prefix}\` or <@!${BotID}>\nA Bot that automatically (or manually) locks your Shinyhunt, rares and regionals for you!`)
            .setColor(embedColor)
            .addFields(
                { name: 'Bot Invite', value: '[Link](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)', inline: true },
                { name: 'GitHub', value: '[Old](https://github.com/SurprisedMrSeal/P2Lock) , [New](https://github.com/SurprisedMrSeal/P2Lock/tree/with-DB)', inline: true },
                { name: 'Support Server', value: '[Link](https://discord.gg/sFszcSvMAp)', inline: true },
                { name: 'TOS', value: '[Link](https://p2lock.carrd.co/#tos)', inline: true },
                { name: 'Privacy Policy', value: '[Link](https://p2lock.carrd.co/#privacy)', inline: true },
            )
            .setFooter(`Version: ${version} | Uptime: ${getRuntime()}`);
        return msg.channel.send(embed);
    }
// blacklist
    if (cmd === "blacklist" || cmd === "bl") {
        if (!msg.member.hasPermission('MANAGE_GUILD') && !msg.member.hasPermission('ADMINISTRATOR')) {
            return msg.channel.send('You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        const channels = [];

        if (args[0] === 'clear' || args[0] === 'c') {
            await saveBlacklistedChannels(msg.guild.id, channels);

            return msg.channel.send('All blacklisted channels have been cleared.');
        }

        if (args[0] === 'list' || args[0] === 'l') {
            const blacklistedChannels = await loadBlacklistedChannels(msg.guild.id);

            const embed = new MessageEmbed()
                .setColor(embedColor)
                .setTitle('Blacklisted Channels')
                .setDescription('The following channels are currently blacklisted:')
                .setFooter(`Run "${prefix}blacklist clear" to clear all the blacklisted channels. `)
                .addField('\u200b', '\u200b' + blacklistedChannels.map(channelId => `<#${channelId}>`).join('\n'));

            return msg.channel.send(embed);
        }

        if (args.length === 0) {
            const blacklistedChannels = await loadBlacklistedChannels(msg.guild.id);

            const embed = new MessageEmbed()
                .setColor(embedColor)
                .setTitle('Blacklisted Channels')
                .setDescription('The following channels are currently blacklisted:')
                .setFooter(`Run "${prefix}blacklist clear" to clear all the blacklisted channels. `)
                .addField('\u200b', '\u200b' + blacklistedChannels.map(channelId => `<#${channelId}>`).join('\n'));

            return msg.channel.send(embed);
        }

        for (const arg of args) {
            const channel = msg.guild.channels.cache.get(arg.replace(/[<#>]/g, ''));
            
            if (channel) {
                channels.push(channel.id);
            }
        }

        await saveBlacklistedChannels(msg.guild.id, channels);

        const embed = new MessageEmbed()
            .setColor(embedColor)
            .setTitle('Blacklisted Channels')
            .setDescription('The following channels are blacklisted now.')
            .setFooter(`Run "${prefix}blacklist clear" to clear all the blacklisted channels. `)
            .addField('\u200b', '\u200b' + channels.map(channelId => `<#${channelId}>`).join('\n'));

        msg.channel.send(embed);
    }
});

// shinyhunt/rare/regional autolock (Poké-Name and P2 Assistant) //
client.on('message', async msg => {
    if (msg.channel.type === 'dm') return;
    const prefix = await getPrefixForServer(msg.guild.id);
    const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
    const blacklistedChannels = await loadBlacklistedChannels(msg.guild.id);
    if (blacklistedChannels.includes(msg.channel.id)) return;
    if ((msg.author.id === Pname || msg.author.id === P2a) &&
        (
            (toggleableFeatures.includeShinyHuntPings && (msg.content.startsWith('**✨Shiny Hunt Pings:** ') || msg.content.includes('Shiny hunt pings: '))) ||
            (toggleableFeatures.includeRarePings && (msg.content.includes('**Rare Ping:** ') || msg.content.includes('Rare ping: '))) ||
            (toggleableFeatures.includeRegionalPings && (msg.content.includes('**Regional Ping:** ') || msg.content.includes('Regional ping: '))) ||
            (toggleableFeatures.includeCollectionPings && (msg.content.includes('**Collection Pings:** ') || msg.content.includes('Collection pings: '))) ||
            (toggleableFeatures.includeQuestPings && (msg.content.includes('**Quest Pings:** ') || msg.content.includes('Quest pings: '))) ||
            (toggleableFeatures.includeTypePings && msg.content.includes('Type pings: '))
        )
    )
    {
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
                    return msg.channel.send('Bot not found. Check if <@!716390085896962058> is in your server.')
                        .catch(error => console.error('Error sending user not found message or reacting:', error));
                }

                await channel.createOverwrite(targetUser, {
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false
                });
            }

            if (toggleableFeatures.adminMode) {
                await msg.channel.send(`This channel has been locked. Ask an admin to unlock this channel.`);
            } else {
                const lockMessage = await msg.channel.send(`This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock!`);
                lockMessage.react('🔓');
            }
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('Hmm, something prevented me from locking this channel.\nChannel may already be locked.')
                .catch(error => console.error('Error sending lock error message:', error));
        }
    }
// autopin
    if (msg.author.id === P2 && msg.content.startsWith("Congratulations ") && msg.content.includes("These colors seem unusual")) {
        if (!toggleableFeatures.autoPin) return;
            msg.react("<:tada_008080:1234911189268693002>")
              .then(() => {
                msg.pin()
                  .catch(error => console.error('Error pinning message:', error));
              })
              .catch(error => console.error('Error reacting with celebration emoji:', error));
    }
});

// toggle stuff //
client.on('message', async msg => {
    if (msg.author.bot) return;
    if (msg.channel.type === 'dm') return;
    const firstArg = msg.content.split(' ')[0];
    const prefix = await getPrefixForServer(msg.guild.id);
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg)
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    let toggleableFeatures = await loadToggleableFeatures(msg.guild.id);

    if (cmd === 'toggle') {
        if (!msg.member.hasPermission('MANAGE_GUILD') && !msg.member.hasPermission('ADMINISTRATOR')) {
            return msg.channel.send('You must have the `Manage Server` permission or `Administrator` to use this command.');
        }
        const toggleType = args[0] ? args[0].toLowerCase() : null;

        switch ((toggleType || '').toLowerCase()) {
            case 'shiny':
            case 'shiny lock':
            case 'sh':
                toggleableFeatures.includeShinyHuntPings = !toggleableFeatures.includeShinyHuntPings;
                msg.channel.send(`**Shiny Hunt Lock** toggled ${toggleableFeatures.includeShinyHuntPings ? 'on' : 'off'}.`);
                break;
            case 'rare':
            case 'rare lock':
            case 'r':
                toggleableFeatures.includeRarePings = !toggleableFeatures.includeRarePings;
                msg.channel.send(`**Rare Lock** toggled ${toggleableFeatures.includeRarePings ? 'on' : 'off'}.`);
                break;
            case 'regional':
            case 'regional lock':
            case 're':
                toggleableFeatures.includeRegionalPings = !toggleableFeatures.includeRegionalPings;
                msg.channel.send(`**Regional Lock** toggled ${toggleableFeatures.includeRegionalPings ? 'on' : 'off'}.`);
                break;
            case 'collection':
            case 'collection lock':
            case 'col':
            case 'cl':
                toggleableFeatures.includeCollectionPings = !toggleableFeatures.includeCollectionPings;
                msg.channel.send(`**Collection Lock** toggled ${toggleableFeatures.includeCollectionPings ? 'on' : 'off'}.`);
                break;
            case 'quest':
            case 'quest lock':
            case 'q':
                toggleableFeatures.includeQuestPings = !toggleableFeatures.includeQuestPings;
                msg.channel.send(`**Quest Lock**  toggled ${toggleableFeatures.includeQuestPings ? 'on' : 'off'}.`);
                break;
            case 'type':
            case 'type lock':
            case 't':
                toggleableFeatures.includeTypePings = !toggleableFeatures.includeTypePings;
                msg.channel.send(`**Type Lock** toggled ${toggleableFeatures.includeTypePings ? 'on' : 'off'}.`);
                break;
            case 'pingafk':
            case 'pa':
                toggleableFeatures.pingAfk = !toggleableFeatures.pingAfk;
                msg.channel.send(`**PingAfk** toggled ${toggleableFeatures.pingAfk ? 'on' : 'off'}.`);
                break;
            case 'autopin':
            case 'pin':
                toggleableFeatures.autoPin = !toggleableFeatures.autoPin;
                msg.channel.send(`**AutoPin** toggled ${toggleableFeatures.autoPin ? 'on' : 'off'}.`);
                break;
            case 'adminmode':
            case 'admin':
                toggleableFeatures.adminMode = !toggleableFeatures.adminMode;
                msg.channel.send(`**AdminMode** toggled ${toggleableFeatures.adminMode ? 'on' : 'off'}.`);
                break;
            default:
                if (args.length === 0) {
                    const featureDisplayName = {
                        includeShinyHuntPings: 'Shiny Lock\n`Toggle whether it locks for Shinyhunts.`',
                        includeRarePings: 'Rare Lock\n`Toggle whether it locks for Rares.`',
                        includeRegionalPings: 'Regional Lock\n`Toggle whether it locks for Regionals.`',
                        includeCollectionPings: 'Collection Lock\n`Toggle whether it locks for Collections.`',
                        includeQuestPings: 'Quest Lock\n`Toggle whether it locks for Quests.`',
                        includeTypePings: 'Type Lock\n`Toggle whether it locks for Types.`',
                        pingAfk: 'PingAfk\n`Toggle to enable/disable the module.`',
                        autoPin: 'AutoPin\n`Toggle to enable/disable the module.`',
                        adminMode: 'AdminMode\n`Toggle whether the lock/unlock commands are admin only.`'
                    };

                    const embed = new MessageEmbed()
                        .setColor(embedColor)
                        .setTitle('Toggleable Locks')
                        .setFooter(`Run ${prefix}toggle <setting>`);

                        for (const featureName in featureDisplayName) {
                            const displayName = featureDisplayName[featureName];
                            const featureState = toggleableFeatures[featureName] ? 'On' : 'Off';
                            embed.addField(displayName, featureState);
                        }

                    msg.channel.send(embed);
                } else {
                    msg.channel.send(`Invalid toggle option. Please use \`${prefix}toggle\` followed by a valid option.`);
                }
                break;
        }

        await saveToggleableFeatures(msg.guild.id, toggleableFeatures);
    }
});

// react to unlock //
client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.message.channel.type === 'dm') return;
    if (reaction.emoji.name === '🔓' && user.id !== client.user.id && !user.bot) {
        try {
            const message = reaction.message;
            const messageId = message.id;

            if (message.author.bot && message.content.startsWith('This channel has been locked. Click ')) {
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

client.login(process.env.token);