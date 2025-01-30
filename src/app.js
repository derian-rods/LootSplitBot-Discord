import {
  Client,
  Partials,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import dotenv from "dotenv";
import http from "http";
import { url } from "inspector";

dotenv.config();
const { TOKEN, CLIENT_ID } = process.env;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
});

let eventName;
let creatorEventName;
client.once("ready", async () => {
  console.log(`Ready running as ${client.user?.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error("Bot is not in any guilds.");
    return;
  }

  const commands = [
    new SlashCommandBuilder()
      .setName("lootsplit")
      .setDescription("Manage loot split events")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("create")
          .setDescription("Create a new loot split event")
          .addStringOption((option) =>
            option
              .setName("event_name")
              .setDescription("The name of the event")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("list")
          .setDescription("List users with the loot-split role")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("clear")
          .setDescription("Clear the loot-split role from all users")
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("help").setDescription("Show help message")
      ),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === "lootsplit") {
    const subcommand = options.getSubcommand();
    const roleName = "💰 Loot Split";
    const role = interaction.guild.roles.cache.find((r) => r.name === roleName);

    if (!role) {
      await sendEmbed(
        interaction,
        "Error",
        `Role "${roleName}" not found`,
        0xff0000,
        true
      );
      return;
    }

    switch (subcommand) {
      case "create":
        await handleCreate(interaction, role);
        break;
      case "list":
        await handleList(interaction, role);
        break;
      case "clear":
        await handleClear(interaction, role);
        break;
      case "help":
        await handleHelp(interaction);
        break;
    }
  }
});

async function handleCreate(interaction, role) {
  eventName = interaction.options.getString("event_name");
  creatorEventName = interaction.member.displayName;
  const button = new ButtonBuilder()
    .setCustomId("assignRole")
    .setLabel("Reacting to Loot Split")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🪙");

  const row = new ActionRowBuilder().addComponents(button);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Event: ${eventName}`)
    .setDescription(`Click the button to get the 💰 Loot Split`)
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
  const sentMessage = await interaction.fetchReply();

  const filter = (i) => i.customId === "assignRole";
  const collector = sentMessage.createMessageComponentCollector({
    filter,
    time: 300000, // 5 minutes
  });

  collector.on("collect", async (i) => {
    if (!i.isButton()) return;

    const member = i.member;
    if (member.roles.cache.has(role.id)) {
      await sendEmbed(
        i,
        "Error",
        "You already have the Loot Split",
        0xff0000,
        true
      );
      return;
    }

    try {
      await member.roles.add(role);
      await sendEmbed(
        i,
        "Success",
        `You have been assigned the Loot Split`,
        0x00ff00,
        true
      );
    } catch (error) {
      console.log(error);
      await sendEmbed(
        i,
        "Error",
        "An error occurred while assigning the Loot Split",
        0xff0000,
        true
      );
    }
  });

  collector.on("end", async () => {
    const disabledButton = new ButtonBuilder()
      .setCustomId("assignRole")
      .setLabel("Assign Role")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🪙")
      .setDisabled(true);

    const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

    await sentMessage.edit({ components: [disabledRow] });
  });
}

async function handleList(interaction, role) {
  const membersWithRole = role.members
    .map((member) => member.displayName)
    .join("\n");
  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`${eventName || " "}`)
    .setDescription(
      `Event created by: ${creatorEventName || "Loot Split"}\n` +
        `Reactions: ${role.members.size}\n\n` +
        (membersWithRole || "No users have the Loot Split")
    )
    .setThumbnail(
      "https://drive.google.com/u/0/drive-viewer/AKGpihbq0Yrue6G6aCRfxP3MqnjPh_CDWT81H-N9os3I5rvKsLUYgVIMWlGaHO6GzKjTqAN7EvOt4nk1wXfKqimSrxKgay-HIjK_xl4=s1600-rw-v1"
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleClear(interaction, role) {
  for (const member of role.members.values()) {
    try {
      await member.roles.remove(role);
      creatorEventName = null;
    } catch (error) {
      console.error(
        `Failed to remove Loot Split from ${member.displayName}:`,
        error
      );
    }
  }

  await sendEmbed(interaction, "Success", "All roles removed", 0x00ff00);
}

async function handleHelp(interaction) {
  const description =
    "`/lootsplit create <event_name>` - Create a new loot split event\n" +
    "`/lootsplit list` - List users with the Loot Split\n" +
    "`/lootsplit clear` - Clear the Loot Split from all users\n" +
    "`/lootsplit help` - Show this help message";
  await sendEmbed(interaction, "LootSplit Commands", description, 0x00ff00);
}

async function sendEmbed(
  interaction,
  title,
  description,
  color,
  ephemeral = false
) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);
  await interaction.reply({ embeds: [embed], ephemeral });
}

client.login(TOKEN);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  client.login(TOKEN);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown", error);
  client.login(TOKEN);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
