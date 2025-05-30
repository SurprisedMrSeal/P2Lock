//v2.5.5
const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updatePrefixForServer, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('View or change the server prefix.')
        .addStringOption(opt => opt
            .setName('value')
            .setDescription('New prefix')
            .setRequired(false)
        ),
    name: 'prefix',
    async execute(msg, args, client) {
        const prefix = await getPrefixForServer(msg.guild.id);

        if (args.length !== 1) {
            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
                return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
            const embed = new EmbedBuilder()
                .setTitle('Prefix Settings')
                .setDescription(`Current prefix: \`${prefix}\`, <@!${BotID}>, or \`/ commands\`\n\nTo change the prefix, use: \`${prefix}prefix <new_prefix>\``)
                .setColor(embedColor);
            return msg.channel.send({ embeds: [embed] });
        }

        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id !== Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to change the prefix.');
        }


        const newPrefix = args[0];
        try {
            await updatePrefixForServer(msg.guild.id, newPrefix);
            return msg.channel.send(`Prefix updated to \`${newPrefix}\``);
        } catch (error) {
            console.error('(Prefix) Error updating prefix:', error);
            return msg.channel.send('⚠️ An error occurred while updating the prefix.');
        }
    },
    async executeInteraction(interaction, client) {
        const prefix = await getPrefixForServer(interaction.guild.id);
        // permission check
        const newPrefix = interaction.options.getString('value');
        if (!newPrefix) {
            if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
                return interaction.reply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
            const embed = new EmbedBuilder()
                .setTitle('Prefix Settings')
                .setDescription(`Current prefix: \`${prefix}\`, <@!${interaction.client.user.id}>, or \`/ commands\`\n\nTo change the prefix, use: \`/prefix value:<new_prefix>\``)
                .setColor(embedColor);
            return interaction.reply({ embeds: [embed] });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== Seal) {
            return interaction.reply({ content: '❌ You must have the `Manage Server` or `Administrator` permission to change the prefix.' });
        }

        try {
            await updatePrefixForServer(interaction.guild.id, newPrefix);
            return interaction.reply({ content: `Prefix updated to \`${newPrefix}\`` });
        } catch (error) {
            console.error('(Prefix Interaction) Error updating prefix:', error);
            return interaction.reply({ content: '⚠️ An error occurred while updating the prefix.' });
        }
    }
}; 