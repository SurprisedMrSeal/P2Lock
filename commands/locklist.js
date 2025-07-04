//v2.6.2
const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getActiveLocks } = require('../mongoUtils');
const { P2, embedColor } = require('../utils');

function chunk(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('locklist')
        .setDescription('Shows a list of all the locked channels in the server.'),
    name: 'locklist',
    aliases: ['ll'],
    async execute(msg, args, client) {
        try {
            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
                return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
            const guildChannels = await msg.guild.channels.fetch();
            const lockedChannels = [...guildChannels.filter(channel => {
                if (!channel.permissionOverwrites || !channel.permissionOverwrites.cache) return false;
                const permissions = channel.permissionOverwrites.cache.get(P2);
                return permissions && permissions.deny.has(PermissionFlagsBits.ViewChannel);
            }).values()];

            if (lockedChannels.length === 0) {
                return msg.channel.send('There are no locked channels.');
            }

            const paginatedChannels = chunk(lockedChannels, 10);
            const totalLockedChannels = lockedChannels.length;
            let currentPage = 0;
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`Locked Channels (${totalLockedChannels})`)
                .setFooter({ text: `Page ${currentPage + 1}/${paginatedChannels.length}  (${paginatedChannels[currentPage].length} on this page)` });

            const activeLocks = await getActiveLocks(client.user.id);
            const lockMap = new Map(activeLocks.map(lock => [lock.channelId, lock.unlockTime]));
            lockedChannels.sort((a, b) => {
                const aUnlock = lockMap.get(a.id);
                const bUnlock = lockMap.get(b.id);

                if (!aUnlock && !bUnlock) return 0;
                if (!aUnlock) return -1;
                if (!bUnlock) return 1;

                return aUnlock - bUnlock;
            });

            const buildFields = page => {
                const group = paginatedChannels[page];

                const format = c => {
                    const unlock = lockMap.get(c.id);
                    return unlock ? `<#${c.id}> — <t:${unlock}:R>\n` : `<#${c.id}>\n`;
                };

                const fieldContent = group.map(format).join('\n') || 'There are no locked channels.';

                embed.setFields({ name: '\u200b', value: fieldContent });
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('locklist_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('locklist_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
            );

            buildFields(currentPage);
            const sent = await msg.channel.send({ embeds: [embed], components: paginatedChannels.length > 1 ? [row] : [] });

            if (paginatedChannels.length > 1) {
                const originalUserId = msg.member.user.id;
                const collector = sent.createMessageComponentCollector({
                    filter: i => {
                        if (!['locklist_prev', 'locklist_next'].includes(i.customId) || i.user.bot) return false;
                        if (i.user.id === originalUserId) return true;
                        i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => { });
                        return false;
                    },
                    time: 1000 * 60 * 3
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
                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                    );
                    sent.edit({ components: [disabledRow] }).catch(() => { });
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
            if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
                return interaction.editReply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
            const guildChannels = await interaction.guild.channels.fetch();
            const lockedChannels = [...guildChannels.filter(channel => {
                if (!channel.permissionOverwrites || !channel.permissionOverwrites.cache) return false;
                const permissions = channel.permissionOverwrites.cache.get(P2);
                return permissions && permissions.deny.has(PermissionFlagsBits.ViewChannel);
            }).values()];

            if (lockedChannels.length === 0) {
                return interaction.editReply('There are no locked channels.');
            }
            const paginatedChannels = chunk(lockedChannels, 10);
            const totalLockedChannels = lockedChannels.length;
            let currentPage = 0;
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`Locked Channels (${totalLockedChannels})`)
                .setFooter({ text: `Page ${currentPage + 1}/${paginatedChannels.length} (${paginatedChannels[currentPage].length} on this page)` });

            const activeLocks = await getActiveLocks(client.user.id);
            const lockMap = new Map(activeLocks.map(lock => [lock.channelId, lock.unlockTime]));

            lockedChannels.sort((a, b) => {
                const aUnlock = lockMap.get(a.id);
                const bUnlock = lockMap.get(b.id);

                if (!aUnlock && !bUnlock) return 0;
                if (!aUnlock) return -1;
                if (!bUnlock) return 1;

                return aUnlock - bUnlock;
            });

            const buildFields = page => {
                const group = paginatedChannels[page];

                const format = c => {
                    const unlock = lockMap.get(c.id);
                    return unlock ? `<#${c.id}> — <t:${unlock}:R>\n` : `<#${c.id}>\n`;
                };

                const fieldContent = group.map(format).join('\n') || 'There are no locked channels.';

                embed.setFields({ name: '\u200b', value: fieldContent });
            };

            buildFields(currentPage);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('locklist_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('locklist_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
            );
            await interaction.editReply({ embeds: [embed], components: paginatedChannels.length > 1 ? [row] : [] });
            const sent = await interaction.fetchReply();

            if (paginatedChannels.length > 1) {
                const originalUserId = interaction.user.id;
                const collector = sent.createMessageComponentCollector({
                    filter: i => {
                        if (!['locklist_prev', 'locklist_next'].includes(i.customId) || i.user.bot) return false;
                        if (i.user.id === originalUserId) return true;
                        i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => { });
                        return false;
                    },
                    time: 1000 * 60 * 3
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
                    sent.edit({ components: [disabledRow] }).catch(() => { });
                });
            }
        } catch (error) {
            console.error('(LockList Interaction) Error in locklist command:', error);
            return interaction.editReply('⚠️ Hmm, something went wrong while retrieving the locked channels.');
        }
    }
};