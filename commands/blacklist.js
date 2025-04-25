const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, InteractionResponseFlags } = require('discord.js');
const chunk = require('lodash.chunk');
const { saveBlacklistedChannels, loadBlacklistedChannels, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage channel blacklist.')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a channel to the blacklist.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to add.').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a channel from the blacklist.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to remove.').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all blacklisted channels.'))
        .addSubcommand(sub => sub.setName('clear').setDescription('Clear all blacklisted channels.')),
    name: 'blacklist',
    aliases: ['bl'],
    async execute(msg, args, client) {
        const prefix = await getPrefixForServer(msg.guild.id);
        // permission check
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        // load existing blacklist
        let blacklisted = await loadBlacklistedChannels(msg.guild.id) || [];
        const sub = args.shift()?.toLowerCase();

        // help embed if no subcommand
        const showHelp = () => {
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Blacklist Commands')
                .setDescription('P2Lock won\'t lock in Blacklisted Channels.')
                .addFields(
                    { name: `${prefix}blacklist add <#channel>...`, value: 'Add channels.', inline: false },
                    { name: `${prefix}blacklist remove <#channel>...`, value: 'Remove channels.', inline: false },
                    { name: `${prefix}blacklist list`, value: 'List blacklisted channels.', inline: false },
                    { name: `${prefix}blacklist clear`, value: 'Clear all blacklisted channels.', inline: false }
                );
            msg.channel.send({ embeds: [embed] });
        };

        if (!sub) return showHelp();

        // ADD
        if (sub === 'add' || sub === 'a') {
            if (!args.length) return msg.channel.send('❕ Please specify at least one channel to add.');
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
        // REMOVE
        if (sub === 'remove' || sub === 'r') {
            if (!args.length) return msg.channel.send('❕ Please specify at least one channel to remove.');
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
        // CLEAR
        if (sub === 'clear' || sub === 'c') {
            await saveBlacklistedChannels(msg.guild.id, []);
            return msg.channel.send('Cleared all blacklisted channels.');
        }
        // LIST with button-based pagination
        if (sub === 'list' || sub === 'l') {
            if (!blacklisted.length) return msg.channel.send('There are no blacklisted channels.');
            const pages = chunk(blacklisted, 10);
            let page = 0;
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Blacklisted Channels')
                .setFooter({ text: `Page ${page+1}/${pages.length}` });
            // helper to update embed description and footer
            const generateEmbed = p => embed
                .setDescription(pages[p].map(id => `<#${id}>`).join('\n'))
                .setFooter({ text: `Page ${p+1}/${pages.length}` });
            // create buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('blacklist_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('blacklist_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
            );
            // send initial message
            const sent = await msg.channel.send({ embeds: [generateEmbed(page)], components: pages.length > 1 ? [row] : [] });
            if (pages.length > 1) {
                const collector = sent.createMessageComponentCollector({
                    filter: i => ['blacklist_prev', 'blacklist_next'].includes(i.customId) && !i.user.bot,
                    time: 1000 * 60 * 3
                });
                collector.on('collect', async i => {
                    // update page index
                    page = i.customId === 'blacklist_prev'
                        ? (page > 0 ? page - 1 : pages.length - 1)
                        : (page < pages.length - 1 ? page + 1 : 0);
                    // update embed and buttons
                    await i.update({ embeds: [generateEmbed(page)], components: [row] });
                });
                collector.on('end', () => {
                    // disable pagination buttons when time expires
                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                    );
                    sent.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
            return;
        }

        // unknown subcommand
        return showHelp();
    },
    async executeInteraction(interaction, client) {
        // permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== Seal) {
            return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: InteractionResponseFlags.Ephemeral });
        }
        const guildId = interaction.guild.id;
        const cmd = interaction.options.getSubcommand();
        let blacklisted = await loadBlacklistedChannels(guildId) || [];
        if (cmd === 'add') {
            const channel = interaction.options.getChannel('channel');
            const id = channel.id;
            if (blacklisted.includes(id)) {
                return interaction.reply({ content: `<#${id}> is already blacklisted.`, flags: InteractionResponseFlags.Ephemeral });
            }
            blacklisted.push(id);
            await saveBlacklistedChannels(guildId, blacklisted);
            return interaction.reply({ content: `Added <#${id}> to the blacklist!` });
        } else if (cmd === 'remove') {
            const channel = interaction.options.getChannel('channel');
            const id = channel.id;
            if (!blacklisted.includes(id)) {
                return interaction.reply({ content: `<#${id}> is not blacklisted.`, flags: InteractionResponseFlags.Ephemeral });
            }
            blacklisted = blacklisted.filter(ch => ch !== id);
            await saveBlacklistedChannels(guildId, blacklisted);
            return interaction.reply({ content: `Removed <#${id}> from the blacklist!` });
        } else if (cmd === 'list') {
            if (blacklisted.length === 0) {
                return interaction.reply({ content: 'There are no blacklisted channels.' });
            }
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Blacklisted Channels')
                .setDescription(blacklisted.map(id => `<#${id}>`).join('\n'));
            return interaction.reply({ embeds: [embed] });
        } else if (cmd === 'clear') {
            await saveBlacklistedChannels(guildId, []);
            return interaction.reply({ content: 'Cleared all blacklisted channels.' });
        }
    }
}; 