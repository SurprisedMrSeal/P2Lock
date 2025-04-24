const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getDelay, getTimer, updatePrefixForServer, updateDelay, updateTimer, getPrefixForServer } = require('../mongoUtils');
const { Seal, embedColor} = require('../utils');

module.exports = {
    name: 'config',
    async execute(msg, args, client) {
        const delay = await getDelay(msg.guild.id);
        const timer = await getTimer(msg.guild.id);
        const prefix = await getPrefixForServer(msg.guild.id);
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild) && !msg.member.permissions.has(PermissionFlagsBits.Administrator) && msg.author.id != Seal) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        if (args.length !== 2) {
            const embed = new EmbedBuilder()
                .setTitle('Configurable settings:')
                .setDescription(`**Prefix:** \`${prefix}\` or <@!${client.user.id}>\n\n**LockDelay:** \`${delay}\`s\n\n**UnlockTimer:** \`${timer}\`min\n\n\n⚠️LockDelay and UnlockTimer have not been implemented yet!⚠️`)
                .setColor(embedColor)
                .setFooter({ text: `Usage: "${prefix}config <prefix|delay|timer> <value>"` });
            return msg.channel.send({ embeds: [embed] });
        }

        const [type, value] = [args[0].toLowerCase(), args[1]];

        if (type === 'prefix') {
            const newPrefix = value;
            updatePrefixForServer(msg.guild.id, newPrefix)
                .then(() => {
                    msg.channel.send(`Prefix updated to \`${newPrefix}\``);
                })
                .catch(error => {
                    console.error('(Config) Error updating prefix:', error);
                    msg.channel.send('⚠️ An error occurred while updating the prefix.');
                });
        } else if (type === 'delay' || type === 'lockdelay') {
            const newDelay = parseInt(value);
            if (isNaN(newDelay) || newDelay < 0) {
                return msg.channel.send('⚠️ Delay must be a `number` greater than `0` seconds.');
            }
            updateDelay(msg.guild.id, newDelay)
                .then(() => {
                    msg.channel.send(`Delay updated to \`${newDelay}\` seconds.\n-# ||Delay is recommended to be lesser or equal to 10min (600s)||`);
                })
                .catch(error => {
                    console.error('(Config) Error updating delay:', error);
                    msg.channel.send('⚠️ An error occurred while updating the delay.');
                });
        } else if (type === 'timer' || type === 'unlocktimer') {
            const newTimer = parseInt(value);
            if (isNaN(newTimer) || newTimer < 0) {
                return msg.channel.send('⚠️ Timer must be a `number` greater than `0` minutes.');
            }
            updateTimer(msg.guild.id, newTimer)
                .then(() => {
                    msg.channel.send(`Timer updated to \`${newTimer}\` minutes.\n-# ||Timer is recommended to be lesser or equal to 24hrs (1440min).||`);
                })
                .catch(error => {
                    console.error('(Config) Error updating timer:', error);
                    msg.channel.send('⚠️ An error occurred while updating the timer.');
                });
        } else {
            msg.channel.send(`⚠️ Unknown configuration type: \`${type}\`.`);
        }
    },
    async executeInteraction(interaction) {
        // permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== Seal) {
            return interaction.reply({ content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.', ephemeral: true });
        }
        const type = interaction.options.getString('type');
        const value = interaction.options.getString('value');
        try {
            if (type === 'prefix') {
                await updatePrefixForServer(interaction.guild.id, value);
                return interaction.reply({ content: `Prefix updated to \`${value}\``, ephemeral: true });
            } else if (type === 'delay') {
                const newDelay = parseInt(value);
                if (isNaN(newDelay) || newDelay < 0) {
                    return interaction.reply({ content: '⚠️ Delay must be a number ≥ 0.', ephemeral: true });
                }
                await updateDelay(interaction.guild.id, newDelay);
                return interaction.reply({ content: `Lock delay updated to \`${newDelay}\` seconds.`, ephemeral: true });
            } else if (type === 'lockdelay') {
                const newDelay = parseInt(value);
                if (isNaN(newDelay) || newDelay < 0) {
                    return interaction.reply({ content: '⚠️ Delay must be a number ≥ 0.', ephemeral: true });
                }
                await updateDelay(interaction.guild.id, newDelay);
                return interaction.reply({ content: `Lock delay updated to \`${newDelay}\` seconds.`, ephemeral: true });
            } else if (type === 'unlocktimer') {
                const newTimer = parseInt(value);
                if (isNaN(newTimer) || newTimer < 0) {
                    return interaction.reply({ content: '⚠️ Timer must be a number ≥ 0.', ephemeral: true });
                }
                await updateTimer(interaction.guild.id, newTimer);
                return interaction.reply({ content: `Unlock timer updated to \`${newTimer}\` minutes.`, ephemeral: true });
            } else {
                return interaction.reply({ content: '⚠️ Invalid configuration type.', ephemeral: true });
            }
        } catch (error) {
            console.error('(Config Interaction) Error updating config:', error);
            return interaction.reply({ content: '⚠️ Hmm, There was an error updating the configuration.', ephemeral: true });
        }
    }
}; 