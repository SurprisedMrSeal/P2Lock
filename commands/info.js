//v2.5.5
const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getPrefixForServer } = require('../mongoUtils');
const { embedColor, version, getRuntime } = require('../utils');

async function createInfoEmbed(user, guildId, client) {
  const prefix = await getPrefixForServer(guildId);
  return new EmbedBuilder()
    .setTitle('Bot Info')
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setDescription(
      `**Prefix:** \`${prefix}\` or <@!${client.user.id}>\n` +
      `A Bot that Automatically (or Manually) locks your Shinyhunt, Rares, Regionals, and more for you!`
    )
    .setColor(embedColor)
    .addFields(
      { name: 'Bot Invite', value: '[Link](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)', inline: true },
      { name: 'GitHub', value: '[Link](https://github.com/SurprisedMrSeal/P2Lock)', inline: true },
      { name: 'Support Server', value: '[Link](https://discord.gg/sFszcSvMAp)', inline: true },
      { name: 'TOS', value: '[Link](https://p2lock.carrd.co/#tos)', inline: true },
      { name: 'Privacy Policy', value: '[Link](https://p2lock.carrd.co/#privacy)', inline: true },
      { name: '🍞', value: '[Link](https://discord.gg/RvFsakbRnp)', inline: true },
    )
    .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Gives you some information about the Bot.'),
  name: 'info',

  // message-based command
  async execute(msg, args, client) {
    if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
      return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
    const embed = await createInfoEmbed(msg.member.user, msg.guild.id, client);
    return msg.channel.send({ embeds: [embed] });
  },

  // slash-command
  async executeInteraction(interaction, client) {
    if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
      return interaction.reply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
    const embed = await createInfoEmbed(interaction.user, interaction.guild.id, client);
    return interaction.reply({ embeds: [embed] });
  }
};
