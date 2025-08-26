module.exports = { ver: '2.11.0' };

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { loadToggleableFeatures, getPrefixForServer } = require('../mongoUtils');
const { P2, Seal } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder().setName('lock').setDescription('Locks the current channel.')
        .addStringOption(opt =>
            opt.setName('channel')
                .setDescription('Lock a specific channel.')
                .setRequired(false)
        ),
    name: 'lock',
    aliases: ['l'],
    async execute(msg, args, client) {
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
        const prefix = await getPrefixForServer(msg.guild.id);
        try {
            const member = await msg.guild.members.fetch(P2);
            if (!member) {
                return msg.reply({
                    content: `⚠️ Error: Failed to fetch ${P2}. Please try again later.`
                });
            }
        } catch (err) {
            return msg.reply({
                content: `⚠️ Error: <@${P2}> is not in the server. Please add the bot to lock the channel!`
            });
        }

        if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.ManageRoles)) {
            return msg.channel.send('⚠️Error: I\'m missing the `Manage Permissions` permission to lock this channel.');
        }
        // Check user permissions if adminMode is enabled
        if (toggleableFeatures.adminMode && !msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id != Seal) {
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

                if (channel.type === ChannelType.GuildCategory) {
                    await msg.reply({ content: "Category detected, locking the entire category...", allowedMentions: { users: [] } });

                    const targetMember = await msg.guild.members.fetch(P2);

                    await channel.permissionOverwrites.edit(targetMember, { ViewChannel: false, SendMessages: false });

                    for (const child of channel.children.cache.values()) {
                        await child.lockPermissions();
                    }

                    return msg.channel.send(`Category **${channel.name}** has been locked.`);
                }
            }
            const targetMember = await msg.guild.members.fetch(P2);
            const userPermissions = channel.permissionOverwrites.cache.get(targetMember.id);

            if (userPermissions && userPermissions.deny.has(PermissionFlagsBits.ViewChannel)) {
                return msg.channel.send('This channel is already locked.');
            }

            if (userPermissions) {
                // edit the overwrite for the specific user
                await channel.permissionOverwrites.edit(targetMember, { ViewChannel: false, SendMessages: false });
            } else {
                // create a new overwrite for the specific user
                await channel.permissionOverwrites.create(targetMember, { ViewChannel: false, SendMessages: false });
            }

            // mention the user without pinging
            const userMention = `<@${msg.author.id}>`;

            if (toggleableFeatures.adminMode) {
                await channel.send(`This channel has been locked. Ask an admin to unlock this channel!`);
                if (channel != msg.channel) {
                    await msg.reply({ content: `Locked ${channel}.`, allowedMentions: { users: [] } });
                }
            } else {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary)
                );
                await channel.send({
                    content: `This channel has been locked by ${userMention}. Click on 🔓 or type \`${prefix}unlock\` to unlock!`,
                    components: [row],
                    allowedMentions: { users: [] }
                });
                if (channel != msg.channel) {
                    await msg.reply({ content: `Locked ${channel}.`, allowedMentions: { users: [] } });
                }
            }
        } catch (error) {
            console.error('(Lock) Error in lock command:', error);
            return msg.channel.send('⚠️ Hmm, something prevented me from locking this channel.')
                .catch(error => console.error('(Lock) Error sending lock error message:', error));
        }
    },
    async executeInteraction(interaction, client) {
        // defer to avoid Unknown interaction errors
        await interaction.deferReply();
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);
        const prefix = await getPrefixForServer(interaction.guild.id);
        try {
            const member = await interaction.guild.members.fetch(P2);
            if (!member) {
                return interaction.editReply({
                    content: `⚠️ Error: Failed to fetch ${P2}. Please try again later.`, flags: MessageFlags.Ephemeral });
            }
        } catch (err) {
            return interaction.editReply({
                content: `⚠️ Error: <@${P2}> is not in the server. Please add the bot to lock the channel!`, flags: MessageFlags.Ephemeral });
        }
        if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply({ content: '⚠️Error: I\'m missing the `Manage Permissions` permission to lock this channel.' });
        }
        // Check user permissions if adminMode is enabled
        if (toggleableFeatures.adminMode && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.' });
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

                if (channel.type === ChannelType.GuildCategory) {
                    await interaction.editReply({ content: "Category detected, locking the entire category..." });

                    const targetMember = await interaction.guild.members.fetch(P2);

                    await channel.permissionOverwrites.edit(targetMember, { ViewChannel: false, SendMessages: false });

                    for (const child of channel.children.cache.values()) {
                        await child.lockPermissions();
                    }

                    return interaction.followUp({ content: `Category **${channel.name}** has been locked.` });
                }
            }

            // resolve the target user to lock
            const targetMember = await interaction.guild.members.fetch(P2);
            const userPermissions = channel.permissionOverwrites.cache.get(targetMember.id);

            if (userPermissions && userPermissions.deny.has(PermissionFlagsBits.ViewChannel)) {
                return interaction.editReply({ content: 'This channel is already locked.' });
            }

            if (userPermissions) {
                // edit the overwrite for the specific user
                await channel.permissionOverwrites.edit(targetMember, { ViewChannel: false, SendMessages: false });
            } else {
                // create a new overwrite for the specific user
                await channel.permissionOverwrites.create(targetMember, { ViewChannel: false, SendMessages: false });
            }

            // mention the user without pinging
            const userMention = `<@${interaction.user.id}>`;

            if (toggleableFeatures.adminMode) {
                await channel.send(`This channel has been locked. Ask an admin to unlock this channel!`);
                if (channel.id !== interaction.channel.id) {
                    await interaction.editReply({ content: `Locked ${channel}`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
                }
            } else {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary)
                );
                await channel.send({
                    content: `This channel has been locked by ${userMention}. Click on 🔓 or type \`${prefix}unlock\` to unlock!`,
                    components: [row],
                    allowedMentions: { users: [] }
                });
                if (channel.id !== interaction.channel.id) {
                    await interaction.editReply({ content: `Locked ${channel}`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
                }
            }
        } catch (error) {
            console.error('(Lock Interaction) Error in lock command:', error);
            return interaction.editReply({ content: '⚠️ Hmm, something prevented me from locking this channel.', flags: MessageFlags.Ephemeral });
        }
    }
};