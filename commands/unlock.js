//v2.2.2
const { loadToggleableFeatures, removeActiveLock } = require('../mongoUtils');
const { P2, Seal } = require('../utils');
const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('unlock').setDescription('Unlocks the current channel.'),
    name: 'unlock',
    aliases: ['ul', 'u'],
    async execute(msg, args, client) {
        const toggleableFeatures = await loadToggleableFeatures(msg.guild.id);

        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return msg.channel.send('⚠️ Error: I don\'t have the `Manage Roles` permission to unlock this channel.');
        }
        if (toggleableFeatures.adminMode && !msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        try {
            const channel = msg.channel;
            // only affect the user with ID P2
            const targetMember = await msg.guild.members.fetch(P2);
            const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
            // if not locked for that user, nothing to do
            if (!overwrite || !overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                return msg.channel.send('This channel is already unlocked.');
            }
            // unlock for that user
            await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });
            
            // Remove the lock from the database if it exists
            try {
                await removeActiveLock(msg.guild.id, channel.id);
                //console.log(`Removed lock for channel ${channel.id} in guild ${msg.guild.id} via prefix command`);
            } catch (error) {
                console.error(`Error removing lock from database: ${error}`);
            }
            
            // mention user without ping
            const userMention = `<@${msg.author.id}>`;
            return msg.channel.send({
                content: `This channel has been unlocked by ${userMention}!`,
                allowedMentions: { users: [] }
            });
        } catch (error) {
            console.error('(Unlock) Error in unlock command:', error);
            return msg.channel.send('⚠️ Hmm, something prevented me from unlocking this channel.')
                .catch(err => console.error('(Unlock) Error sending unlock error message:', err));
        }
    },
    async executeInteraction(interaction, client) {
        const toggleableFeatures = await loadToggleableFeatures(interaction.guild.id);
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '⚠️ I\'m missing the `Manage Roles` permission to unlock this channel.', flags: InteractionResponseFlags.Ephemeral });
        }
        if (toggleableFeatures.adminMode && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', flags: InteractionResponseFlags.Ephemeral });
        }
        try {
            const channel = interaction.channel;
            // only affect the user with ID P2
            const targetMember = await interaction.guild.members.fetch(P2);
            const overwrite = channel.permissionOverwrites.cache.get(targetMember.id);
            // if not locked for that user, nothing to do
            if (!overwrite || !overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                return interaction.reply({ content: 'This channel is already unlocked.', flags: InteractionResponseFlags.Ephemeral });
            }
            // unlock for that user
            await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });
            
            // Remove the lock from the database if it exists
            try {
                await removeActiveLock(interaction.guild.id, channel.id);
                //console.log(`Removed lock for channel ${channel.id} in guild ${interaction.guild.id} via slash command`);
            } catch (error) {
                console.error(`Error removing lock from database: ${error}`);
            }
            
            // mention user without ping
            const userMention = `<@${interaction.user.id}>`;
            return interaction.reply({
                content: `This channel has been unlocked by ${userMention}!`,
                allowedMentions: { users: [] }
            });
        } catch (error) {
            console.error('(Unlock Interaction) Error in unlock command:', error);
            return interaction.reply({ content: '⚠️ Hmm, something prevented me from unlocking this channel.', flags: InteractionResponseFlags.Ephemeral });
        }
    }
};
