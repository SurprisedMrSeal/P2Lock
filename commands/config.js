module.exports = { ver: '2.14.0' };

const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags, AllowedMentionsTypes } = require('discord.js');
const { getDelay, getTimer, updatePrefixForServer, updateDelay, updateTimer, getPrefixForServer, getlulRoleId, updatelulRoleId } = require('../mongoUtils');
const { Seal, embedColor } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('View or change LockDelay, UnlockTimer, Prefix, and Lock/UnlockRole.')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('Configuration type to change (prefix, delay, unlocktimer, lock/unlock role)')
                .setRequired(false)
                .addChoices(
                    { name: 'Prefix', value: 'prefix' },
                    { name: 'Lock Delay', value: 'delay' },
                    { name: 'Unlock Timer', value: 'unlocktimer' },
                    { name: 'Lock/Unlock Role', value: 'roleId' }
                )
        )
        .addStringOption(opt =>
            opt.setName('value')
                .setDescription('New value for the chosen configuration.')
                .setRequired(false)
        ),
    name: 'config',
    aliases: ['conf', 'settings'],

    async execute(msg, args, client) {
        const delay = await getDelay(msg.guild.id);
        const timer = await getTimer(msg.guild.id);
        const prefix = await getPrefixForServer(msg.guild.id);
        const roleId = await getlulRoleId(msg.guild.id);

        if (args.length !== 2) {
            if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
                return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
            const embed = new EmbedBuilder()
                .setTitle('Configurable settings:')
                .setDescription(`
                    **Prefix:** \`${prefix}\` or <@!${client.user.id}>\n\n
                    **LockDelay:** \`${delay}\`s\n\n
                    **UnlockTimer:** \`${timer}\`min\n\n
                    **Lock/UnlockRole:** ${roleId && roleId !== '0' ? `<@&${roleId}>` : "none"}`)
                .setColor(embedColor)
                .setFooter({ text: `Usage: "${prefix}config <prefix|delay|timer|role> <value>"` });

            return msg.channel.send({ embeds: [embed] });
        }

        if (
            !msg.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !msg.member.permissions.has(PermissionFlagsBits.Administrator) &&
            msg.author.id !== Seal
        ) {
            return msg.channel.send('❌ You must have the `Manage Server` permission or `Administrator` to use this command.');
        }

        const [type, value] = [args[0].toLowerCase(), args[1]];

        if (type === 'prefix') {
            updatePrefixForServer(msg.guild.id, value)
                .then(() => msg.channel.send(`Prefix updated to \`${value}\``))
                .catch(error => {
                    console.error('(Config) Error updating prefix:', error);
                    msg.channel.send('⚠️ An error occurred while updating the prefix.');
                });
        } else if (type === 'delay' || type === 'lockdelay') {
            const newDelay = parseInt(value);
            if (isNaN(newDelay) || newDelay < 0 || newDelay > 600) {
                return msg.channel.send('❕ Must be a `number` between `0` and `600` seconds.');
            }
            updateDelay(msg.guild.id, newDelay)
                .then(() => msg.channel.send(`LockDelay updated to \`${newDelay}\` seconds.`))
                .catch(error => {
                    console.error('(Config) Error updating delay:', error);
                    msg.channel.send('⚠️ An error occurred while updating the delay.');
                });
        } else if (type === 'timer' || type === 'unlocktimer') {
            const newTimer = parseInt(value);
            if (isNaN(newTimer) || newTimer < 0 || newTimer > 1440) {
                return msg.channel.send('❕ Must be a `number` between `0` and `1440` minutes.');
            }
            updateTimer(msg.guild.id, newTimer)
                .then(() => msg.channel.send(`UnlockTimer updated to \`${newTimer}\` minutes.`))
                .catch(error => {
                    console.error('(Config) Error updating timer:', error);
                    msg.channel.send('⚠️ An error occurred while updating the timer.');
                });
        } else if (type === 'role' || type === 'roleid' || type === 'lockrole' || type === 'unlockrole' || type === 'lockunlockrole' || type === 'lock/unlockrole' || type === 'lulrole') {
            if (value === '0' || value.toLowerCase() === 'reset' || value.toLowerCase() === 'clear' || value.toLowerCase() === 'remove') {
                updatelulRoleId(msg.guild.id, '0')
                    .then(() => msg.channel.send('Lock/Unlock Role reset to `none`.'))
                    .catch(error => {
                        console.error('(Config) Error resetting roleId:', error);
                        msg.channel.send('⚠️ An error occurred while resetting the roleId.');
                    });
                return;
            }
            const roleIdMatch = value.match(/^(?:<@&)?(\d{17,19})>?$/);
            if (!roleIdMatch) {
                return msg.channel.send('⚠️ That doesn\'t look like a valid role or role ID.');
            }
            const roleId = roleIdMatch[1];
            const role = msg.guild.roles.cache.get(roleId);

            if (!role) {
                return msg.channel.send('⚠️ I couldn\'t find that role in this server.');
            }
            updatelulRoleId(msg.guild.id, roleId)
                .then(() => msg.channel.send({
                    content: `Lock/Unlock Role updated to <@&${roleId}>`,
                    allowedMentions: { roles: [] }
                }))
                .catch(error => {
                    console.error('(Config) Error updating roleId:', error);
                    msg.channel.send('⚠️ An error occurred while updating the roleId.');
                });
        } else {
            msg.channel.send(`⚠️ Unknown configuration type: \`${type}\`.`);
        }
    },

    async executeInteraction(interaction, client) {

        const type = interaction.options.getString('type');
        const value = interaction.options.getString('value');

        // If either is missing, show current settings
        if (!type || !value) {
            // Defer the reply to prevent timeout
            await interaction.deferReply();

            try {
                if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
                    return interaction.editReply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
                const delay = await getDelay(interaction.guild.id);
                const timer = await getTimer(interaction.guild.id);
                const prefix = await getPrefixForServer(interaction.guild.id);
                const roleId = await getlulRoleId(interaction.guild.id);

                const embed = new EmbedBuilder()
                    .setTitle('Configurable settings:')
                    .setDescription(
                        `**Prefix:** \`${prefix}\` or <@!${interaction.client.user.id}>\n\n` +
                        `**LockDelay:** \`${delay}\`s\n\n` +
                        `**UnlockTimer:** \`${timer}\`min\n\n` +
                        `**Lock/UnlockRole:** ${roleId && roleId !== '0' ? `<@&${roleId}>` : "none"}`
                    )
                    .setColor(embedColor)
                    .setFooter({ text: `Usage: /config type:<prefix|delay|timer|role> value:<new_value>` });

                return interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('(Config Interaction) Error fetching config:', error);
                return interaction.editReply({ content: '⚠️ There was an error fetching the configuration.' });
            }
        }

        if (
            !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            interaction.user.id !== Seal
        ) {
            return interaction.reply({
                content: '❌ You must have the `Manage Server` permission or `Administrator` to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        // If we're updating a value, defer the reply first
        await interaction.deferReply();

        try {
            if (type === 'prefix') {
                await updatePrefixForServer(interaction.guild.id, value);
                return interaction.editReply({ content: `Prefix updated to \`${value}\`` });
            } else if (type === 'delay') {
                const newDelay = parseInt(value);
                if (isNaN(newDelay) || newDelay < 0 || newDelay > 600) {
                    return interaction.editReply({ content: '❕ Must be a `number` between `0` and `600` seconds.' });
                }
                await updateDelay(interaction.guild.id, newDelay);
                return interaction.editReply({ content: `LockDelay updated to \`${newDelay}\` seconds.` });
            } else if (type === 'unlocktimer') {
                const newTimer = parseInt(value);
                if (isNaN(newTimer) || newTimer < 0 || newTimer > 1440) {
                    return interaction.editReply({ content: '❕ Must be a `number` between `0` and `1440` minutes.' });
                }
                await updateTimer(interaction.guild.id, newTimer);
                return interaction.editReply({ content: `UnlockTimer updated to \`${newTimer}\` minutes.` });
            } else if (type === 'roleId') {
                if (value === '0' || value.toLowerCase() === 'reset' || value.toLowerCase() === 'clear' || value.toLowerCase() === 'remove') {
                    await updatelulRoleId(interaction.guild.id, '0');
                    return interaction.editReply({ content: 'Lock/Unlock Role reset to `none`.' });
                }
                const roleIdMatch = value.match(/^(?:<@&)?(\d{17,19})>?$/);
                if (!roleIdMatch) {
                    return interaction.editReply('⚠️ That doesn\'t look like a valid role or role ID.');
                }
                const roleId = roleIdMatch[1];
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.editReply('⚠️ I couldn\'t find that role in this server.');
                }
                await updatelulRoleId(interaction.guild.id, roleId);
                return interaction.editReply({
                    content: `Lock/Unlock Role updated to <@&${roleId}>`,
                    allowedMentions: { roles: [] }
                });
            } else {
                return interaction.editReply({ content: '❕ Invalid configuration type.' });
            }
        } catch (error) {
            console.error('(Config Interaction) Error updating config:', error);
            return interaction.editReply({ content: '⚠️ There was an error updating the configuration.' });
        }
    }
};
