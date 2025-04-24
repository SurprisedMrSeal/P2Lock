const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Displays the bot latency'),
    name: 'ping',
    async execute(msg, args, client) {
        const latency = Date.now() - msg.createdTimestamp;
        return msg.channel.send(`🏓 **${Math.abs(latency)} ms**.`);
    },
    async executeInteraction(interaction) {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 **${Math.abs(latency)} ms**`);
    }
}; 