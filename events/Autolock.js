//v2.2.2
const { P2, Pname, P2a, Seal } = require('../utils');
const { getPrefixForServer, loadToggleableFeatures, getDelay, getTimer, saveActiveLock, removeActiveLock, getActiveLock } = require('../mongoUtils');
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
                let shouldCancel = false;
                
                // If delay is set, send a warning with a live timestamp
                if (delaySeconds > 0) {
                    // Calculate the Unix timestamp for when the lock will happen
                    const lockTime = Math.floor(Date.now() / 1000) + delaySeconds;
                    
                    // Send the initial warning with a relative timestamp that updates automatically
                    warningMessage = await msg.channel.send(`⏳ This channel will be locked <t:${lockTime}:R>`);
                    
                    // Create a collector to listen for "Congratulations" messages during the delay period
                    const filter = m => m.author.id === P2 
                    //&& (m.content.startsWith("Congratulations ") && m.content.includes("You caught a Level"))
                    ;
                    
                    const collector = msg.channel.createMessageCollector({ 
                        filter, 
                        time: delaySeconds * 1000 
                    });
                    
                    collector.on('collect', async () => {
                        shouldCancel = true;
                        collector.stop();
                        await warningMessage.edit(`⌛ This channel will be locked i- cancelled.`);
                    });
                    
                    // Wait for the configured delay, but check every second if the channel is already locked
                    const checkInterval = 1000; // Check every second
                    const iterations = delaySeconds;
                    
                    for (let i = 0; i < iterations; i++) {
                        await new Promise(resolve => setTimeout(resolve, checkInterval));
                        
                        // If we should cancel, exit early
                        if (shouldCancel) return;
                        
                        // Check if the channel is already locked by another bot
                        const targetMember = await msg.guild.members.fetch(P2);
                        const currentOverwrite = msg.channel.permissionOverwrites.cache.get(targetMember.id);
                        
                        if (currentOverwrite && (currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) || 
                                                currentOverwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                            // Channel is already locked, delete the message and exit
                            await warningMessage.delete();
                            return;
                        }
                    }
                    
                    // Check again if we should cancel
                    if (shouldCancel) return;
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
                
                if (timerMinutes > 0) {
                    // Calculate when the channel will be automatically unlocked
                    const currentTime = Math.floor(Date.now() / 1000);
                    const unlockTime = currentTime + (timerMinutes * 60);
                    
                    // Save the active lock to the database
                    await saveActiveLock(
                        msg.guild.id,
                        msg.channel.id,
                        targetMember.id,
                        currentTime,
                        unlockTime
                    );
                    
                    if (toggleableFeatures.adminMode) {
                        lockContent = `⏳ This channel has been locked. Ask an admin to unlock this channel.`;
                    } else {
                        lockContent = `⏳ This channel has been locked. Click on 🔓 or type \`${prefix}unlock\` to unlock.`;
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
                            // Check if the channel still exists
                            const channel = msg.channel;
                            if (!channel) {
                                // Channel was deleted, remove from database
                                await removeActiveLock(msg.guild.id, msg.channel.id);
                                return;
                            }
                            
                            // Check if this lock is still active in the database
                            const activeLock = await getActiveLock(msg.guild.id, channel.id);
                            if (!activeLock) {
                                // Lock was already removed from database (manually unlocked)
                                return;
                            }
                            
                            const targetMember = await msg.guild.members.fetch(P2).catch(() => null);
                            if (!targetMember) {
                                // Member no longer in server, remove from database
                                await removeActiveLock(msg.guild.id, channel.id);
                                return;
                            }
                            
                            const currentOverwrite = channel.permissionOverwrites.cache.get(targetMember.id);
                            if (!currentOverwrite || 
                                (!currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) && 
                                 !currentOverwrite.deny.has(PermissionFlagsBits.SendMessages))) {
                                // Channel is already unlocked, remove from database
                                await removeActiveLock(msg.guild.id, channel.id);
                                return;
                            }
                            
                            // Unlock the channel
                            await channel.permissionOverwrites.delete(targetMember.id);
                            
                            // Send a notification about the auto-unlock
                            await channel.send(`⌛ This channel has been automatically unlocked after ${timerMinutes} minutes.`);
                            
                            // Remove the lock from the database
                            await removeActiveLock(msg.guild.id, channel.id);
                            
                        } catch (error) {
                            console.error('(AutoUnlock) Error in auto-unlock:', error);
                            // Still try to remove from database even on error
                            await removeActiveLock(msg.guild.id, msg.channel.id);
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
