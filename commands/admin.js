//2.7.1
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getEventList, saveEventList, getActiveLocks } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    name: 'admin',
    aliases: ['ad'],
    async execute(msg, args, client) {
        if (msg.author.id !== Seal) return;

        if (args.length === 0) {
            return msg.channel.send('❕ Usage: `;admin event add|remove <mons>`, or `;admin locks`');
        }

        const mainSubcommand = args[0].toLowerCase();

        if (mainSubcommand === 'locks') {
            try {
                const activeLocks = await getActiveLocks(client.user.id);
        
                if (activeLocks.length === 0) {
                    return msg.channel.send('🔓 No active locks found.');
                }
        
                const itemsPerPage = 5;
                const totalPages = Math.ceil(activeLocks.length / itemsPerPage);
                let currentPage = 1;
        
                // Button components
                const lockButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('locks_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('locks_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                );
        
                const buildLockEmbed = (page) => {
                    const start = (page - 1) * itemsPerPage;
                    const currentChunk = activeLocks.slice(start, start + itemsPerPage);
                  
                    const description = currentChunk.map(lock => {
                      const guild = client.guilds.cache.get(lock.guildId);
                      const guildName = guild ? guild.name : 'Unknown Guild';
                  
                      return `• Guild: \`${guildName} (${lock.guildId})\`\n` +
                             `  Channel: \`${lock.channelId}\`\n` +
                             `  Unlocks: <t:${lock.unlockTime}:R>`;
                    }).join('\n\n');
                  
                    return new EmbedBuilder()
                      .setTitle(`Active Locks (${activeLocks.length})`)
                      .setColor(embedColor)
                      .setDescription(description)
                      .setFooter({ text: `Page ${page}/${totalPages}` });
                  };
        
                const sentMessage = await msg.channel.send({
                    embeds: [buildLockEmbed(currentPage)],
                    components: totalPages > 1 ? [lockButtons] : []
                });
        
                if (totalPages <= 1) return;
        
                const filter = i => {
                    if (i.user.id === msg.author.id) return true;
                    i.reply({ content: "Not your control!", ephemeral: true }).catch(() => {});
                    return false;
                };
        
                const collector = sentMessage.createMessageComponentCollector({
                    filter,
                    time: 3 * 60 * 1000
                });
        
                collector.on('collect', async i => {
                    currentPage = i.customId === 'locks_prev'
                        ? (currentPage > 1 ? currentPage - 1 : totalPages)
                        : (currentPage < totalPages ? currentPage + 1 : 1);
        
                    await i.update({
                        embeds: [buildLockEmbed(currentPage)],
                        components: [lockButtons]
                    });
                });
        
                collector.on('end', () => {
                    const disabledButtons = new ActionRowBuilder().addComponents(
                        lockButtons.components.map(btn => 
                            ButtonBuilder.from(btn).setDisabled(true)
                        )
                    );
                    sentMessage.edit({ components: [disabledButtons] }).catch(() => {});
                });
        
            } catch (error) {
                console.error('Error fetching active locks:', error);
                return msg.channel.send('⚠️ Failed to fetch active locks.');
            }
            return;
        }

        if (mainSubcommand === 'event') {
            if (args.length < 3) {
                return msg.channel.send('❕ Usage: `;admin event add <mons>` or `;admin event remove <mons>`');
            }

            const eventSubcommand = args[1].toLowerCase();
            const monsInput = args.slice(2).join(' ');
            const mons = monsInput.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);

            if (mons.length === 0) {
                return msg.channel.send('❕ Please provide at least one Pokémon name.');
            }

            let currentList = await getEventList();

            if (eventSubcommand === 'add' || eventSubcommand === 'a') {
                const newMons = mons.filter(mon => !currentList.includes(mon));
                if (newMons.length === 0) {
                    return msg.channel.send('✅ All provided Pokémon are already in the list.');
                }
                currentList.push(...newMons);
                await saveEventList(currentList);
                return msg.channel.send(`✅ Added: \`${newMons.join('`, `')}\``);
            }

            if (eventSubcommand === 'remove' || eventSubcommand === 'r') {
                const removed = mons.filter(mon => currentList.includes(mon));
                if (removed.length === 0) {
                    return msg.channel.send('⚠️ None of the provided Pokémon were found in the list.');
                }
                currentList = currentList.filter(mon => !removed.includes(mon));
                await saveEventList(currentList);
                return msg.channel.send(`✅ Removed: \`${removed.join('`, `')}\``);
            }

            return msg.channel.send('❕ Unknown event subcommand. Use `add` or `remove`.');
        }

        return msg.channel.send('❕ Unknown subcommand. Use `event` or `locks`.');
    }
};
