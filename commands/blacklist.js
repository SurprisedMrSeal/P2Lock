//v2.6.2
const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, SlashCommandBuilder, /*InteractionResponseFlags,*/ MessageFlags } = require('discord.js');
const { saveBlacklistedChannels, loadBlacklistedChannels, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

function makeUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function chunk(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist channels from AutoLocking.'),
    name: 'blacklist',
    aliases: ['bl'],

    async execute(msg, args, client) {
        if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
            return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
        const prefix = await getPrefixForServer(msg.guild.id);
        // if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        //     !msg.member.permissions.has(PermissionFlagsBits.Administrator) &&
        //     msg.author.id !== Seal) {
        //     return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        // }

        // Handle legacy add/remove/clear quick commands
        const sub = args[0]?.toLowerCase();
        if ((sub === 'add' || sub === 'a') && args.length > 1) {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                !msg.member.permissions.has(PermissionFlagsBits.Administrator) &&
                msg.author.id !== Seal) {
                return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
            }
            args.shift();
            let blacklisted = await loadBlacklistedChannels(msg.guild.id) || [];
            const added = [];
            for (const mention of args) {
                const id = mention.replace(/[<#>]/g, '');
                if (!blacklisted.includes(id) && msg.guild.channels.cache.has(id)) {
                    blacklisted.push(id);
                    added.push(`<#${id}>`);
                }
            }
            await saveBlacklistedChannels(msg.guild.id, blacklisted);
            return msg.channel.send(added.length ? `Added: ${added.join(' ')} to the blacklist!` : 'No new channels were added.');
        }
        if ((sub === 'remove' || sub === 'r') && args.length > 1) {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                !msg.member.permissions.has(PermissionFlagsBits.Administrator) &&
                msg.author.id !== Seal) {
                return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
            }
            args.shift();
            let blacklisted = await loadBlacklistedChannels(msg.guild.id) || [];
            const removed = [];
            for (const mention of args) {
                const id = mention.replace(/[<#>]/g, '');
                if (blacklisted.includes(id)) {
                    blacklisted = blacklisted.filter(ch => ch !== id);
                    removed.push(`<#${id}>`);
                }
            }
            await saveBlacklistedChannels(msg.guild.id, blacklisted);
            return msg.channel.send(removed.length ? `Removed: ${removed.join(' ')} from the blacklist!` : 'No channels were removed.');
        }
        if (sub === 'clear' || sub === 'c') {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                !msg.member.permissions.has(PermissionFlagsBits.Administrator) &&
                msg.author.id !== Seal) {
                return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
            }
            let blacklisted = await loadBlacklistedChannels(msg.guild.id) || [];
            if (!blacklisted.length) return msg.channel.send('There are no blacklisted channels to clear.');
            const uniqueId = makeUniqueId();
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`bl_clear_confirm_${uniqueId}`).setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`bl_clear_cancel_${uniqueId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            const confirmMsg = await msg.channel.send({
                content: `Are you sure you want to clear **${blacklisted.length}** blacklisted channel(s)?`,
                components: [confirmRow]
            });
            const filter = i => i.user.id === msg.author.id && !i.user.bot && i.customId.endsWith(uniqueId);
            const collector = confirmMsg.createMessageComponentCollector({ filter, time: 30000, max: 1 });
            collector.on('collect', async i => {
                if (i.customId === `bl_clear_confirm_${uniqueId}`) {
                    await saveBlacklistedChannels(msg.guild.id, []);
                    await i.update({ content: 'Cleared all blacklisted channels.', components: [] });
                } else if (i.customId === `bl_clear_cancel_${uniqueId}`) {
                    await i.update({ content: 'Cancelled.', components: [] });
                }
            });
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        ...confirmRow.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                    );
                    await confirmMsg.edit({ components: [disabledRow] }).catch(() => { });
                }
            });
            return;
        }

        // Interactive UI for !blacklist
        return module.exports.showBlacklistUI(msg.channel, msg.author.id, msg.guild.id);
    },

    async executeInteraction(interaction, client) {
        if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
            return interaction.reply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
        // if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        //     !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
        //     interaction.user.id !== Seal) {
        //     return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
        // }
        await module.exports.showBlacklistUI(interaction.channel, interaction.user.id, interaction.guild.id, interaction);
    },

    // Shared UI for both prefix and slash
    async showBlacklistUI(channel, userId, guildId, interaction) {
        let blacklisted = await loadBlacklistedChannels(guildId) || [];
        let page = 0;
        const getPages = () => chunk(blacklisted, 20);
        const getEmbed = (p = 0) => {
            const pages = getPages();
            const desc = pages[p]?.length
                ? pages[p].map(id => `<#${id}>`).join('\n')
                : '_No blacklisted channels_';
            return new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Blacklisted Channels')
                .setDescription("P2Lock won't lock in Blacklisted Channels.")
                .addFields({ name: 'Channels', value: desc })
                .setFooter({ text: `Page ${p + 1}/${Math.max(1, pages.length)}` });
        };

        const getRow = (p = 0) => {
            const pages = getPages();
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bl_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(pages.length <= 1),
                new ButtonBuilder().setCustomId('bl_add').setLabel('Add').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('bl_remove').setLabel('Remove').setStyle(ButtonStyle.Primary).setDisabled(!blacklisted.length),
                new ButtonBuilder().setCustomId('bl_clear').setLabel('Clear').setStyle(ButtonStyle.Danger).setDisabled(!blacklisted.length),
                new ButtonBuilder().setCustomId('bl_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(pages.length <= 1)
            );
        };

        let sent;
        if (interaction) {
            await interaction.reply({
                embeds: [getEmbed(page)],
                components: [getRow(page)],
                flags: 0
            });
            sent = await interaction.fetchReply();
        } else {
            sent = await channel.send({
                embeds: [getEmbed(page)],
                components: [getRow(page)]
            });
        }

        const filter = i => i.user.id === userId && !i.user.bot;
        const collector = sent.createMessageComponentCollector({ filter, time: 1000 * 60 * 3 });

        collector.on('collect', async i => {
            blacklisted = await loadBlacklistedChannels(guildId) || [];
            let pages = getPages();

            if (i.customId === 'bl_prev') {
                page = page > 0 ? page - 1 : pages.length - 1;
                await i.update({ embeds: [getEmbed(page)], components: [getRow(page)] });
            }
            else if (i.customId === 'bl_next') {
                page = page < pages.length - 1 ? page + 1 : 0;
                await i.update({ embeds: [getEmbed(page)], components: [getRow(page)] });
            }
            else if (i.customId === 'bl_add') {
                if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                    !i.member.permissions.has(PermissionFlagsBits.Administrator) &&
                    i.user.id !== Seal) {
                    return i.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
                }
                const addRow = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('bl_add_select')
                        .setPlaceholder('Select channels to add')
                        .setChannelTypes(ChannelType.GuildText)
                        .setMinValues(1)
                        .setMaxValues(5)
                );
                await i.reply({ content: 'Select channel(s) to add to the blacklist:', components: [addRow], flags: MessageFlags.Ephemeral });
                const menuMsg = await i.fetchReply();
                const menuCollector = menuMsg.createMessageComponentCollector({
                    filter: btn => btn.user.id === userId && !btn.user.bot && btn.customId === 'bl_add_select',
                    time: 30000,
                    max: 1
                });
                menuCollector.on('collect', async menuI => {
                    let changed = false;
                    for (const id of menuI.values) {
                        if (!blacklisted.includes(id)) {
                            blacklisted.push(id);
                            changed = true;
                        }
                    }
                    await saveBlacklistedChannels(guildId, blacklisted);
                    await menuI.update({
                        content: changed ? `Added: ${menuI.values.map(id => `<#${id}>`).join(' ')} to the blacklist!` : 'No new channels were added.',
                        components: []
                    });
                    // Update main UI
                    blacklisted = await loadBlacklistedChannels(guildId) || [];
                    pages = getPages();
                    if (page >= pages.length) page = Math.max(0, pages.length - 1);
                    await sent.edit({ embeds: [getEmbed(page)], components: [getRow(page)] });
                });
            }
            else if (i.customId === 'bl_remove') {
                if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                    !i.member.permissions.has(PermissionFlagsBits.Administrator) &&
                    i.user.id !== Seal) {
                    return i.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
                }
                if (!blacklisted.length) return;
                const removeRow = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('bl_remove_select')
                        .setPlaceholder('Select channel(s) to remove')
                        .setChannelTypes(ChannelType.GuildText)
                        .setMinValues(1)
                        .setMaxValues(Math.min(5, blacklisted.length))
                );
                await i.reply({ content: 'Select channel(s) to remove from the blacklist:', components: [removeRow], flags: MessageFlags.Ephemeral });
                const menuMsg = await i.fetchReply();
                const menuCollector = menuMsg.createMessageComponentCollector({
                    filter: btn => btn.user.id === userId && !btn.user.bot && btn.customId === 'bl_remove_select',
                    time: 30000,
                    max: 1
                });
                menuCollector.on('collect', async menuI => {
                    let removed = [];
                    for (const id of menuI.values) {
                        if (blacklisted.includes(id)) {
                            blacklisted = blacklisted.filter(ch => ch !== id);
                            removed.push(`<#${id}>`);
                        }
                    }
                    await saveBlacklistedChannels(guildId, blacklisted);
                    await menuI.update({
                        content: removed.length ? `Removed: ${removed.join(' ')} from the blacklist!` : 'No channels were removed.',
                        components: []
                    });
                    // Update main UI
                    blacklisted = await loadBlacklistedChannels(guildId) || [];
                    pages = getPages();
                    if (page >= pages.length) page = Math.max(0, pages.length - 1);
                    await sent.edit({ embeds: [getEmbed(page)], components: [getRow(page)] });
                });
            }
            else if (i.customId === 'bl_clear') {
                if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                    !i.member.permissions.has(PermissionFlagsBits.Administrator) &&
                    i.user.id !== Seal) {
                    return i.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
                }
                const uniqueId = makeUniqueId();
                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`bl_clear_confirm_${uniqueId}`).setLabel('Confirm').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`bl_clear_cancel_${uniqueId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                await i.reply({
                    content: `Are you sure you want to clear **${blacklisted.length}** blacklisted channel(s)?`,
                    components: [confirmRow],
                    flags: MessageFlags.Ephemeral
                });
                const confirmMsg = await i.fetchReply();
                const confirmFilter = btn => btn.user.id === userId && btn.customId.endsWith(uniqueId);
                const confirmCollector = confirmMsg.createMessageComponentCollector({ filter: confirmFilter, time: 30000, max: 1 });
                confirmCollector.on('collect', async btn => {
                    if (btn.customId === `bl_clear_confirm_${uniqueId}`) {
                        await saveBlacklistedChannels(guildId, []);
                        await btn.update({ content: 'Cleared all blacklisted channels.', components: [] });
                    } else if (btn.customId === `bl_clear_cancel_${uniqueId}`) {
                        await btn.update({ content: 'Cancelled.', components: [] });
                    }
                    blacklisted = await loadBlacklistedChannels(guildId) || [];
                    pages = getPages();
                    if (page >= pages.length) page = Math.max(0, pages.length - 1);
                    await sent.edit({ embeds: [getEmbed(page)], components: [getRow(page)] });
                });
                confirmCollector.on('end', async collected => {
                    if (collected.size === 0) {
                        const disabledRow = new ActionRowBuilder().addComponents(
                            ...confirmRow.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                        );
                        await confirmMsg.edit({ components: [disabledRow] }).catch(() => { });
                    }
                });
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                ...getRow(page).components.map(b => ButtonBuilder.from(b).setDisabled(true))
            );
            sent.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};
