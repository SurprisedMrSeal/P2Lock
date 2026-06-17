module.exports = { ver: '2.13.3' };

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Displays the bot latency and time taken for a reply to get sent.'),
    name: 'ping',
    async execute(msg, args, client) {
        const latency = Date.now() - msg.createdTimestamp;
        const sent = await msg.channel.send(`🏓\nLatency: **${Math.abs(latency)} ms**`);
        const roundtrip = sent.createdTimestamp - msg.createdTimestamp;
        await sent.edit(`🏓\nLatency: **${Math.abs(latency)} ms**\nRoundtrip: **${roundtrip} ms**`);
    },
    async executeInteraction(interaction) {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓\nLatency: **${Math.abs(latency)} ms**`);
        const sent = await interaction.fetchReply();
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓\nLatency: **${Math.abs(latency)} ms**\nRoundtrip: **${roundtrip} ms**`);
    }
};