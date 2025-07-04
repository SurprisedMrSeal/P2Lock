//v2.6.0
const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPrefixForServer, loadToggleableFeatures, getDelay, getTimer, saveActiveLock, removeActiveLock, getActiveLock, getEventList, loadBlacklistedChannels } = require('../mongoUtils');
const { P2, Pname, P2a, P2a_P, Seal } = require('../utils');

const lockCooldowns = new Map();
const errorCooldowns = new Map();

const CHANNEL_COOLDOWN_MS = 5 * 1000;

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (!msg.guild) return;
        const prefix = await getPrefixForServer(msg.guild.id);
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);
        const blacklistedChannels = await loadBlacklistedChannels(msg.guild.id);
        const eventList = await getEventList();

        if (!msg.channel || blacklistedChannels.includes(msg.channel.id)) return;

        const lines = msg.content.split('\n');
        let islocked = false;
        const hasPing = (keyword) =>
            lines.some(line => line.toLowerCase().includes(keyword.toLowerCase())
                && (toggleableFeatures.lockAfk || /<@\d+>/.test(line)));

        if ([Pname, P2a, P2a_P, Seal].includes(msg.author.id) &&
            msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages) &&
            (
                (toggleableFeatures.includeShinyHuntPings && hasPing('shiny hunt pings:')) ||
                (toggleableFeatures.includeCollectionPings && hasPing('collection pings:')) ||
                (toggleableFeatures.includeQuestPings && hasPing('quest pings:')) ||
                (toggleableFeatures.includeTypePings && hasPing('type pings:')) ||
                (toggleableFeatures.includeRarePings && msg.content.toLowerCase().includes('rare ping:')) ||
                (toggleableFeatures.includeRegionalPings && msg.content.toLowerCase().includes('regional ping:')) ||
                (toggleableFeatures.includeEventPings
                    && msg.author.id !== Seal
                    && eventList.some(mon => msg.content.toLowerCase().includes(mon.toLowerCase()))
                    && (msg.content.includes(':') || msg.content.includes('#')))
            )
        ) {
            const now = Date.now();
            const cooldownUntil = lockCooldowns.get(msg.channel.id) || 0;

            if (now < cooldownUntil) {
                return;
            }

            lockCooldowns.set(msg.channel.id, now + CHANNEL_COOLDOWN_MS);
            setTimeout(() => lockCooldowns.delete(msg.channel.id), CHANNEL_COOLDOWN_MS);


            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.ManageRoles)) {
                return msg.channel.send('⚠️ Error: I don\'t have the `Manage Permissions` permission to lock this channel.');
            }

            try {
                const delaySeconds = await getDelay(msg.guild.id);
                const timerMinutes = await getTimer(msg.guild.id);

                let warningMessage = null;
                let shouldCancel = false;

                if (delaySeconds > 0) {
                    const lockTime = Math.floor(Date.now() / 1000) + delaySeconds;

                    warningMessage = await msg.channel.send(`⏳ This channel will be locked <t:${lockTime}:R>`);

                    const filter = m =>
                        m.author.id === P2 ||
                        (
                            m.mentions.has(P2) &&
                            !m.reference &&
                            !m.author.bot
                        );

                    const collector = msg.channel.createMessageCollector({
                        filter,
                        time: delaySeconds * 1000
                    });

                    collector.on('collect', async () => {
                        shouldCancel = true;
                        collector.stop();
                        if (warningMessage) {
                            await warningMessage.edit(`⌛ This channel will be locked i- cancelled.`)
                                .catch(error => console.error('(AutoLock) Error editing message to cancel:', error));
                        }
                    });

                    const checkInterval = 1000;
                    const iterations = delaySeconds;

                    for (let i = 0; i < iterations; i++) {
                        await new Promise(resolve => setTimeout(resolve, checkInterval));

                        if (shouldCancel) return;

                        const targetMember = await msg.guild.members.fetch(P2);
                        const currentOverwrite = msg.channel.permissionOverwrites.cache.get(targetMember.id);

                        if (currentOverwrite && (currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) ||
                            currentOverwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                            try {
                                await warningMessage.delete();
                            } catch (err) {
                                console.warn('Warning message already deleted or not found:', err.code);
                            }
                            warningMessage = null;
                            return;
                        }
                    }

                    if (shouldCancel) return;
                }

                const channel = msg.channel;
                const targetMember = await msg.guild.members.fetch(P2);
                let overwrite = channel.permissionOverwrites.cache.get(targetMember.id);

                if (overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                    if (warningMessage) {
                        await warningMessage.edit(`This channel is already locked.`);
                    }
                    return;
                }

                if (overwrite) {
                    await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: false, SendMessages: false });
                } else {
                    await channel.permissionOverwrites.create(targetMember.id, { ViewChannel: false, SendMessages: false });
                }
                islocked = true;

                let lockContent = '';

                if (timerMinutes > 0) {
                    const currentTime = Math.floor(Date.now() / 1000);
                    const unlockTime = currentTime + (timerMinutes * 60);

                    await removeActiveLock(msg.guild.id, client.user.id, msg.channel.id);
                    await saveActiveLock(
                        msg.guild.id,
                        msg.channel.id,
                        client.user.id,
                        currentTime,
                        unlockTime
                    );

                    if (toggleableFeatures.adminMode) {
                        lockContent = `This channel has been locked. Ask an admin to unlock this channel.\n-# ⏳ Automatically Unlocks <t:${unlockTime}:R>`;
                    } else {
                        lockContent = `This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock.\n-# ⏳ Automatically Unlocks <t:${unlockTime}:R>`;
                    }
                } else {
                    if (toggleableFeatures.adminMode) {
                        lockContent = `This channel has been locked. Ask an admin to unlock this channel.`;
                    } else {
                        lockContent = `This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock!`;
                    }
                }

                let lockMessage;

                if (warningMessage) {
                    if (!toggleableFeatures.adminMode) {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('unlock')
                                .setEmoji('🔓')
                                .setStyle(ButtonStyle.Secondary)
                        );
                        await warningMessage.edit({
                            content: lockContent,
                            components: [row]
                        });
                    } else {
                        await warningMessage.edit(lockContent);
                    }
                    lockMessage = warningMessage;
                } else {
                    if (!toggleableFeatures.adminMode) {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('unlock')
                                .setEmoji('🔓')
                                .setStyle(ButtonStyle.Secondary)
                        );
                        lockMessage = await msg.channel.send({
                            content: lockContent,
                            components: [row]
                        });
                    } else {
                        lockMessage = await msg.channel.send(lockContent);
                    }
                }

                if (timerMinutes > 0) {
                    const unlockDelay = timerMinutes * 60 * 1000;

                    setTimeout(async () => {
                        try {
                            const channel = msg.channel;
                            if (!channel) {
                                await removeActiveLock(msg.guild.id, client.user.id, msg.channel.id);
                                return;
                            }

                            const activeLock = await getActiveLock(msg.guild.id, client.user.id, channel.id);
                            if (!activeLock) {
                                return;
                            }

                            const targetMember = await msg.guild.members.fetch(P2).catch(() => null);
                            if (!targetMember) {
                                await removeActiveLock(msg.guild.id, client.user.id, channel.id);
                                return;
                            }

                            const currentOverwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                            if (!currentOverwrite ||
                                (!currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) &&
                                    !currentOverwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                                await removeActiveLock(msg.guild.id, client.user.id, channel.id);
                                return;
                            }

                            await channel.permissionOverwrites.delete(targetMember.id);

                            await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);

                            await removeActiveLock(msg.guild.id, client.user.id, channel.id);

                        } catch (error) {
                            console.error('(AutoUnlock) Error in auto-unlock:', error);
                            await removeActiveLock(msg.guild.id, client.user.id, msg.channel.id);
                        }
                    }, unlockDelay);
                }

            } catch (error) {
                console.error('(AutoLock) Error in lock command:', error);
                return msg.channel.send('⚠️ Hmm, something prevented me from locking this channel.\nChannel may already be locked.').catch(error => console.error('(AutoLock) Error sending lock error message:', error));
            }
        }

        const shouldIgnorePing = (keyword) =>
            lines.some(line =>
                line.toLowerCase().includes(keyword.toLowerCase()) &&
                (!toggleableFeatures.lockAfk && !/<@\d+>/.test(line))
            );

        if ([Pname, P2a, P2a_P, Seal].includes(msg.author.id) && !islocked &&
            msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages) &&
            (
                (toggleableFeatures.includeShinyHuntPings && shouldIgnorePing('shiny hunt pings:')) ||
                (toggleableFeatures.includeCollectionPings && shouldIgnorePing('collection pings:')) ||
                (toggleableFeatures.includeQuestPings && shouldIgnorePing('quest pings:')) ||
                (toggleableFeatures.includeTypePings && shouldIgnorePing('type pings:')) ||
                (toggleableFeatures.includeRarePings && msg.content.toLowerCase().includes('rare ping:')) ||
                (toggleableFeatures.includeRegionalPings && msg.content.toLowerCase().includes('regional ping:')) ||
                (toggleableFeatures.includeEventPings
                    && msg.author.id !== Seal
                    && eventList.some(mon => msg.content.toLowerCase().includes(mon.toLowerCase()))
                    && (msg.content.includes(':') || msg.content.includes('#')))
            )
        ) {
            const now = Date.now();
            const cooldownUntil = errorCooldowns.get(msg.channel.id) || 0;

            if (now < cooldownUntil) {
                return;
            }

            errorCooldowns.set(msg.channel.id, now + CHANNEL_COOLDOWN_MS);
            setTimeout(() => errorCooldowns.delete(msg.channel.id), CHANNEL_COOLDOWN_MS);

             return msg.channel.send(`All mentioned users are AFK, channel will not be locked.\n-# Run \`${prefix}toggle lockAfk\` to enable locking for AFK users.`);
        }
    }
};
