module.exports = { ver: '2.9.3' };

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCustomList, saveCustomList, getPrefixForServer } = require('../mongoUtils');
const { embedColor, Seal } = require('../utils');

function paginate(items, page = 0, pageSize = 20) {
    const start = page * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);
    const totalPages = Math.ceil(items.length / pageSize);
    return { paginatedItems, totalPages };
}

function createEmbed(list, page, totalPages) {
    return new EmbedBuilder()
        .setTitle(`Custom Pokémon list (Page ${page + 1}/${totalPages})`)
        .setDescription(list.join('\n'))
        .setColor(embedColor);
}

function createPaginationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('custom')
        .setDescription('Manage the custom Pokémon locking list.')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add Pokémon to the custom locking list.')
                .addStringOption((opt) =>
                    opt
                        .setName('pokemon')
                        .setDescription('Comma-separated Pokémon names')
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove Pokémon from the custom locking list.')
                .addStringOption((opt) =>
                    opt
                        .setName('pokemon')
                        .setDescription('Comma-separated Pokémon names')
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('View the custom Pokémon list.')
        ),


    name: 'custom',
    aliases: ['cs', 'cl', 'collection', 'col'],

    async execute(msg, args, client) {
        const guildId = msg.guild.id;
        const prefix = await getPrefixForServer(guildId);

        const embed = new EmbedBuilder()
            .setTitle('Custom Pokémon list')
            .setDescription(
                `Add specific Pokémon to get locked if the other toggles are not what you need.\n\n` +
                `**${prefix}custom add <Pokémon>, <Pokémon>, ...**\n\`Adds Pokémon to the list.\`\n` +
                `**${prefix}custom remove <Pokémon>, <Pokémon>, ...**\n\`Removes Pokémon from the list.\`\n` +
                `**${prefix}custom list**\n\`Displays the list.\``
            )
            .setFooter({ text: "Run \`-toggle textnaming\` to make it work with Poké-Name (enable)." })
            .setColor(embedColor);

        if (!args[0]) {
            return msg.channel.send({ embeds: [embed] });
        }

        const sub = args[0]?.toLowerCase();
        const monsInput = args.slice(1).join(' ');
        const mons = monsInput.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
        let currentList = await getCustomList(guildId);

        if (sub === 'add' || sub === 'a') {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id != Seal) {
                return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
            }
            const newMons = mons.filter((mon) => !currentList.includes(mon));
            if (newMons.length === 0) return msg.channel.send('✅ All provided Pokémon are already in the list.');
            currentList.push(...newMons);
            await saveCustomList(currentList, guildId);
            return msg.channel.send(`✅ Added: \`${newMons.join('`, `')}\`\n-# Run \`-toggle textnaming\` to make it work with Poké-Name (enable).`);
        }

        if (sub === 'remove' || sub === 'r') {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id != Seal) {
                return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
            }
            const removed = mons.filter((mon) => currentList.includes(mon));
            if (removed.length === 0) return msg.channel.send('⚠️ None of the provided Pokémon were found.');
            currentList = currentList.filter((mon) => !removed.includes(mon));
            await saveCustomList(currentList, guildId);
            return msg.channel.send(`✅ Removed: \`${removed.join('`, `')}\``);
        }

        if (sub === 'list') {
            if (currentList.length === 0) return msg.channel.send('The list is empty.');
            let page = 0;
            const { paginatedItems, totalPages } = paginate(currentList, page);
            const embed = createEmbed(paginatedItems, page, totalPages);
            const row = createPaginationRow();

            const msgSent = await msg.channel.send({ embeds: [embed], components: [row] });
            const collector = msgSent.createMessageComponentCollector({ time: 3*60*1000 });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== msg.author.id) return interaction.reply({ content: 'Not for you 👀', ephemeral: true });

                interaction.customId === 'prev' ? (page = page > 0 ? page - 1 : totalPages - 1) : (page = (page + 1) % totalPages);
                const { paginatedItems } = paginate(currentList, page);
                const newEmbed = createEmbed(paginatedItems, page, totalPages);

                await interaction.update({ embeds: [newEmbed], components: [row] });
            });
            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                await msgSent.edit({ components: [disabledRow] });
            });
            return;
        }

        return msg.channel.send({ embeds: [embed] });
    },

    async executeInteraction(interaction, client) {
        const guildId = interaction.guild.id;
        const sub = interaction.options.getSubcommand();
        const monsInput = interaction.options.getString('pokemon') || '';
        const mons = monsInput.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
        let currentList = await getCustomList(guildId);

        if (sub === 'add') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
            }
            const newMons = mons.filter((mon) => !currentList.includes(mon));
            if (newMons.length === 0)
                return interaction.reply({ content: '✅ All provided Pokémon are already in the list.', flags: MessageFlags.Ephemeral });
            currentList.push(...newMons);
            await saveCustomList(currentList, guildId);
            return interaction.reply(`✅ Added: \`${newMons.join('`, `')}\`\n-# Run \`-toggle textnaming\` to make it work with Poké-Name (enable).`);
        }

        if (sub === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: MessageFlags.Ephemeral });
            }
            const removed = mons.filter((mon) => currentList.includes(mon));
            if (removed.length === 0)
                return interaction.reply({ content: '⚠️ None of the provided Pokémon were found.', flags: MessageFlags.Ephemeral });
            currentList = currentList.filter((mon) => !removed.includes(mon));
            await saveCustomList(currentList, guildId);
            return interaction.reply(`✅ Removed: \`${removed.join('`, `')}\``);
        }

        if (sub === 'list') {
            if (currentList.length === 0)
                return interaction.reply({ content: 'The list is empty.', flags: MessageFlags.Ephemeral });

            let page = 0;
            const { paginatedItems, totalPages } = paginate(currentList, page);
            const embed = createEmbed(paginatedItems, page, totalPages);
            const row = createPaginationRow();

            await interaction.reply({ embeds: [embed], components: [row] });
            const reply = await interaction.fetchReply();
            const collector = reply.createMessageComponentCollector({ time: 3*60*1000 });

            collector.on('collect', async (btn) => {
                if (btn.user.id !== interaction.user.id)
                    return btn.reply({ content: 'Not for you 👀', ephemeral: true });

                btn.customId === 'prev' ? (page = page > 0 ? page - 1 : totalPages - 1) : (page = (page + 1) % totalPages);
                const { paginatedItems } = paginate(currentList, page);
                const newEmbed = createEmbed(paginatedItems, page, totalPages);

                await btn.update({ embeds: [newEmbed], components: [row] });
            });
            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                await reply.edit({ components: [disabledRow] });
            });
        }
    },
};