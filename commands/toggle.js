module.exports = { ver: '2.12.2' };

const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { loadToggleableFeatures, saveToggleableFeatures, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

const featureDisplayName = {
    includeShinyHuntPings: 'Shiny Lock\n`Toggle whether it locks for Shinyhunt Pings.`',
    includeRarePings: 'Rare Lock\n`Toggle whether it locks for Rare Pings.`',
    includeRegionalPings: 'Regional Lock\n`Toggle whether it locks for Regional Pings.`',
    includeCollectionPings: 'Collection Lock\n`Toggle whether it locks for Collection Pings.`',
    includeQuestPings: 'Quest Lock\n`Toggle whether it locks for Quest Pings.`',
    includeTypePings: 'Type Lock\n`Toggle whether it locks for Type Pings.`',
    includeEventPings: 'Event Lock\n`Toggle whether it locks for Event Pokémon.`',
    includeCustomLocks: 'Custom Lock\n`Toggle whether it locks for select Pokémon. (enable for more info)`',
    lockAfk: 'LockAfk\n`Toggle whether it locks for AFK users (Locks if true).`',
    pingAfk: 'PingAfk\n`Toggle whether it pings AFK shiny hunters.`',
    autoPin: 'AutoPin\n`Toggle whether it pins a "Shiny caught" message.`',
    adminMode: 'AdminMode\n`Toggle whether the lock/unlock commands are admin only.`',
    bwlist: 'Blacklist`/`Whitelist\n`Toggle whether channels are blacklisted or whitelisted to lock.`'
};

async function buildTogglePagedEmbed(toggleableFeatures, page = 1, mode) {
    const features = Object.keys(featureDisplayName);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(features.length / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const current = features.slice(start, start + itemsPerPage);

    const embed = new EmbedBuilder()
        .setTitle('Toggleable Settings')
        .setColor(embedColor)
        .setFooter({ text: `Page ${page}/${totalPages} | Run ${mode}toggle <setting>` });

    current.forEach(featureName => {
        const displayName = featureDisplayName[featureName];
        let featureState;
        if (featureName === "bwlist") {
            featureState = toggleableFeatures[featureName] ? "🔳 Blacklist" : "⬜ Whitelist";
        } else {
            featureState = toggleableFeatures[featureName] ? "🟩 On" : "⬛ Off";
        }
        embed.addFields({ name: displayName, value: featureState, inline: false });
    });

    return { embed, totalPages };
}

const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('toggle_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('toggle_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Toggle lock types and more.')
        .addStringOption(opt => opt
            .setName('setting')
            .setDescription('Which setting to toggle.')
            .setRequired(false)
            .addChoices(
                { name: 'Shiny Lock', value: 'includeShinyHuntPings' },
                { name: 'Rare Lock', value: 'includeRarePings' },
                { name: 'Regional Lock', value: 'includeRegionalPings' },
                { name: 'Collection Lock', value: 'includeCollectionPings' },
                { name: 'Quest Lock', value: 'includeQuestPings' },
                { name: 'Type Lock', value: 'includeTypePings' },
                { name: 'Event Lock', value: 'includeEventPings' },
                { name: 'Custom Lock', value: 'includeCustomLocks' },
                { name: 'LockAfk', value: 'lockAfk' },
                { name: 'PingAfk', value: 'pingAfk' },
                { name: 'AutoPin', value: 'autoPin' },
                { name: 'AdminMode', value: 'adminMode' },
                { name: 'Blacklist/Whitelist', value: 'bwlist' }
            )
        )
        .addBooleanOption(opt => opt
            .setName('state')
            .setDescription('Enable (true) or disable (false)')
            .setRequired(false)
        ),
    name: 'toggle',

    async execute(msg, args, client) {
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
        const prefix = await getPrefixForServer(msg.guild.id);

        const toggleType = args[0] ? args[0].toLowerCase() : null;

        switch (toggleType) {
            case 'shiny':
            case 'shinylock':
            case 'sh':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeShinyHuntPings = !toggleableFeatures.includeShinyHuntPings;
                msg.channel.send(`${toggleableFeatures.includeShinyHuntPings ? '🟩' : '⬛'} **Shiny Hunt Lock** toggled ${toggleableFeatures.includeShinyHuntPings ? 'on' : 'off'}.`);
                break;
            case 'rare':
            case 'rarelock':
            case 'r':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeRarePings = !toggleableFeatures.includeRarePings;
                msg.channel.send(`${toggleableFeatures.includeRarePings ? '🟩' : '⬛'} **Rare Lock** toggled ${toggleableFeatures.includeRarePings ? 'on' : 'off'}.`);
                break;
            case 'regional':
            case 'regionallock':
            case 'region':
            case 're':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeRegionalPings = !toggleableFeatures.includeRegionalPings;
                msg.channel.send(`${toggleableFeatures.includeRegionalPings ? '🟩' : '⬛'} **Regional Lock** toggled ${toggleableFeatures.includeRegionalPings ? 'on' : 'off'}.`);
                break;
            case 'collection':
            case 'collectionlock':
            case 'col':
            case 'cl':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeCollectionPings = !toggleableFeatures.includeCollectionPings;
                msg.channel.send(`${toggleableFeatures.includeCollectionPings ? '🟩' : '⬛'} **Collection Lock** toggled ${toggleableFeatures.includeCollectionPings ? 'on' : 'off'}.`);
                break;
            case 'quest':
            case 'questlock':
            case 'qp':
            case 'q':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeQuestPings = !toggleableFeatures.includeQuestPings;
                msg.channel.send(`${toggleableFeatures.includeQuestPings ? '🟩' : '⬛'} **Quest Lock** toggled ${toggleableFeatures.includeQuestPings ? 'on' : 'off'}.`);
                break;
            case 'type':
            case 'typelock':
            case 'tp':
            case 't':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeTypePings = !toggleableFeatures.includeTypePings;
                msg.channel.send(`${toggleableFeatures.includeTypePings ? '🟩' : '⬛'} **Type Lock** toggled ${toggleableFeatures.includeTypePings ? 'on' : 'off'}.`);
                break;
            case 'event':
            case 'eventlock':
            case 'ev':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeEventPings = !toggleableFeatures.includeEventPings;
                msg.channel.send(`${toggleableFeatures.includeEventPings ? '🟩' : '⬛'} **Event Lock** toggled ${toggleableFeatures.includeEventPings ? 'on.\n-# Run \`-toggle textnaming\` to make it work with Poké-Name (enable)' : 'off'}.`);
                break;
            case 'custom':
            case 'customlock':
            case 'cs':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.includeCustomLocks = !toggleableFeatures.includeCustomLocks;
                msg.channel.send(`${toggleableFeatures.includeCustomLocks ? '🟩' : '⬛'} **Custom Lock** toggled ${toggleableFeatures.includeCustomLocks ? `on.\n\nRun \`${prefix}custom add <names>\` to add them to the list` : 'off'}.`);
                break;
            case 'lockafk':
            case 'afklock':
            case 'afk':
            case 'la':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.lockAfk = !toggleableFeatures.lockAfk;
                msg.channel.send(`${toggleableFeatures.lockAfk ? '🟩' : '⬛'} **LockAfk** toggled ${toggleableFeatures.lockAfk ? 'on.\n-# Bot will now lock regardless of user AFK status' : 'off.\n-# Bot will now NOT lock if all users are AFK'}.`);
                break;
            case 'pingafk':
            case 'pa':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.pingAfk = !toggleableFeatures.pingAfk;
                msg.channel.send(`${toggleableFeatures.pingAfk ? '🟩' : '⬛'} **PingAfk** toggled ${toggleableFeatures.pingAfk ? 'on' : 'off'}.`);
                break;
            case 'autopin':
            case 'pin':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.autoPin = !toggleableFeatures.autoPin;
                msg.channel.send(`${toggleableFeatures.autoPin ? '🟩' : '⬛'} **AutoPin** toggled ${toggleableFeatures.autoPin ? 'on' : 'off'}.`);
                break;
            case 'adminmode':
            case 'admin':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.adminMode = !toggleableFeatures.adminMode;
                msg.channel.send(`${toggleableFeatures.adminMode ? '🟩' : '⬛'} **AdminMode** toggled ${toggleableFeatures.adminMode ? 'on' : 'off'}.`);
                break;
            case 'blacklist':
            case 'whitelist':
            case 'blacklist/whitelist':
            case 'black':
            case 'white':
            case 'bwlist':
            case 'blist':
            case 'wlist':
            case 'bl':
            case 'wl':
                if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
                    return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
                }
                toggleableFeatures.bwlist = !toggleableFeatures.bwlist;
                msg.channel.send(`${toggleableFeatures.bwlist ? '🔳' : '⬜'} **Mode** switched to ${toggleableFeatures.bwlist ? 'blacklist' : 'whitelist'}.`);
                break;
            default:
                let page = 1;
                const { embed, totalPages } = await buildTogglePagedEmbed(
                    toggleableFeatures,
                    page,
                    prefix
                );
                const sent = await msg.channel.send({ embeds: [embed], components: totalPages > 1 ? [navRow] : [] });
                if (totalPages > 1) handleToggleCollector(sent, msg.member.user.id, toggleableFeatures, prefix);

                break;
        }
        await saveToggleableFeatures(msg.guild.id, toggleableFeatures);
    },

    async executeInteraction(interaction, client) {
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);
        const setting = interaction.options.getString('setting');
        const state = interaction.options.getBoolean('state');
        if (!setting) {
            let page = 1;
            const { embed, totalPages } = await buildTogglePagedEmbed(
                toggleableFeatures,
                page,
                '/'
            );
            await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [navRow] : [] });
            if (totalPages > 1) handleToggleCollector(await interaction.fetchReply(), interaction.user.id, toggleableFeatures, '/')
            return;

        }
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            interaction.user.id !== Seal) {
            return interaction.reply({ content: '❌ You must have `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
        }
        const currentState = toggleableFeatures[setting];
        const newState = (state === null ? !currentState : state);
        toggleableFeatures[setting] = newState;
        await interaction.deferReply();
        try {
            await saveToggleableFeatures(interaction.guild.id, toggleableFeatures);
            const displayNames = {
                includeShinyHuntPings: 'Shiny Hunt Lock',
                includeRarePings: 'Rare Lock',
                includeRegionalPings: 'Regional Lock',
                includeCollectionPings: 'Collection Lock',
                includeQuestPings: 'Quest Lock',
                includeTypePings: 'Type Lock',
                includeEventPings: 'Event Lock',
                includeCustomLocks: 'Custom Lock',
                lockAfk: 'LockAfk',
                pingAfk: 'PingAfk',
                autoPin: 'AutoPin',
                adminMode: 'AdminMode',
                bwlist: 'Blacklist/Whitelist'
            };
            const name = displayNames[setting] || setting;
            const emoji = newState ? '🟩' : '⬛';

            let message = `${emoji} **${name}** toggled ${newState ? 'on' : 'off'}.`;
            if (setting === 'includeEventPings' && newState === true) {
                message += `\n-# Run \`-toggle textnaming\` to make it work with Poké-Name (enable).`;
            }
            if (setting === 'includeCustomLocks' && newState === true) {
                message += `\n\nRun \`${prefix}custom add <names>\` to add them to the list.`;
            }
            if (setting === 'lockAfk') {
                message += `\n-# Bot will now ${newState ? 'lock regardless of user AFK status' : 'NOT lock if all users are AFK'}.`;
            }
            if (setting === 'bwlist') {
                message = `${newState ? '🔳 **Mode** switched to blacklist' : '⬜ **Mode** switched to whitelist'}.`;
            }

            return interaction.editReply({ content: message });

        } catch (error) {
            console.error('(Toggle Interaction) Error updating config:', error);
            return interaction.editReply({ content: '⚠️ There was an error toggling that setting.' });
        }
    }
};

function handleToggleCollector(message, originalUserId, toggleableFeatures, mode) {
    const filter = i => {
        if (i.user.id === originalUserId) return true;
        i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => { });
        return false;
    };

    const collector = message.createMessageComponentCollector({
        filter,
        time: 3 * 60 * 1000
    });

    let page = 1;
    const itemsPerPage = 7;
    const totalPages = Math.ceil(Object.keys(featureDisplayName).length / itemsPerPage);

    collector.on('collect', async i => {
        page = i.customId === 'toggle_prev'
            ? (page > 1 ? page - 1 : totalPages)
            : (page < totalPages ? page + 1 : 1);

        const { embed } = await buildTogglePagedEmbed(
            toggleableFeatures,
            page,
            mode
        );
        await i.update({ embeds: [embed], components: [navRow] });
    });

    collector.on('end', () => {
        const disabled = new ActionRowBuilder().addComponents(
            navRow.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        message.edit({ components: [disabled] }).catch(() => { });
    });
}