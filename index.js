const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');
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
    { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\`` },
];

client.on('ready', () => {
    client.user.setPresence({
        activity: { name: `${prefix}help`, type: 'PLAYING' },
        status: 'idle'
    });

    console.log(`${client.user.tag} is on!`);
});

// help command
client.on('message', async msg => {
    if (msg.author.bot) return;
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg)
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" "); // We are going to assume the user keeps the space between the ping and the command
    let cmd = args.shift();
    if (cmd === "help") {
        const user = msg.member.user;

        const embed = new MessageEmbed()
            .setTitle('Command List')
            .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
            .setDescription(`**Prefix:** \`${prefix}\` or <@!${BotID}>`)
            .setColor('#008080');

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
  let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" "); // We are going to assume the user keeps the space between the ping and the command
  let cmd = args.shift();
  if (cmd == "ping") {
    const ping = msg.createdTimestamp - Date.now();
        return msg.channel.send(`🏓 **${Math.abs(ping)} ms**.`);
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

            return msg.react('✅')
                .catch(error => console.error('Error sending lock success message:', error));
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('An error occurred while locking the channel.')
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

    if (cmd === "unlock" || cmd === "ul") {
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

                const sentMessage = await msg.channel.send(`The channel has been unlocked by \`@${username}\`.`);
            } else {
                return msg.channel.send('The channel is already unlocked.');
            }
        } catch (error) {
            console.error('Error in unlock command:', error);
            return msg.channel.send('An error occurred while unlocking the channel.')
                .catch(error => console.error('Error sending unlock error message:', error));
        }
    }
});

//react to unlock
let lockUserId = '716390085896962058';
let lockMessageId;

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === '🔓' && user.id !== client.user.id) {
        try {
            if (reaction.message.id === lockMessageId) {
                const userIdToAllow = "716390085896962058";
                const channel = reaction.message.guild.channels.cache.get(reaction.message.channel.id);

                const userPermissions = channel.permissionsFor(userIdToAllow);

                if (userPermissions && !userPermissions.has(['VIEW_CHANNEL', 'SEND_MESSAGES'])) {
                    await channel.updateOverwrite(userIdToAllow, {
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true
                    });

                    const username = user.username;
                    await reaction.message.channel.send(`The channel has been unlocked by \`@${username}\`.`);
                } else {
                    await reaction.message.channel.send('The channel is already unlocked.');
                }
            }
        } catch (error) {
            console.error('Error in unlock command:', error);
            return reaction.message.channel.send('An error occurred while unlocking the channel.')
                .catch(error => console.error('Error sending unlock error message:', error));
        }
    }
});

// Rare/Regional/SH Hunt on Poke-Name and P2 Assistant
client.on('message', async msg => {
    if (
        (msg.author.id === '874910942490677270' || msg.author.id === '854233015475109888') &&
        ((msg.content.startsWith('**✨Shiny Hunt Pings:** ')) ||
        (msg.content.includes('**Rare Ping:** ') || msg.content.includes('**Regional Ping:** ') || msg.content.includes('Shiny hunt pings: ')))
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
            lockMessageId = lockMessage.id;
        } catch (error) {
            console.error('Error in lock command:', error);
            return msg.channel.send('An error occurred while locking the channel.')
                .catch(error => console.error('Error sending lock error message:', error));
        }
    }
});

client.login(token);