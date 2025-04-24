const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, InteractionResponseFlags } = require('discord.js');
const { updatePrefixForServer, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('View or change the server prefix')
        .addStringOption(opt => opt
            .setName('value')
            .setDescription('New prefix')
            .setRequired(false)
        ),
    name: 'prefix',
    async execute(msg, args, client) {
        const prefix = await getPrefixForServer(msg.guild.id);

        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` or `Administrator` permission to use this command.');
        }

        if (args.length !== 1) {
            const embed = new EmbedBuilder()
                .setTitle('Prefix Settings')
                .setDescription(`Current prefix: \`${prefix}\` or <@!${BotID}>\n\nTo change the prefix, use: \`${prefix}prefix <new_prefix>\``)
                .setColor(embedColor);
            return msg.channel.send({ embeds: [embed] });
        }

        const newPrefix = args[0];
        try {
            await updatePrefixForServer(msg.guild.id, newPrefix);
            return msg.channel.send(`✅ Prefix updated to \`${newPrefix}\``);
        } catch (error) {
            console.error('(Prefix) Error updating prefix:', error);
            return msg.channel.send('⚠️ An error occurred while updating the prefix.');
        }
    },
    async executeInteraction(interaction, client) {
        const prefix = await getPrefixForServer(interaction.guild.id);
        // permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== Seal) {
            return interaction.reply({ content: '❌ You must have the Manage Server or Administrator permission to use this command.', flags: InteractionResponseFlags.Ephemeral });
        }
        const newPrefix = interaction.options.getString('value');
        if (!newPrefix) {
            const embed = new EmbedBuilder()
                .setTitle('Prefix Settings')
                .setDescription(`Current prefix: \`${prefix}\` or <@!${interaction.client.user.id}>\n\nTo change the prefix, use: \`/prefix value:<new_prefix>\``)
                .setColor(embedColor);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            await updatePrefixForServer(interaction.guild.id, newPrefix);
            return interaction.reply({ content: `✅ Prefix updated to \`${newPrefix}\``, ephemeral: true });
        } catch (error) {
            console.error('(Prefix Interaction) Error updating prefix:', error);
            return interaction.reply({ content: '⚠️ An error occurred while updating the prefix.', ephemeral: true });
        }
    }
}; 