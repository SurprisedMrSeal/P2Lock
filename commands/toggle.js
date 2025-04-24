const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, InteractionResponseFlags } = require('discord.js');
const { loadToggleableFeatures, saveToggleableFeatures, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Toggle specific settings')
        .addStringOption(opt => opt
            .setName('setting')
            .setDescription('Which setting to toggle')
            .setRequired(true)
            .addChoices(
                { name: 'Shiny Lock', value: 'includeShinyHuntPings' },
                { name: 'Rare Lock', value: 'includeRarePings' },
                { name: 'Regional Lock', value: 'includeRegionalPings' },
                { name: 'Collection Lock', value: 'includeCollectionPings' },
                { name: 'Quest Lock', value: 'includeQuestPings' },
                { name: 'Type Lock', value: 'includeTypePings' },
                { name: 'Ping Afk', value: 'pingAfk' },
                { name: 'Auto Pin', value: 'autoPin' },
                { name: 'Admin Mode', value: 'adminMode' }
            )
        )
        .addBooleanOption(opt => opt
            .setName('state')
            .setDescription('Enable (true) or disable (false)')
            .setRequired(true)
        ),
    name: 'toggle',
    async execute(msg, args, client) {
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
        const prefix = await getPrefixForServer(msg.guild.id);

        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        const toggleType = args[0] ? args[0].toLowerCase() : null;

        switch ((toggleType || '').toLowerCase()) {
            case 'shiny':
            case 'shiny lock':
            case 'sh':
                toggleableFeatures.includeShinyHuntPings = !toggleableFeatures.includeShinyHuntPings;
                msg.channel.send(`${toggleableFeatures.includeShinyHuntPings ? '🟩' : '⬛'} **Shiny Hunt Lock** toggled ${toggleableFeatures.includeShinyHuntPings ? 'on' : 'off'}.`);
                break;
            case 'rare':
            case 'rare lock':
            case 'r':
                toggleableFeatures.includeRarePings = !toggleableFeatures.includeRarePings;
                msg.channel.send(`${toggleableFeatures.includeRarePings ? '🟩' : '⬛'} **Rare Lock** toggled ${toggleableFeatures.includeRarePings ? 'on' : 'off'}.`);
                break;
            case 'regional':
            case 'regional lock':
            case 're':
                toggleableFeatures.includeRegionalPings = !toggleableFeatures.includeRegionalPings;
                msg.channel.send(`${toggleableFeatures.includeRegionalPings ? '🟩' : '⬛'} **Regional Lock** toggled ${toggleableFeatures.includeRegionalPings ? 'on' : 'off'}.`);
                break;
            case 'collection':
            case 'collection lock':
            case 'col':
            case 'cl':
                toggleableFeatures.includeCollectionPings = !toggleableFeatures.includeCollectionPings;
                msg.channel.send(`${toggleableFeatures.includeCollectionPings ? '🟩' : '⬛'} **Collection Lock** toggled ${toggleableFeatures.includeCollectionPings ? 'on' : 'off'}.`);
                break;
            case 'quest':
            case 'quest lock':
            case 'q':
                toggleableFeatures.includeQuestPings = !toggleableFeatures.includeQuestPings;
                msg.channel.send(`${toggleableFeatures.includeQuestPings ? '🟩' : '⬛'} **Quest Lock**  toggled ${toggleableFeatures.includeQuestPings ? 'on' : 'off'}.`);
                break;
            case 'type':
            case 'type lock':
            case 't':
                toggleableFeatures.includeTypePings = !toggleableFeatures.includeTypePings;
                msg.channel.send(`${toggleableFeatures.includeTypePings ? '🟩' : '⬛'} **Type Lock** toggled ${toggleableFeatures.includeTypePings ? 'on' : 'off'}.`);
                break;
            case 'pingafk':
            case 'pa':
                toggleableFeatures.pingAfk = !toggleableFeatures.pingAfk;
                msg.channel.send(`${toggleableFeatures.pingAfk ? '🟩' : '⬛'} **PingAfk** toggled ${toggleableFeatures.pingAfk ? 'on' : 'off'}.`);
                break;
            case 'autopin':
            case 'pin':
                toggleableFeatures.autoPin = !toggleableFeatures.autoPin;
                msg.channel.send(`${toggleableFeatures.autoPin ? '🟩' : '⬛'} **AutoPin** toggled ${toggleableFeatures.autoPin ? 'on' : 'off'}.`);
                break;
            case 'adminmode':
            case 'admin':
                toggleableFeatures.adminMode = !toggleableFeatures.adminMode;
                msg.channel.send(`${toggleableFeatures.adminMode ? '🟩' : '⬛'} **AdminMode** toggled ${toggleableFeatures.adminMode ? 'on' : 'off'}.`);
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
                        autoPin: 'AutoPin\n`Toggle whether it pins a "Shiny caught" message.`',
                        adminMode: 'AdminMode\n`Toggle whether the lock/unlock commands are admin only.`'
                    };

                    const embed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle('Toggleable Locks')
                        .setFooter({ text: `Run ${prefix}toggle <setting>` });

                    for (const featureName in featureDisplayName) {
                        const displayName = featureDisplayName[featureName];
                        const featureState = toggleableFeatures[featureName] ? '🟩 On' : '⬛ Off';
                        embed.addFields({ name: displayName, value: featureState, inline: false });
                    }

                    msg.channel.send({ embeds: [embed] });
                } else {
                    msg.channel.send(`⚠️ Invalid toggle option. Please use \`${prefix}toggle\` followed by a valid option.`);
                }
                break;
        }

        await saveToggleableFeatures(msg.guild.id, toggleableFeatures);
    },
    async executeInteraction(interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== Seal) {
            return interaction.reply({ content: '❌ You must have Manage Server or Administrator permission to use this command.', flags: InteractionResponseFlags.Ephemeral });
        }
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);
        const setting = interaction.options.getString('setting');
        const state = interaction.options.getBoolean('state');
        toggleableFeatures[setting] = state;
        await saveToggleableFeatures(interaction.guild.id, toggleableFeatures);
        const displayName = setting === 'pingAfk' ? 'Ping Afk'
            : setting === 'autoPin' ? 'Auto Pin'
            : setting === 'adminMode' ? 'Admin Mode'
            : setting.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        return interaction.reply({ content: `${displayName} toggled ${state ? 'on' : 'off'}.`, ephemeral: true });
    }
}; 