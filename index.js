const express = require('express');
const { Client, Intents } = require('discord.js');
const { Permissions } = require('discord.js');

const app = express();
const port = 3000;
const config = require('./config.json');
const token = config.token;
const prefix = config.prefix;
const BotID = config.BotID;
const BotRegexp = new RegExp(`<@!?${BotID}>`);

app.listen(port, () => console.log(`Bot's turning on......`));

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT,
    ],
});

client.on('ready', () => {
    console.log(`${client.user.tag} is on!`);

    client.user.setPresence({
        status: 'idle',
        activities: [
            {
                name: 'P2Lock',
                type: 'PLAYING',
            },
        ],
    });
});

// ping
client.on('message', msg => {
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
    const firstArg = msg.content.split(' ')[0];
    if (!BotRegexp.test(firstArg) && !msg.content.startsWith(prefix)) return;
    const pingUsed = BotRegexp.test(firstArg)
    let args = msg.content.toLowerCase().slice(pingUsed ? firstArg.length : prefix.length).trim().split(" ");
    let cmd = args.shift();

    if (cmd === "unlock" || cmd === "ul") {
        const userIdToAllow = "716390085896962058";

        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);
            const userPermissions = channel.permissionOverwrites.get(userIdToAllow);

            if (userPermissions) {
                await userPermissions.update({
                    VIEW_CHANNEL: true,
                    SEND_MESSAGES: true
                });
            } else {
                await channel.createOverwrite(userIdToAllow, {
                    VIEW_CHANNEL: true,
                    SEND_MESSAGES: true
                });
            }

            return msg.react('✅')
                .catch(error => console.error('Error sending unlock success message:', error));
        } catch (error) {
            console.error('Error in unlock command:', error);
            return msg.channel.send('An error occurred while unlocking the channel.')
                .catch(error => console.error('Error sending unlock error message:', error));
        }
    }
});

//react to unlock
let lockUserId = '716390085896962058'; // Declare lockUserId at the top

let lockMessageId;

// Reaction Add Event
client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === '🔓' && user.id !== client.user.id) {
        try {
            if (reaction.message.id === lockMessageId) {
                const userIdToAllow = "716390085896962058";
                const channel = reaction.message.guild.channels.cache.get(reaction.message.channel.id);

                const userPermissions = channel.permissionOverwrites.get(userIdToAllow);

                if (userPermissions) {
                    await userPermissions.update({
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true
                    });
                } else {
                    const targetUser = reaction.message.guild.members.cache.get(userIdToAllow);

                    if (!targetUser) {
                        return reaction.message.channel.send('User not found. Check if the bot is in your server.')
                            .catch(error => console.error('Error sending user not found message or reacting:', error));
                    }

                    await channel.createOverwrite(targetUser, {
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true
                    });
                }

                await reaction.message.channel.send('The channel has been unlocked.');
            }
        } catch (error) {
            console.error('Error in unlock command:', error);
            return reaction.message.channel.send('An error occurred while unlocking the channel.')
                .catch(error => console.error('Error sending unlock error message:', error));
        }
    }
});

// Message Event
client.on('message', async msg => {
    if (msg.author.id === '874910942490677270' &&
        ((msg.content.startsWith('**✨Shiny Hunt Pings:** ')) ||
            (msg.content.includes('**Rare Ping:** ') || msg.content.includes('**Regional Ping:** ')))) {

        try {
            const channel = msg.guild.channels.cache.get(msg.channel.id);

            const userPermissions = channel.permissionOverwrites.get(lockUserId);

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