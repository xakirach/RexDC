// Import Discord.js and moment-timezone
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");
const moment = require("moment-timezone");
require("dotenv").config();

// Env Validation
["BOT_TOKEN", "CLIENT_ID"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`${key} not found in .env file!`);
    process.exit(1);
  }
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Create bot instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Permission Check
function isAuthorized(member, guild) {
  return (
    member.id === guild.ownerId ||
    member.roles.cache.some((role) => role.name === "☠️Overlord")
  );
}

// Time until schedule
function getTimeUntil(hour, minute, timeZone, day, schedule, category) {
  const now = moment().tz(timeZone);
  let target = now.clone().hour(hour).minute(minute).second(0).millisecond(0);

  if (day !== undefined) {
    const currentDay = now.day();
    const daysUntilTarget = (day - currentDay + 7) % 7;
    target.add(daysUntilTarget, "days");
  }

  if (target.isBefore(now)) {
    target.add(day !== undefined ? 7 : 1, "days");
  }

  console.log(
    `[${category}]\nCurrent: ${now.format()} \nTarget: ${target.format()}`
  );

  return target.diff(now);
}

// Send scheduled message
function sendScheduledMessage(channelId, schedule) {
  client.channels
    .fetch(channelId)
    .then((channel) => {
      if (!channel) {
        console.error(`Channel with ID ${channelId} not found.`);
        return;
      }
      const randomMessage =
        schedule.messages[
          Math.floor(Math.random() * schedule.messages.length)
        ];
      channel.send(randomMessage);
    })
    .catch((error) => {
      console.error(`Failed to fetch channel or send message: ${error}`);
    });
}

// Auto response
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const messageContent = message.content.toLowerCase();
  const responses = {
    "kontol,kntol,ktol": ["jaga mulut lu!🫵", "Weitsss", "Prittt"],
    "memek,mmek,mmk": [
      "ketikan lu kek ga pernah belajar agama",
      "santai cuy",
      "bahasa lu jelek",
    ],
    "ngentot,ngntot": ["ngetik yang bener", "biasa aja sob!"],
  };

  for (const keywords in responses) {
    const keywordArray = keywords.split(",");
    for (const keyword of keywordArray) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(messageContent)) {
        const response =
          responses[keywords][
            Math.floor(Math.random() * responses[keywords].length)
          ];
        message.reply(response);
        return;
      }
    }
  }
});

// On bot ready
client.once("ready", () => {
  console.log(`Bot successfully logged in as ${client.user.tag}`);

  try {
    client.user.setActivity({
      name: "This Server",
      type: ActivityType.Watching,
    });
    console.log("Bot status successfully set!");
  } catch (error) {
    console.error("Failed to set bot status:", error);
  }

  const channelId = "1303385941540606096";
  const timeZone = "Asia/Jakarta";

  const scheduleMessages = {
    MorningMessages: [
      {
        hour: 7,
        minute: 0,
        messages: [
          "@everyone Pagi semuanya! Hari baru, semangat baru. Let’s gooo🚀",
          "Pagiii... semangat ngadepin dunia hari ini!💪 @everyone",
          "@everyone Selamat pagi guys!🌞",
        ],
      },
    ],
    FridayMessages: [
      {
        day: 5,
        hour: 11,
        minute: 30,
        messages: [
          "@everyone Jangan lupa sholat jumat kawan!🕌",
          "Yang merasa laki, sholat jumat bre🕌 @everyone",
          "Sholat lima waktu jarang, paling ga sholat jumat jangan skip!🕌 @everyone",
        ],
      },
    ],
  };

  for (const category in scheduleMessages) {
    const messages = scheduleMessages[category];
    for (const schedule of messages) {
      const timeUntil = getTimeUntil(
        schedule.hour,
        schedule.minute,
        timeZone,
        schedule.day,
        schedule,
        category
      );

      const intervalTime =
        schedule.day !== undefined
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

      setTimeout(() => {
        sendScheduledMessage(channelId, schedule);
        setInterval(() => {
          sendScheduledMessage(channelId, schedule);
        }, intervalTime);
      }, timeUntil);
    }
  }

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName("chat")
      .setDescription("Send a message through the bot")
      .addStringOption((option) =>
        option.setName("message").setDescription("Message").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("reply")
      .setDescription("Reply to a message through the bot")
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("Message ID")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reply_message")
          .setDescription("Reply Message")
          .setRequired(true)
      ),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

  (async () => {
    try {
      console.log("Registering slash commands...");
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Commands successfully registered.");
    } catch (error) {
      console.error(error);
    }
  })();
});

// Interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { member, guild, channel, commandName } = interaction;

  if (!isAuthorized(member, guild)) {
    return interaction.reply({
      content: "You do not have permission to use this command.",
      ephemeral: true,
    });
  }

  if (commandName === "chat") {
    const message = interaction.options.getString("message");
    await interaction.reply({ content: "Message sent!", ephemeral: true });
    await channel.send(message).catch((err) =>
      console.error("Failed to send message:", err)
    );
  }

  if (commandName === "reply") {
    const messageId = interaction.options.getString("message_id");
    const replyMessage = interaction.options.getString("reply_message");

    try {
      const targetMessage = await channel.messages.fetch(messageId);
      if (!targetMessage) {
        return interaction.reply({
          content: "Message not found.",
          ephemeral: true,
        });
      }
      await targetMessage.reply(replyMessage);
      await interaction.reply({
        content: "Reply sent successfully!",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Reply failed:", error);
      await interaction.reply({
        content: "Failed to reply. Check the message ID.",
        ephemeral: true,
      });
    }
  }
});

// Login
client.login(BOT_TOKEN);