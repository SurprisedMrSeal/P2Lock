//v2.5.1
const { EmbedBuilder, SlashCommandBuilder, WebhookClient, MessageFlags } = require('discord.js');
const { webhookLink } = require('../utils');

const embedColor = "FF0000";
const webhookClient = new WebhookClient({ url: webhookLink });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a bug or error in the bot.')
        .addStringOption(opt => opt
            .setName('message')
            .setDescription('What is wrong with the bot? Be as detailed as possible.')
            .setRequired(true)
        ),
    name: 'report',
    async execute(msg, args, client) {

        if (!args.length) {
            return msg.channel.send({ content: "❕Please enter your report." });
        }

        const reportMsg = args.join(' ');
        if (reportMsg.length > 2000) return msg.channel.send({ content: "⚠️ [Too Long.](<https://www.youtube.com/watch?v=Z6_ZNW1DACE>)" });
        try {

            const embed = new EmbedBuilder()
            .setTitle('New Report!')
            .setDescription(reportMsg)
            .setColor(embedColor);
        
            const guild = client.guilds.cache.get(msg.guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            webhookClient.send({
                content: `From <@${msg.author.id}> in \`${guildName}\`.`,
                username: 'Report',
                avatarURL: 'https://i.imgur.com/RWrN3js.png',
                embeds: [embed],
            });
        return msg.reply({ content: "Report sent successfully!", allowedMentions: { parse: [] }});
        } catch (error) {
            console.error('(Report) Error sending report:', error);
            return msg.channel.send('⚠️ An error occurred while sending this message.');
        }
    },
    async executeInteraction(interaction, client) {
        const reportMsg = interaction.options.getString('message');
        if (!reportMsg) {
            return interaction.reply({ content: "❕Please enter a report." });
        }
        if (reportMsg.length > 2000) 
            return interaction.reply({ content: "⚠️ [Too Long.](<https://www.youtube.com/watch?v=Z6_ZNW1DACE>)", flags: MessageFlags.Ephemeral });
        try {

            const embed = new EmbedBuilder()
            .setTitle('New Report!')
            .setDescription(reportMsg)
            .setColor(embedColor);
        
            const guild = client.guilds.cache.get(interaction.guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            webhookClient.send({
                content: `From <@${interaction.user.id}> in \`${guildName}\`.`,
                username: 'Report',
                avatarURL: 'https://i.imgur.com/RWrN3js.png',
                embeds: [embed],
            });
            return interaction.reply({ content: "Report sent successfully!", flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('(Report Interaction) Error sending report:', error);
            return interaction.reply({ content: '⚠️ An error occurred while sending this message.' });
        }
    }
}; 