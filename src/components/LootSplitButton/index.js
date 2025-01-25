import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";

export const LootSplitButton = () => {
  const embed = new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("Loot Split")
    .setDescription("Reacciona al loot split");
  const button = new ButtonBuilder()
    .setCustomId("lootsplit")
    .setLabel("Reaccionar al loot split")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🪙");

  const row = new ActionRowBuilder().addComponents(button);
  const lootSplitButton = {
    embeds: [embed],
    components: [row],
  };
  return lootSplitButton;
};
