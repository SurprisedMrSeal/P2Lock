//v2.5.2
const { EmbedBuilder, SlashCommandBuilder, WebhookClient, MessageFlags } = require('discord.js');
require('dotenv').config();

const webhookLink = process.env.report_suggest_webhook;
const embedColor = "FFFF00";
let webhookClient = null;

if (webhookLink) {
    webhookClient = new WebhookClient({ url: webhookLink });
} else {
    console.warn('No webhook link set, suggestions won\'t be sent.');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Suggest a feature to the bot dev.')
        .addStringOption(opt => opt
            .setName('message')
            .setDescription('Describe what you want to see added to the bot.')
            .setRequired(true)
        ),
    name: 'suggest',
    async execute(msg, args, client) {

        if (!webhookClient) {
            return msg.reply({ content: "❕ Suggestion system is currently unavailable. Please try again later when a webhook is set." });
}

        if (!args.length) {
            return msg.channel.send({ content: "❕Please enter a suggestion." });
        }

        const suggestion = args.join(' ');
        if (suggestion.length > 2000) return msg.channel.send({ content: "⚠️ [Too Long.](<https://www.youtube.com/watch?v=Z6_ZNW1DACE>)" });
        try {

            const embed = new EmbedBuilder()
            .setTitle('New Suggestion!')
            .setDescription(suggestion)
            .setColor(embedColor);
        
            const guild = client.guilds.cache.get(msg.guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            webhookClient.send({
                content: `From <@${msg.author.id}> in \`${guildName}\`.`,
                username: 'Suggestion',
                avatarURL: 'https://i.imgur.com/AUJx5Rq.png',
                embeds: [embed],
            });
            return msg.reply({ content: "Suggestion sent successfully!", allowedMentions: { parse: [] }});
        } catch (error) {
            console.error('(Suggest) Error sending suggestion:', error);
            return msg.channel.send('⚠️ An error occurred while sending this message.');
        }
    },
    async executeInteraction(interaction, client) {
        const suggestion = interaction.options.getString('message');
            if (!webhookClient) {
                return interaction.reply({ content: "❕ Suggestion system is currently unavailable. Please try again later when a webhook is set.", flags: MessageFlags.Ephemeral });
        }
        if (suggestion.length > 2000) 
            return interaction.reply({ content: "⚠️ [Too Long.](<https://www.youtube.com/watch?v=Z6_ZNW1DACE>)", flags: MessageFlags.Ephemeral });
        try {

            const embed = new EmbedBuilder()
            .setTitle('New Suggestion!')
            .setDescription(suggestion)
            .setColor(embedColor);
        
            const guild = client.guilds.cache.get(interaction.guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';
            
        webhookClient.send({
            content: `From <@${interaction.user.id}> in \`${guildName}\`.`,
            username: 'Suggestion',
            avatarURL: 'https://i.imgur.com/AUJx5Rq.png',
            embeds: [embed],
        });
            return interaction.reply({ content: "Suggestion sent successfully!", flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('(Suggest Interaction) Error sending suggestion:', error);
            return interaction.reply({ content: '⚠️ An error occurred while sending this message.' });
        }
    }
}; 
