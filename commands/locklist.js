//v2.2.4
const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags } = require('discord.js');
const chunk = require('lodash.chunk');
const { P2, embedColor } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('locklist')
        .setDescription('Shows a list of all the locked channels in the server.'),
    name: 'locklist',
    aliases: ['ll'],
    async execute(msg, args, client) {
        try {
            const guildChannels = msg.guild.channels.cache;
            const lockedChannels = [...guildChannels.filter(channel => {
                const permissions = channel.permissionOverwrites.cache.get(P2);
                return permissions && permissions.deny.has(PermissionFlagsBits.ViewChannel);
            }).values()];

            if (lockedChannels.length === 0) {
                return msg.channel.send('There are no locked channels.');
            }
            lockedChannels.sort((a, b) => b.lastModifiedTimestamp - a.lastModifiedTimestamp);

            const paginatedChannels = chunk(lockedChannels, 20);
            const totalLockedChannels = lockedChannels.length;
            let currentPage = 0;
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`Locked Channels (${totalLockedChannels})`)
                .setFooter({ text: `Page ${currentPage + 1}/${paginatedChannels.length}  (${paginatedChannels[currentPage].length} on this page)` });

            // button-based pagination
            const buildFields = page => {
                const grp1 = paginatedChannels[page].slice(0, 10);
                const grp2 = paginatedChannels[page].slice(10, 20);
                const f1 = grp1.length ? grp1.map(c => `<#${c.id}>`).join('\n') : '\u200b';
                const f2 = grp2.length ? grp2.map(c => `<#${c.id}>`).join('\n') : '\u200b';
                embed.setFields(
                    { name: '\u200b', value: f1, inline: true },
                    { name: '\u200b', value: f2, inline: true }
                );
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('locklist_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('locklist_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
            );

            buildFields(currentPage);
            const sent = await msg.channel.send({ embeds: [embed], components: paginatedChannels.length > 1 ? [row] : [] });

            // --- Only allow the message sender to use the buttons ---
            if (paginatedChannels.length > 1) {
                const originalUserId = msg.member.user.id;
                const collector = sent.createMessageComponentCollector({
                    filter: i => {
                        if (!['locklist_prev', 'locklist_next'].includes(i.customId) || i.user.bot) return false;
                        if (i.user.id === originalUserId) return true;
                        i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return false;
                    },
                    time: 1000 * 60 * 3 // 3 minutes
                });
                collector.on('collect', async i => {
                    currentPage = i.customId === 'locklist_prev'
                        ? (currentPage > 0 ? currentPage - 1 : paginatedChannels.length - 1)
                        : (currentPage < paginatedChannels.length - 1 ? currentPage + 1 : 0);
                    embed.setTitle(`Locked Channels (${totalLockedChannels})`)
                        .setFooter({ text: `Page ${currentPage + 1}/${paginatedChannels.length}  (${paginatedChannels[currentPage].length} on this page)` });
                    buildFields(currentPage);
                    await i.update({ embeds: [embed], components: [row] });
                });
                collector.on('end', () => {
                    // disable pagination buttons
                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                    );
                    sent.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            console.error('(LockList) Error in locklist command:', error);
            return msg.channel.send('⚠️ Hmm, something went wrong while retrieving the locked channels.')
                .catch(error => console.error('(LockList) Error sending locklist error message:', error));
        }
    },
    async executeInteraction(interaction, client) {
        await interaction.deferReply();
        try {
            const guildChannels = interaction.guild.channels.cache;
            const lockedChannels = [...guildChannels.filter(channel => {
                const permissions = channel.permissionOverwrites.cache.get(P2);
                return permissions && permissions.deny.has(PermissionFlagsBits.ViewChannel);
            }).values()];
            if (lockedChannels.length === 0) {
                return interaction.editReply('There are no locked channels.');
            }
            lockedChannels.sort((a, b) => b.lastModifiedTimestamp - a.lastModifiedTimestamp);
            const paginatedChannels = chunk(lockedChannels, 20);
            const totalLockedChannels = lockedChannels.length;
            let currentPage = 0;
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`Locked Channels (${totalLockedChannels})`)
                .setFooter({ text: `Page ${currentPage + 1}/${paginatedChannels.length} (${paginatedChannels[currentPage].length} on this page)` });
            const buildFields = page => {
                const grp1 = paginatedChannels[page].slice(0, 10);
                const grp2 = paginatedChannels[page].slice(10, 20);
                const f1 = grp1.length ? grp1.map(c => `<#${c.id}>`).join('\n') : '\u200b';
                const f2 = grp2.length ? grp2.map(c => `<#${c.id}>`).join('\n') : '\u200b';
                embed.setFields(
                    { name: '\u200b', value: f1, inline: true },
                    { name: '\u200b', value: f2, inline: true }
                );
            };
            buildFields(currentPage);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('locklist_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('locklist_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
            );
            await interaction.editReply({ embeds: [embed], components: paginatedChannels.length > 1 ? [row] : [] });
            const sent = await interaction.fetchReply();

            // --- Only allow the command user to use the buttons ---
            if (paginatedChannels.length > 1) {
                const originalUserId = interaction.user.id;
                const collector = sent.createMessageComponentCollector({
                    filter: i => {
                        if (!['locklist_prev', 'locklist_next'].includes(i.customId) || i.user.bot) return false;
                        if (i.user.id === originalUserId) return true;
                        i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => {});
                        return false;
                    },
                    time: 1000 * 60 * 3 // 3 minutes
                });
                collector.on('collect', async i => {
                    currentPage = i.customId === 'locklist_prev'
                        ? (currentPage > 0 ? currentPage - 1 : paginatedChannels.length - 1)
                        : (currentPage < paginatedChannels.length - 1 ? currentPage + 1 : 0);
                    embed.setTitle(`Locked Channels (${totalLockedChannels})`)
                        .setFooter({ text: `Page ${currentPage + 1}/${paginatedChannels.length} (${paginatedChannels[currentPage].length} on this page)` });
                    buildFields(currentPage);
                    await i.update({ embeds: [embed], components: [row] });
                });
                collector.on('end', () => {
                    // disable pagination buttons
                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                    );
                    sent.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            console.error('(LockList Interaction) Error in locklist command:', error);
            return interaction.editReply('⚠️ Hmm, something went wrong while retrieving the locked channels.');
        }
    }
};
