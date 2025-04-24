const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { getPrefixForServer } = require('../mongoUtils');
const { embedColor, version, getRuntime } = require('../utils');

module.exports = {
    name: 'help',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows this menu'),
    async execute(msg, args, client) {
        const user = msg.member.user;
        const prefix = await getPrefixForServer(msg.guild.id);

        const commands = [
            { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
            { name: 'ping', description: `Displays the bot\'s latency.\n\`${prefix}ping\`` },
            { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock\` \`${prefix}l\`` },
            { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\` \`${prefix}u\`` },
            { name: 'pingafk', description: `[Pings the afk members using Poké-Name.](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk\` \`${prefix}pa\`` },
            { name: 'locklist', description: `Shows a list of all the locked channels in the server.\n\`${prefix}locklist\` \`${prefix}ll\`` },
            { name: 'config', description: `Configure values like prefix, locking delay, and unlocking timer.\n\`${prefix}config\` \`${prefix}config [] <>\`` },
            { name: 'toggle', description: `Lets you toggle specific settings.\n\`${prefix}toggle <>\`` },
            { name: 'blacklist', description: `Lets you blacklist channels from getting automatically locked.\n\`${prefix}blacklist <>\` \`${prefix}bl <>\`` },
            { name: 'info', description: `Gives you some information about the Bot.\n\`${prefix}info\`` },
        ];

        const itemsPerPage = 6;
        const totalPages = Math.ceil(commands.length / itemsPerPage);

        const embed = new EmbedBuilder()
            .setTitle('Command List')
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`-# \`<>\` Indicates optional argument.\n-# \`[]\` Indicates required argument.`)
            .setColor(embedColor)
            .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });

        let page = 1;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = page * itemsPerPage;
        const pageCommands = commands.slice(startIndex, endIndex);

        pageCommands.forEach(command => {
            embed.addFields({ name: `**${command.name}**`, value: command.description, inline: false });
        });

        embed.setFooter({ text: `Page ${page}/${totalPages} | ${getRuntime()}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
        );
        const sentMessage = await msg.channel.send({ embeds: [embed], components: totalPages > 1 ? [row] : [] });

        if (totalPages > 1) {
            const collector = sentMessage.createMessageComponentCollector({ filter: i => ['help_prev','help_next'].includes(i.customId) && !i.user.bot, time: 1000 * 60 * 3 });
            collector.on('collect', async interaction => {
                page = interaction.customId === 'help_prev' ? (page > 1 ? page - 1 : totalPages) : (page < totalPages ? page + 1 : 1);
                const startIdx = (page - 1) * itemsPerPage;
                const endIdx = page * itemsPerPage;
                const pageCommands2 = commands.slice(startIdx, endIdx);
                embed.setFields([]);
                pageCommands2.forEach(cmd2 => embed.addFields({ name: `**${cmd2.name}**`, value: cmd2.description, inline: false }));
                embed.setFooter({ text: `Page ${page}/${totalPages} | ${getRuntime()}` });
                await interaction.update({ embeds: [embed], components: [row] });
            });
            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                );
                sentMessage.edit({ components: [disabledRow] }).catch(() => {});
            });
        }
    },
    async executeInteraction(interaction, client) {
        const user = interaction.user;
        const prefix = await getPrefixForServer(interaction.guild.id);

        const commandsList = [
            { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
            { name: 'ping', description: `Displays the bot's latency.\n\`${prefix}ping\`` },
            { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock\` \`${prefix}l\`` },
            { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\` \`${prefix}u\`` },
            { name: 'pingafk', description: `[Pings the afk members using Poké-Name.](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk\` \`${prefix}pa\`` },
            { name: 'locklist', description: `Shows a list of all the locked channels in the server.\n\`${prefix}locklist\` \`${prefix}ll\`` },
            { name: 'config', description: `Configure values like prefix, locking delay, and unlocking timer.\n\`${prefix}config\` \`${prefix}config [] <>\`` },
            { name: 'toggle', description: `Lets you toggle specific settings.\n\`${prefix}toggle <>\`` },
            { name: 'blacklist', description: `Lets you blacklist channels from getting automatically locked.\n\`${prefix}blacklist <>\` \`${prefix}bl <>\`` },
            { name: 'info', description: `Gives you some information about the Bot.\n\`${prefix}info\`` }
        ];

        const itemsPerPage = 6;
        const totalPages = Math.ceil(commandsList.length / itemsPerPage);

        const embed = new EmbedBuilder()
            .setTitle('Command List')
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`-# \`<>\` Indicates optional argument.\n-# \`[]\` Indicates required argument.`)
            .setColor(embedColor)
            .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });

        let page = 1;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = page * itemsPerPage;
        const pageCommands = commandsList.slice(startIndex, endIndex);

        pageCommands.forEach(command => {
            embed.addFields({ name: `**${command.name}**`, value: command.description, inline: false });
        });

        embed.setFooter({ text: `Page ${page}/${totalPages} | ${getRuntime()}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
        const sentMessage = await interaction.fetchReply();

        if (totalPages > 1) {
            const collector = sentMessage.createMessageComponentCollector({ filter: i => ['help_prev','help_next'].includes(i.customId) && !i.user.bot, time: 1000 * 60 * 3 });
            collector.on('collect', async i => {
                page = i.customId === 'help_prev' ? (page > 1 ? page - 1 : totalPages) : (page < totalPages ? page + 1 : 1);
                const startIdx = (page - 1) * itemsPerPage;
                const endIdx = page * itemsPerPage;
                const pageCommands2 = commandsList.slice(startIdx, endIdx);
                embed.setFields([]);
                pageCommands2.forEach(cmd => embed.addFields({ name: `**${cmd.name}**`, value: cmd.description, inline: false }));
                embed.setFooter({ text: `Page ${page}/${totalPages} | ${getRuntime()}` });
                await i.update({ embeds: [embed], components: [row] });
            });
            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                );
                sentMessage.edit({ components: [disabledRow] }).catch(() => {});
            });
        }
    }
}; 