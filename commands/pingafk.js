//v2.8.1
const { getPrefixForServer, getAfkPingOptOutList, toggleAfkPingOptOut } = require('../mongoUtils');
const { Pname, P2a, P2a_P, Seal } = require('../utils');

module.exports = {
    name: 'pingafk',
    aliases: ['pa'],
    async execute(msg, args) {
        const prefix = await getPrefixForServer(msg.guild.id);

        if (args[0] === 'optout' || args[0] === 'optin' || args[0] === 'oo' || args[0] === 'oi' || args[0] === 'opt' ) {
            const toggledToOptOut = await toggleAfkPingOptOut(msg.author.id);
            return msg.channel.send(toggledToOptOut
                ? '✅ You have been opted **out** of AFK pings. Run this command again to opt back in.'
                : '🔄 You have been **removed** from the opt-out list and will now receive AFK pings.');
        }

        if (!msg.reference) {
            return msg.channel.send(`⚠️ Please reply to a message from <@${Pname}> or <@${P2a}>.\n\n-# Run \`${prefix}pingafk optout\` to opt out of pings.`);
        }

        let referencedMessage;
        try {
            referencedMessage = await msg.fetchReference();
        } catch (error) {
            console.error('(PingAfk) Error fetching reference:', error);
            return;
        }

        const isValidBot = [Pname, P2a, P2a_P, Seal].includes(referencedMessage.author.id);
        if (!referencedMessage.content || !isValidBot) {
            return msg.channel.send(`⚠️ Please reply to a message from <@${Pname}> or <@${P2a}>.\n\n-# Run \`${prefix}pingafk optout\` to opt out of pings.`);
        }

        const shinyHuntPingsSectionRegex = /(?:\*\*✨?\s*Shiny Hunt Pings:\*\*|Shiny hunt pings:)([\s\S]*?)(?=\*\*|Collection|Type|Quest|$)/i;
        const afkTagRegex = /(\d{17,19}) \(AFK\)/g;

        const pingSectionMatch = shinyHuntPingsSectionRegex.exec(referencedMessage.content);
        if (!pingSectionMatch || !pingSectionMatch[1]) {
            return msg.channel.send('❌ Could not find any shiny hunt pings in that message.');
        }

        const mentionedUsers = [];
        let match;
        while ((match = afkTagRegex.exec(pingSectionMatch[1])) !== null) {
            mentionedUsers.push(match[1]);
        }

        if (mentionedUsers.length === 0) {
            return msg.channel.send('No AFK Hunters to ping.');
        }

        const optOutList = await getAfkPingOptOutList();
        const afkUsers = mentionedUsers
            .filter(userId => !optOutList.includes(String(userId)))
            .map(userId => `<@${userId}>`)
            .filter(userMention => !msg.content.includes(userMention)); // prevent duplicate mentions

        if (afkUsers.length > 0) {
            msg.channel.send(`Pinging AFK Hunters: ${afkUsers.join(' ')}\n-# Run \`${prefix}pingafk optout\` to opt out of pings.`);
        } else {
            msg.channel.send('No AFK Hunters to ping.');
        }
    }
};
