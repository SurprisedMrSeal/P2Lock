const { P2, Seal } = require('../utils');
const { getPrefixForServer, loadToggleableFeatures } = require('../mongoUtils');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        // only handle guild messages
        if (!msg.guild) return;
        const prefix = await getPrefixForServer(msg.guild.id);
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);

        // autopin
        if ((msg.author.id === P2 || msg.author.id === Seal)
            && msg.content.startsWith("Congratulations ")
            && msg.content.includes("These colors seem unusual")) {
            if (!toggleableFeatures.autoPin) return;

            // check bot's ManageMessages permission in this channel
            if (!msg.channel.permissionsFor(msg.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
                return msg.channel.send(
                    `⚠️ Error: I don't have the \`Manage Messages\` permission to pin this message.\n` +
                    `You can run \`${prefix}toggle autopin\` to disable AutoPin.`
                );
            }
            // react then pin
            await msg.react('<:tada_008080:1234911189268693002>')
                .catch(err => {
                    console.error('(AutoPin) Error reacting with custom emoji, falling back to 🎉:', err);
                    return msg.react('🎉');
                });
            try {
                await msg.pin();
            } catch (error) {
                console.error('(AutoPin) Error pinning message:', error);
            }
        }
    }
}; 