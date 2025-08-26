module.exports = { ver: '2.11.1' };

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { loadToggleableFeatures, removeActiveLock } = require('../mongoUtils');
const { P2, Seal } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder().setName('unlock').setDescription('Unlocks the current channel.').addStringOption(opt =>
        opt.setName('channel')
            .setDescription('Unlock a specific channel.')
            .setRequired(false)
    ),
    name: 'unlock',
    aliases: ['ul', 'u'],
    async execute(msg, args, client) {
        try {
            const member = await msg.guild.members.fetch(P2);
            if (!member) {
                return msg.reply({
                    content: `⚠️ Error: Failed to fetch ${P2}. Please try again later.`
                });
            }
        } catch (err) {
            return msg.reply({
                content: `⚠️ Error: <@${P2}> is not in the server. Please add the bot to unlock the channel!`
            });
        }

        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);

        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return msg.channel.send('⚠️ Error: I don\'t have the `Manage Permissions` permission to unlock this channel.');
        }
        if (toggleableFeatures.adminMode && !msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        try {
            let channel = msg.channel; // default

            if (args[0]) {
                // Try to resolve channel by mention or ID
                const mentionMatch = args[0].match(/^<#(\d+)>$/);
                if (mentionMatch) {
                    channel = msg.guild.channels.cache.get(mentionMatch[1]);
                } else {
                    // Try by ID directly
                    channel = msg.guild.channels.cache.get(args[0])
                        || msg.guild.channels.cache.find(c => c.name.toLowerCase() === args.join(" ").toLowerCase());
                }

                if (!channel) {
                    return msg.reply("⚠️ Couldn't find that channel.");
                }

                if (!channel.permissionsFor(msg.author).has(PermissionFlagsBits.SendMessages) ||
                    !channel.permissionsFor(msg.author).has(PermissionFlagsBits.ViewChannel)) {
                    return msg.reply({ content: `❌ You need \`Send Messages\` permission in ${channel} to unlock.` });
                }

                if (channel.type === ChannelType.GuildCategory) {
                    if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id != Seal) {
                        return msg.reply('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                    }
                    await msg.reply({ content: "Category detected, unlocking the entire category...", allowedMentions: { users: [] } });

                    const targetMember = await msg.guild.members.fetch(P2);

                    await channel.permissionOverwrites.edit(targetMember, { ViewChannel: true, SendMessages: true });

                    for (const child of channel.children.cache.values()) {
                        await child.lockPermissions();
                    }

                    return msg.channel.send(`Category **${channel.name}** has been unlocked.`);
                }
            }

            const targetMember = await msg.guild.members.fetch(P2);
            const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);

            if (overwrite && !overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                await msg.channel.send('This channel is already unlocked.');
                try {
                    await removeActiveLock(msg.guild.id, client.user.id, channel.id);
                } catch (error) {
                    console.error(`Error removing lock from database: ${error}`);
                }
                return;
            }
            // unlock logic
            await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });

            // unlock message
            const userMention = `<@${msg.author.id}>`;
            await channel.send({
                content: `This channel has been unlocked by ${userMention}!`,
                allowedMentions: { users: [] }
            });

            if (channel != msg.channel) {
                await msg.reply({ content: `Unlocked ${channel}.`, allowedMentions: { users: [] } });
            }

            // database removal
            try {
                await removeActiveLock(msg.guild.id, client.user.id, channel.id);
            } catch (error) {
                console.error(`Error removing lock from database: ${error}`);
            }

            return;

        } catch (error) {
            console.error('(Unlock) Error in unlock command:', error);
            return msg.channel.send('⚠️ Hmm, something prevented me from unlocking this channel.')
                .catch(err => console.error('(Unlock) Error sending unlock error message:', err));
        }
    },
    async executeInteraction(interaction, client) {
        await interaction.deferReply();
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);
        try {
            const member = await interaction.guild.members.fetch(P2);
            if (!member) {
                return interaction.reply({
                    content: `⚠️ Error: Failed to fetch ${P2}. Please try again later.`, flags: MessageFlags.Ephemeral
                });
            }
        } catch (err) {
            return interaction.reply({
                content: `⚠️ Error: <@${P2}> is not in the server. Please add the bot to unlock the channel!`, flags: MessageFlags.Ephemeral
            });
        }
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '⚠️ I\'m missing the `Manage Permissions` permission to unlock this channel.', flags: MessageFlags.Ephemeral });
        }
        if (toggleableFeatures.adminMode && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
        }
        try {
            let channel = interaction.channel;

            const arg = interaction.options.getString('channel');
            if (arg) {
                // Try mention
                const mentionMatch = arg.match(/^<#(\d+)>$/);
                if (mentionMatch) {
                    channel = interaction.guild.channels.cache.get(mentionMatch[1]);
                } else {
                    // Try ID or name
                    channel = interaction.guild.channels.cache.get(arg)
                        || interaction.guild.channels.cache.find(c => c.name.toLowerCase() === arg.toLowerCase());
                }

                if (!channel) {
                    return interaction.editReply({ content: "⚠️ Couldn't find that channel.", flags: MessageFlags.Ephemeral });
                }

                if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages) ||
                    !channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ViewChannel)) {
                    return interaction.followUp({ content: `❌ You need \`Send Messages\` permission in ${channel} to unlock.`, flags: MessageFlags.Ephemeral });
                }

                if (channel.type === ChannelType.GuildCategory) {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return interaction.editReply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.' });
                    }
                    await interaction.editReply({ content: "Category detected, unlocking the entire category...", allowedMentions: { users: [] } });

                    const targetMember = await interaction.guild.members.fetch(P2);

                    await channel.permissionOverwrites.edit(targetMember, { ViewChannel: true, SendMessages: true });

                    for (const child of channel.children.cache.values()) {
                        await child.lockPermissions();
                    }

                    return interaction.followUp({ content: `Category **${channel.name}** has been unlocked.` });
                }
            }
            // only affect the user with ID P2
            const targetMember = await interaction.guild.members.fetch(P2);
            const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
            // if not locked for that user, nothing to do
            if (overwrite && !overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                await interaction.reply({ content: 'This channel is already unlocked.', flags: MessageFlags.Ephemeral });

                try {
                    await removeActiveLock(interaction.guild.id, client.user.id, channel.id);
                } catch (error) {
                    console.error(`Error removing lock from database: ${error}`);
                }
                return;
            }
            await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });

            const userMention = `<@${interaction.user.id}>`;
            await channel.send({
                content: `This channel has been unlocked by ${userMention}!`,
                allowedMentions: { users: [] }
            });

            if (channel.id !== interaction.channel.id) {
                await interaction.editReply({ content: `Unlocked ${channel}.`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
            }

            try {
                await removeActiveLock(interaction.guild.id, client.user.id, channel.id);
            } catch (error) {
                console.error(`Error removing lock from database: ${error}`);
            }

            return;

        } catch (error) {
            console.error('(Unlock Interaction) Error in unlock command:', error);
            return interaction.reply({ content: '⚠️ Hmm, something prevented me from unlocking this channel.', flags: MessageFlags.Ephemeral });
        }
    }
};
