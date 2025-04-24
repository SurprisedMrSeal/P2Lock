const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getPrefixForServer } = require('../mongoUtils');
const { embedColor, version, getRuntime } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Gives you some information about the Bot'),
    name: 'info',
    async execute(msg, args, client) {
        const user = msg.member.user;
        const prefix = await getPrefixForServer(msg.guild.id);
        const embed = new EmbedBuilder()
            .setTitle('Bot Info')
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`**Prefix:** \`${prefix}\` or <@!${client.user.id}>\nA Bot that automatically (or manually) locks your Shinyhunt, rares and regionals for you!`)
            .setColor(embedColor)
            .addFields(
                { name: 'Bot Invite', value: '[Link](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)', inline: true },
                { name: 'GitHub', value: '[Without DB](https://github.com/SurprisedMrSeal/P2Lock) , [With DB](https://github.com/SurprisedMrSeal/P2Lock/tree/with-DB)', inline: true },
                { name: 'Support Server', value: '[Link](https://discord.gg/sFszcSvMAp)', inline: true },
                { name: 'TOS', value: '[Link](https://p2lock.carrd.co/#tos)', inline: true },
                { name: 'Privacy Policy', value: '[Link](https://p2lock.carrd.co/#privacy)', inline: true },
            )
            .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });
        return msg.channel.send({ embeds: [embed] });
    },
    async executeInteraction(interaction, client) {
        const user = interaction.user;
        const prefix = await getPrefixForServer(interaction.guild.id);
        const embed = new EmbedBuilder()
            .setTitle('Bot Info')
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`**Prefix:** \`${prefix}\` or <@!${client.user.id}>\nA Bot that automatically (or manually) locks your Shinyhunt, rares and regionals for you!`)
            .setColor(embedColor)
            .addFields(
                { name: 'Bot Invite', value: '[Link](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)', inline: true },
                { name: 'GitHub', value: '[Without DB](https://github.com/SurprisedMrSeal/P2Lock) , [With DB](https://github.com/SurprisedMrSeal/P2Lock/tree/with-DB)', inline: true },
                { name: 'Support Server', value: '[Link](https://discord.gg/sFszcSvMAp)', inline: true },
                { name: 'TOS', value: '[Link](https://p2lock.carrd.co/#tos)', inline: true },
                { name: 'Privacy Policy', value: '[Link](https://p2lock.carrd.co/#privacy)', inline: true },
            )
            .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });
        await interaction.reply({ embeds: [embed] });
    }
}; 