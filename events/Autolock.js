const { P2, Pname, P2a, Seal } = require('../utils');
const { getPrefixForServer, loadToggleableFeatures, getDelay, getTimer } = require('../mongoUtils');
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
                // Get the configured delay and timer for this guild
                const delaySeconds = await getDelay(msg.guild.id);
                const timerMinutes = await getTimer(msg.guild.id);
                
                let warningMessage = null;
                
                // If delay is set, send a warning with a live timestamp
                if (delaySeconds > 0) {
                    // Calculate the Unix timestamp for when the lock will happen
                    const lockTime = Math.floor(Date.now() / 1000) + delaySeconds;
                    
                    // Send the initial warning with a relative timestamp that updates automatically
                    warningMessage = await msg.channel.send(`⏳ This channel will be locked <t:${lockTime}:R>`);
                    
                    // Wait for the configured delay, but check every second if the channel is already locked
                    const checkInterval = 1000; // Check every second
                    const iterations = delaySeconds;
                    
                    for (let i = 0; i < iterations; i++) {
                        await new Promise(resolve => setTimeout(resolve, checkInterval));
                        
                        // Check if the channel is already locked by another bot
                        const targetMember = await msg.guild.members.fetch(P2);
                        const currentOverwrite = msg.channel.permissionOverwrites.cache.get(targetMember.id);
                        
                        if (currentOverwrite && (currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) || 
                                                currentOverwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                            // Channel is already locked, update the message and exit
                            await warningMessage.edit(`⌛ The channel is already locked.`);
                            return;
                        }
                    }
                }
                
                const channel = msg.channel;
                const targetMember = await msg.guild.members.fetch(P2);
                let overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                
                // Check again right before locking
                if (overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                    if (warningMessage) {
                        await warningMessage.edit(`⌛ The channel is already locked.`);
                    }
                    return;
                }
                
                // Apply the lock
                if (overwrite) {
                    await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: false, SendMessages: false });
                } else {
                    await channel.permissionOverwrites.create(targetMember.id, { ViewChannel: false, SendMessages: false });
                }

                // Prepare content for lock message based on timer settings
                let lockContent = '';
                let unlockTime = null;
                
                if (timerMinutes > 0) {
                    // Calculate when the channel will be automatically unlocked
                    unlockTime = Math.floor(Date.now() / 1000) + (timerMinutes * 60);
                    
                    if (toggleableFeatures.adminMode) {
                        lockContent = `⌛ This channel has been locked. Ask an admin to unlock this channel.`;
                    } else {
                        lockContent = `⌛ This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock.`;
                    }
                } else {
                    if (toggleableFeatures.adminMode) {
                        lockContent = `This channel has been locked. Ask an admin to unlock this channel.`;
                    } else {
                        lockContent = `This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock!`;
                    }
                }

                // Send or edit the lock message
                let lockMessage;
                
                if (warningMessage) {
                    // Edit the warning message with the lock message
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
                    // Send a new lock message
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

                // Set up auto-unlock if timer is configured
                if (timerMinutes > 0) {
                    // Convert minutes to milliseconds
                    const unlockDelay = timerMinutes * 60 * 1000;
                    
                    setTimeout(async () => {
                        try {
                            // Check if the channel still exists and is still locked
                            const channel = msg.channel;
                            if (!channel) return; // Channel was deleted
                            
                            const targetMember = await msg.guild.members.fetch(P2).catch(() => null);
                            if (!targetMember) return; // Member no longer in server
                            
                            const currentOverwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                            if (!currentOverwrite || 
                                (!currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) && 
                                 !currentOverwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                                // Channel is already unlocked
                                return;
                            }
                            
                            // Unlock the channel
                            await channel.permissionOverwrites.delete(targetMember.id);
                            
                            // Send a notification about the auto-unlock
                            await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);
                            
                        } catch (error) {
                            console.error('(AutoUnlock) Error in auto-unlock:', error);
                        }
                    }, unlockDelay);
                }
                
            } catch (error) {
                console.error('(AutoLock) Error in lock command:', error);
                return msg.channel.send('⚠️ Hmm, something prevented me from locking this channel.\nChannel may already be locked.').catch(error => console.error('(AutoLock) Error sending lock error message:', error));
            }
        }
    }
};
