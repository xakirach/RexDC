// Import Discord.js and moment-timezone
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");
const { MessageFlags } = require("discord-api-types/v10");
const moment = require("moment-timezone");
require("dotenv").config();

// Create bot instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot token and client ID
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!BOT_TOKEN || !CLIENT_ID) {
  console.error("Missing BOT_TOKEN or CLIENT_ID in .env file!");
  process.exit(1);
}

// Function to calculate time until next schedule
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
    `[${category}]\n` +
      `Current time: ${now.format("YYYY-MM-DD HH:mm:ss z")}\n` +
      `Target time: ${target.format("YYYY-MM-DD HH:mm:ss z")}`
  );

  return target.diff(now);
}

// Auto response (bad words)
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

// Scheduled message system
client.once("ready", () => {
  console.log(`Bot successfully logged in as ${client.user.tag}`);

  // Set bot status
  try {
    client.user.setActivity({
      name: "This Server",
      type: ActivityType.Watching,
    });
    console.log("Bot status set.");
  } catch (error) {
    console.error("Failed to set bot status:", error);
  }

  const channelId = "1303385941540606096"; // Replace with your channel ID
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
    for (const schedule of scheduleMessages[category]) {
      const timeUntilNextSchedule = getTimeUntil(
        schedule.hour,
        schedule.minute,
        timeZone,
        schedule.day,
        schedule,
        category
      );

      const hours = Math.floor(timeUntilNextSchedule / (1000 * 60 * 60));
      const minutes = Math.floor(
        (timeUntilNextSchedule % (1000 * 60 * 60)) / (1000 * 60)
      );
      console.log(
        `Scheduled message in ${hours} hours ${minutes} minutes.`
      );

      setTimeout(() => {
        client.channels
          .fetch(channelId)
          .then((channel) => {
            if (!channel) {
              console.error(`Channel ID ${channelId} not found.`);
              return;
            }

            const randomMessage =
              schedule.messages[
                Math.floor(Math.random() * schedule.messages.length)
              ];
            channel.send(randomMessage);

            const intervalTime =
              schedule.day !== undefined
                ? 7 * 24 * 60 * 60 * 1000
                : 24 * 60 * 60 * 1000;

            setInterval(() => {
              const randomMessage =
                schedule.messages[
                  Math.floor(Math.random() * schedule.messages.length)
                ];
              channel.send(randomMessage);
            }, intervalTime);
          })
          .catch((error) => {
            console.error(`Error fetching channel or sending message: ${error}`);
          });
      }, timeUntilNextSchedule);
    }
  }

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName("chat")
      .setDescription("Send a message through the bot")
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Enter the message you want to send")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("reply")
      .setDescription("Reply to a message through the bot")
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("Enter the message ID to reply to")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reply_message")
          .setDescription("Enter the reply message")
          .setRequired(true)
      ),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

  (async () => {
    try {
      console.log("Registering slash commands...");
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Commands registered successfully.");
    } catch (error) {
      console.error(error);
    }
  })();
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const member = interaction.member;
  const isOwner = member.id === interaction.guild.ownerId;
  const isAdmin = member.roles.cache.some(
    (role) => role.name === "☠️Overlord"
  );

  if (!isOwner && !isAdmin) {
    return await interaction.reply({
      content: "You do not have permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.commandName === "chat") {
    const message = interaction.options.getString("message");

    await interaction.reply({
      content: "Message successfully sent!",
      flags: MessageFlags.Ephemeral,
    });

    await interaction.channel.send(message).catch((error) => {
      console.error(`Failed to send message: ${error}`);
    });
  }

  if (interaction.commandName === "reply") {
    const messageId = interaction.options.getString("message_id");
    const replyMessage = interaction.options.getString("reply_message");

    try {
      const message = await interaction.channel.messages.fetch(messageId);
      if (!message) {
        return await interaction.reply({
          content: "Message not found.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await message.reply(replyMessage);
      await interaction.reply({
        content: "Reply sent successfully!",
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error(`Failed to fetch or reply to message: ${error}`);
      await interaction.reply({
        content: "Failed to reply to message. Please check the message ID.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// Login bot
client.login(BOT_TOKEN);