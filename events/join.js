//v2.7.0
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getPrefixForServer } = require('../mongoUtils');
const { embedColor } = require('../utils');

module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(guild, client) {
        const channel = guild.systemChannel || guild.channels.cache.find(c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
        );

        if (!channel) {
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔒 Thank you for adding me to this server! 🔒')
            .setDescription([
                '',
                `**${client.user.username}** can lock channels, and save spawns in the server for you.`,
                `To get started, use the \`/help\` or \`${await getPrefixForServer(guild.id)}help\` command.`,
                '',
                `**Some quick commands to help start using the bot:**`,
                `- \`/prefix\` or \`${await getPrefixForServer(guild.id)}prefix\` to change the prefix.`,
                `- \`/toggle\` or \`${await getPrefixForServer(guild.id)}toggle\` to select what to Lock for.`,
                '',
                'Need help? Join the [Support Server](https://discord.gg/sFszcSvMAp).'
            ].join('\n'))
            .setColor(embedColor)
            .setThumbnail(client.user.displayAvatarURL());

        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`Failed to send join message in ${guild.name}:`, error);
        }
    }
};
