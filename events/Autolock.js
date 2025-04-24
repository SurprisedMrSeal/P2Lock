const { P2, Pname, P2a, Seal } = require('../utils');
const { getPrefixForServer, loadToggleableFeatures } = require('../mongoUtils');
const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        // skip DMs; only handle guild channels
        if (!msg.guild) return;
        const prefix = await getPrefixForServer(msg.guild.id);
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);

        if ([P2, Pname, P2a, Seal].includes(msg.author.id) &&
            msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages) &&
            (
                (toggleableFeatures.includeShinyHuntPings && (msg.content.includes('**✨Shiny Hunt Pings:** ') || msg.content.includes('**✨ Shiny Hunt Pings:** ') || msg.content.includes('Shiny hunt pings: '))) ||
                (toggleableFeatures.includeRarePings && (msg.content.includes('**Rare Ping:** ') || msg.content.includes('Rare ping: '))) ||
                (toggleableFeatures.includeRegionalPings && (msg.content.includes('**Regional Ping:** ') || msg.content.includes('Regional ping: '))) ||
                (toggleableFeatures.includeCollectionPings && (msg.content.toLowerCase().includes('collection pings:'))) ||
                (toggleableFeatures.includeQuestPings && (msg.content.includes('**Quest Pings:** ') || msg.content.includes('Quest pings: '))) ||
                (toggleableFeatures.includeTypePings && msg.content.includes('Type pings: '))
            )
        ) {
            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) return;
            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.ManageRoles)) {
                return msg.channel.send('⚠️ Error: I don\'t have the `Manage Roles` permission to lock this channel.');
            }
            try {
                const channel = msg.channel;
                const targetMember = await msg.guild.members.fetch(P2);
                let overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                if (overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) return;
                if (overwrite) {
                    await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: false, SendMessages: false });
                } else {
                    await channel.permissionOverwrites.create(targetMember.id, { ViewChannel: false, SendMessages: false });
                }

                if (toggleableFeatures.adminMode) {
                    await msg.channel.send(`This channel has been locked. Ask an admin to unlock this channel.`);
                } else {
                    // send a lock notice with an unlock button
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('unlock')
                            .setEmoji('🔓')
                            .setStyle(ButtonStyle.Secondary)
                    );
                    await msg.channel.send({
                        content: `This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock!`,
                        components: [row]
                    });
                }
            } catch (error) {
                console.error('(AutoLock) Error in lock command:', error);
                return msg.channel.send('⚠️ Hmm, something prevented me from locking this channel.\nChannel may already be locked.').catch(error => console.error('(AutoLock) Error sending lock error message:', error));
            }
        }
    }
}; 