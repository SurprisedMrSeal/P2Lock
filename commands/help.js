//v2.5.5
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getPrefixForServer } = require('../mongoUtils');
const { embedColor, version, getRuntime } = require('../utils');

// Common command definitions
const commandDefs = prefix => [
  { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
  { name: 'ping', description: `Displays the bot's latency.\n\`${prefix}ping\`` },
  { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock\` \`${prefix}l\`` },
  { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock\` \`${prefix}ul\` \`${prefix}u\`` },
  { name: 'config', description: `Configure values like prefix, locking delay, and unlocking timer.\n\`${prefix}config <> []\`` },
  { name: 'toggle', description: `Lets you toggle specific settings.\n\`${prefix}toggle <>\`` },
  { name: 'pingafk', description: `[Pings the afk members using Poké-Name.](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk\` \`${prefix}pa\`` },
  { name: 'locklist', description: `Shows a list of all the locked channels in the server.\n\`${prefix}locklist\` \`${prefix}ll\`` },
  { name: 'blacklist', description: `Lets you blacklist channels from getting automatically locked.\n\`${prefix}blacklist <>\` \`${prefix}bl <>\`` },
  { name: 'suggest', description: `Sends your suggestion to the developer.\n\`${prefix}suggest []\`` },
  { name: 'report', description: `Sends your report to the developer.\n\`${prefix}report []\`` },
  { name: 'info', description: `Gives you some information about the Bot.\n\`${prefix}info\`` },
];

// Pagination and embed builder
async function buildPagedEmbed(user, guildId, client, page = 1) {
  const prefix = await getPrefixForServer(guildId);
  const commands = commandDefs(prefix);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(commands.length / itemsPerPage);
  const start = (page - 1) * itemsPerPage;
  const current = commands.slice(start, start + itemsPerPage);

  const embed = new EmbedBuilder()
    .setTitle('Command List')
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setDescription('-# `<>` Indicates optional argument.\n-# `[]` Indicates required argument.')
    .setColor(embedColor)
    .setFooter({ text: `Page ${page}/${totalPages} | Version: ${version} | Uptime: ${getRuntime()}` });

  current.forEach(cmd => embed.addFields({ name: `**${cmd.name}**`, value: cmd.description }));
  return { embed, totalPages };
}

// Component row
const navRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('help_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('help_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
);

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('Shows a list of commands and their aliases.'),

  async execute(msg, args, client) {
    if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
      return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
    let page = 1;
    const { embed, totalPages } = await buildPagedEmbed(msg.member.user, msg.guild.id, client, page);
    const sent = await msg.channel.send({ embeds: [embed], components: totalPages > 1 ? [navRow] : [] });
    if (totalPages > 1) handleCollector(sent, msg.channel, client, msg.member.user.id);
  },

  async executeInteraction(interaction, client) {
    if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
    return interaction.reply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
    let page = 1;
    const { embed, totalPages } = await buildPagedEmbed(interaction.user, interaction.guild.id, client, page);
    await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [navRow] : [] });
    if (totalPages > 1) handleCollector(await interaction.fetchReply(), interaction.channel, client, interaction.user.id);
  }
};

// Shared collector logic
function handleCollector(message, channel, client, originalUserId) {
  const filter = i => {
    if (i.user.id === originalUserId) return true;
    i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => { });
    return false;
  };

  const collector = message.createMessageComponentCollector({
    filter,
    time: 3 * 60 * 1000
  });

  let page = 1;

  collector.on('collect', async i => {
    const { guild } = i.message;
    // Get the correct prefix for the server for this page
    const prefix = await getPrefixForServer(guild.id);
    const commands = commandDefs(prefix);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(commands.length / itemsPerPage);

    page = i.customId === 'help_prev'
      ? (page > 1 ? page - 1 : totalPages)
      : (page < totalPages ? page + 1 : 1);

    const { embed } = await buildPagedEmbed(i.user, guild.id, client, page);
    await i.update({ embeds: [embed], components: [navRow] });
  });

  collector.on('end', () => {
    // Disable all buttons
    const disabled = new ActionRowBuilder().addComponents(
      navRow.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    );
    message.edit({ components: [disabled] }).catch(() => { });
  });
}
