//v2.4.3
const { loadToggleableFeatures, getPrefixForServer } = require('../mongoUtils');
const { Pname, P2a, P2a_P, Seal } = require('../utils');

module.exports = {
    name: 'pingafk',
    aliases: ['pa'],
    async execute(msg, args, client) {
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
        const prefix = await getPrefixForServer(msg.guild.id);

        // ensure this is a reply
        if (!msg.reference) {
            msg.channel.send(`⚠️ Please reply to a message from <@${Pname}> or <@${P2a}>.`);
            return;
        }
        // check feature toggle
        if (!toggleableFeatures.pingAfk) {
            msg.channel.send(`❌ This command is disabled. Admins can enable it by running \`${prefix}toggle pingafk\`.`);
            return;
        }
        // fetch the referenced message (the one being replied to)
        let referencedMessage;
        try {
            referencedMessage = await msg.fetchReference();
        } catch (error) {
            console.error('(PingAfk) Error fetching reference:', error);
            return;
        }
        //Pname
        if (referencedMessage && referencedMessage.content && (referencedMessage.author.id === Pname || referencedMessage.author.id === Seal)) {
            const mentionedUsers = [];
            const userIdRegex = /(\d{17,19}) \(AFK\)/g;
            let match;

            const shinyHuntPingsSectionRegex = /\*\*✨\s*Shiny Hunt Pings:\*\*([\s\S]*?)(?=(\*\*|$))/;
            const shinyHuntPingsSection = shinyHuntPingsSectionRegex.exec(referencedMessage.content);

            if (shinyHuntPingsSection && shinyHuntPingsSection[1]) {
                while ((match = userIdRegex.exec(shinyHuntPingsSection[1])) !== null) {
                    mentionedUsers.push(match[1]);
                }
            }

            const afkUsers = mentionedUsers
                .map(userId => `<@${userId}>`)
                .filter(userMention => !msg.content.includes(userMention));

            if (afkUsers.length > 0) {
                msg.channel.send(`Pinging AFK Hunters: ${afkUsers.join(' ')}`);
            } else {
                msg.channel.send('No AFK Hunters to ping.');
            }
        }
        //P2a
        else if (referencedMessage && referencedMessage.content && (referencedMessage.author.id === P2a || referencedMessage.author.id === P2a_P || referencedMessage.author.id === Seal)) {
            const mentionedUsers = [];
            const userIdRegex = /(\d{17,19}) \(AFK\)/g;
            let match;

            const shinyHuntPingsSectionRegex = /Shiny hunt pings:([\s\S]*?)(?=(Collection|Type|Quest|$))/i;
            const shinyHuntPingsSection = shinyHuntPingsSectionRegex.exec(referencedMessage.content);

            if (shinyHuntPingsSection && shinyHuntPingsSection[1]) {
                while ((match = userIdRegex.exec(shinyHuntPingsSection[1])) !== null) {
                    mentionedUsers.push(match[1]);
                }
            }

            const afkUsers = mentionedUsers
                .map(userId => `<@${userId}>`)
                .filter(userMention => !msg.content.includes(userMention));

            if (afkUsers.length > 0) {
                msg.channel.send(`Pinging AFK Hunters: ${afkUsers.join(' ')}`);
            } else {
                msg.channel.send('No AFK Hunters to ping.');
            }
        }
        // not a reply to Pname or P2a
        else {
            msg.channel.send(`⚠️ Please reply to a message from <@${Pname}> or <@${P2a}>.`);
            return;
        }
    }
}; 