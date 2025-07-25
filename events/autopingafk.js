//v2.8.0
const { loadToggleableFeatures, loadBlacklistedChannels, getPrefixForServer } = require('../mongoUtils');
const { Pname, P2a, P2a_P, Seal, prefix } = require('../utils');

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (!msg.guild) return;
        const prefix = await getPrefixForServer(msg.guild.id);

        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
        if (!toggleableFeatures.pingAfk) return;

        const blacklistedChannels = await loadBlacklistedChannels(msg.guild.id);
        if (!msg.channel || blacklistedChannels.includes(msg.channel.id)) return;

        const isFromValidAuthor = [Pname, P2a, P2a_P, Seal].includes(msg.author.id);
        if (!isFromValidAuthor) return;

        const shinyHuntRegex = /(?:\*\*✨?\s*Shiny Hunt Pings:\*\*|Shiny hunt pings:)([\s\S]*?)(?=(\*\*|Collection|Type|Quest|$))/i;
        const section = shinyHuntRegex.exec(msg.content);
        if (!section || !section[1]) return;

        const mentionedUsers = [];
        const afkUserIdRegex = /(\d{17,19}) \(AFK\)/g;
        let match;

        while ((match = afkUserIdRegex.exec(section[1])) !== null) {
            mentionedUsers.push(`<@${match[1]}>`);
        }

        if (mentionedUsers.length > 0) {
            msg.channel.send(`Pinging AFK Hunters: ${mentionedUsers.join(' ')} \n-# Run \`${prefix}insert cmd here\` to opt out of AFK Pings.`);
        }
    }
};
