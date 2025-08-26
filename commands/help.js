module.exports = { ver: '2.12.4' };

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getPrefixForServer } = require('../mongoUtils');
const { embedColor, version, getRuntime, P2 } = require('../utils');

const commandDefs = prefix => [
  { name: 'help', description: `Shows this menu.\n\`${prefix}help\`` },
  { name: 'ping', description: `Displays the bot's latency.\n\`${prefix}ping\`` },
  { name: 'lock', description: `Locks the current channel.\n\`${prefix}lock <>\` \`${prefix}l <>\`` },
  { name: 'unlock', description: `Unlocks the current channel.\n\`${prefix}unlock <>\` \`${prefix}u <>\`` },
  { name: 'config', description: `Configure values like prefix, locking delay, and unlocking timer.\n\`${prefix}config <> []\`` },
  { name: 'toggle', description: `Lets you toggle specific settings.\n\`${prefix}toggle <>\`` },
  { name: 'pingafk', description: `[Pings the afk members using Poké-Name or P2 Assistant.](https://imgur.com/7IFcOuT)\n\`${prefix}pingafk <>\` \`${prefix}pa <>\`` },
  { name: 'custom', description: `Lets you lock for specific Pokémon, excluding pings.\n\`${prefix}custom <> <>\` \`${prefix}cs <> <>\`` },
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
    .setTitle(`Command List (${page}/${totalPages})`)
    .setDescription('-# `<>` Indicates optional argument. | `[]` Indicates required argument.')
    .setColor(embedColor);

  current.forEach(cmd => embed.addFields({ name: `**${cmd.name}**`, value: cmd.description }));
  return { embed, totalPages };
}

const showCommandsRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('command_list')
    .setLabel('Command List')
    .setStyle(ButtonStyle.Primary)
);

const navRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('help_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('help_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary)
);

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('Shows a list of commands and their aliases.'),

  async execute(msg, args, client) {
    if (!msg.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
      return msg.channel.send({ content: "⚠️ I need the `Embed Links` permission to send this embed!" });
    const prefix = await getPrefixForServer(msg.guild.id);
    const introEmbed = new EmbedBuilder()
      .setTitle("Help Menu")
      .setDescription([
        '',
        `**${client.user.username}** Locks channels when it detects certain keywords, like "Shiny Hunt pings: ", "Rare Ping: ", etc. This can also be done manually using \`${prefix}lock\`.`,
        ``,
        '**Some things to check before starting:**',
        '- Bot has permission to view channels and send messages (should be enabled by default).',
        `- The "${client.user.username}" role should be placed ABOVE the Pokétwo role.`,
        `- <@${P2}> should NOT have the administrator permission, since this will bypass any change to the channel permissions.`,
        '- **Atleast 1** naming bot should be present in the server for AutoLocking. Having more than 1 is alright and usually recommended in most servers.',
        '',
        '**Some additional customisation:**',
        `- Use \`${prefix}toggle\` to select what to lock for, and to toggle other settings.`,
        `- Use \`${prefix}config\` to configure the bot's prefix, delay to lock, and timer to automatically unlock.`,
        `- Use \`${prefix}blacklist\` to blacklist channels from getting locked automatically.`,
        '',
        '[Bot Invite](https://discord.com/oauth2/authorize?client_id=806723110761136169) | [GitHub](https://github.com/SurprisedMrSeal/P2Lock) | [TOS](https://p2lock.carrd.co/#tos) | [Privacy Policy](https://p2lock.carrd.co/#privacy) | [🍞](https://discord.gg/RvFsakbRnp)',
        '',
        'Need help? Join the [Support Server](https://discord.gg/sFszcSvMAp).'
      ].join('\n'))
      .setThumbnail(client.user.displayAvatarURL())
      .setColor(embedColor)
      .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });

    const sent = await msg.channel.send({ embeds: [introEmbed], components: [showCommandsRow] });
    handleCollector(sent, msg.channel, client, msg.member.user.id);
  },

  async executeInteraction(interaction, client) {
    if (!interaction.channel.permissionsFor(client.user).has(PermissionFlagsBits.EmbedLinks))
      return interaction.reply({ content: "⚠️ I need the `Embed Links` permission to send this embed! 🤐", flags: MessageFlags.Ephemeral });
    const prefix = await getPrefixForServer(interaction.guild.id);
    const introEmbed = new EmbedBuilder()
      .setTitle("Help Menu")
      .setDescription([
        '',
        `**${client.user.username}** Locks channels when it detects certain keywords, like "Shiny Hunt pings: ", "Rare Ping: ", etc. This can also be done manually using \`/lock\`.`,
        ``,
        '**Some things to check before starting:**',
        '- Bot has permission to view channels and send messages (should be enabled by default).',
        `- The "${client.user.username}" role should be placed ABOVE the Pokétwo role.`,
        `- <@${P2}> should NOT have the administrator permission, since this will bypass any change to the channel permissions.`,
        '- **Atleast 1** naming bot should be present in the server for AutoLocking. Having more than 1 is alright and usually recommended in most servers.',
        '',
        '**Some additional customisation:**',
        `- Use \`/toggle\` to select what to lock for, and to toggle other settings.`,
        `- Use \`/config\` to configure the bot's prefix, delay to lock, and timer to automatically unlock.`,
        `- Use \`/blacklist\` to blacklist channels from getting locked automatically.`,
        '',
        '[Bot Invite](https://discord.com/oauth2/authorize?client_id=806723110761136169) | [GitHub](https://github.com/SurprisedMrSeal/P2Lock) | [TOS](https://p2lock.carrd.co/#tos) | [Privacy Policy](https://p2lock.carrd.co/#privacy) | [🍞](https://discord.gg/RvFsakbRnp)',
        '',
        'Need help? Join the [Support Server](https://discord.gg/sFszcSvMAp).'
      ].join('\n'))
      .setThumbnail(client.user.displayAvatarURL())
      .setColor(embedColor)
      .setFooter({ text: `Version: ${version} | Uptime: ${getRuntime()}` });

    await interaction.reply({ embeds: [introEmbed], components: [showCommandsRow] });
    const sent = await interaction.fetchReply();
    handleCollector(sent, interaction.channel, client, interaction.user.id);

  }

};

function handleCollector(message, channel, client, originalUserId) {
  const filter = i => {
    if (i.user.id === originalUserId) return true;
    i.reply({ content: "Not for you 👀", flags: MessageFlags.Ephemeral }).catch(() => { });
    return false;
  };

  const collector = message.createMessageComponentCollector({ filter, time: 3 * 60 * 1000 });

  let page = 1;
  let paged = false;

  collector.on('collect', async i => {
    const { guild } = i.message;

    if (i.customId === 'command_list') {
      paged = true;
      const { embed, totalPages } = await buildPagedEmbed(i.user, guild.id, client, page);
      return await i.update({
        embeds: [embed],
        components: totalPages > 1 ? [navRow()] : []
      });
    }

    if (!paged) return;

    const prefix = await getPrefixForServer(guild.id);
    const commands = commandDefs(prefix);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(commands.length / itemsPerPage);

    page = i.customId === 'help_prev'
      ? (page > 1 ? page - 1 : totalPages)
      : (page < totalPages ? page + 1 : 1);

    const { embed } = await buildPagedEmbed(i.user, guild.id, client, page);
    await i.update({ embeds: [embed], components: [navRow()] });
  });

  collector.on('end', () => {
    // Disable buttons
    const disabled = new ActionRowBuilder().addComponents(
      message.components[0].components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    );
    message.edit({ components: [disabled] }).catch(() => { });
  });
}