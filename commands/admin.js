//v2.4.0
const { EmbedBuilder } = require('discord.js');
const { getEventList, saveEventList } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    name: 'event',
    aliases: ['ev'],
    async execute(msg, args) {
        if (msg.author.id !== Seal) return;

        if (args.length < 2) {
            return msg.channel.send('❕ Usage: `;event add <mon1, mon2, ...>` or `;event remove <mon1, mon2, ...>`');
        }

        const subcommand = args[0].toLowerCase();
        const entries = args.slice(1).join(' ').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

        if (entries.length === 0) {
            return msg.channel.send('❕ Please provide at least one event Pokémon name.');
        }

        let currentList = await getEventList();

        if (subcommand === 'add' || subcommand === 'a') {
            const newMons = entries.filter(mon => !currentList.includes(mon));
            if (newMons.length === 0) {
                return msg.channel.send('✅ All provided Pokémon are already in the list.');
            }
            currentList.push(...newMons);
            await saveEventList(currentList);
            return msg.channel.send(`✅ Added: \`${newMons.join('`, `')}\``);
        }

        if (subcommand === 'remove' || subcommand === 'r') {
            const removed = entries.filter(mon => currentList.includes(mon));
            if (removed.length === 0) {
                return msg.channel.send('⚠️ None of the provided Pokémon were found in the list.');
            }
            currentList = currentList.filter(mon => !removed.includes(mon));
            await saveEventList(currentList);
            return msg.channel.send(`✅ Removed: \`${removed.join('`, `')}\``);
        }

        return msg.channel.send('❕ Unknown subcommand. Use `add` or `remove`.');
    }
};
