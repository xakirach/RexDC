// Import Discord.js and moment-timezone
const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes } = require("discord.js");
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

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not found in .env file!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("CLIENT_ID not found in .env file!");
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

  // Log combined with enter
  console.log(
    `[${category}]\n` +
    `Current time: ${now.format("YYYY-MM-DD HH:mm:ss z")}\n` +
    `Target time: ${target.format("YYYY-MM-DD HH:mm:ss z")}`
  );

  return target.diff(now); // Time in milliseconds
}

// Auto response (listening to messages)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const messageContent = message.content.toLowerCase();
  const responses = {
    kontol: ["Watch your mouth!🫵", "Weitsss", "Prittt"],
    memek: ["Type like you've never learned religion", "Stay calm, buddy"],
    ngentot: ["Type correctly", "It's normal, bro!"],
  };

  for (const keyword in responses) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(messageContent)) {
      const response = responses[keyword][Math.floor(Math.random() * responses[keyword].length)];
      message.reply(response);
      return;
    }
  }
});

// Scheduled message function
client.once("ready", () => {
  console.log(`Bot successfully logged in as ${client.user.tag}`);

  // Set bot status
  try {
    client.user.setActivity({
      name: "This Server",
      type: ActivityType.Watching, // Activity type (PLAYING, STREAMING, LISTENING, WATCHING)
    });
    console.log("Bot status successfully set!");
  } catch (error) {
    console.error("Failed to set bot status:", error);
  }

  const channelId = "1303385941540606096"; // Replace with your channel ID
  const timeZone = "Asia/Jakarta"; // Replace with your desired timezone

  // Scheduled messages with grouping
  const scheduleMessages = {
    MorningMessages: [
      {
        hour: 7,
        minute: 0,
        messages: [
          "@everyone Good morning everyone! New day, new energy. Let’s gooo🚀",
          "Good morning... stay positive today!💪 @everyone",
          "@everyone Good morning guys!🌞",
        ],
      },
    ],
    FridayMessages: [
      {
        day: 5, // Friday (0 = Sunday, 1 = Monday, ..., 5 = Friday)
        hour: 11,
        minute: 30,
        messages: [
          "@everyone Don't forget to pray Friday prayer!🕌",
          "Guys who are men, pray Friday prayer!🕌",
          "Pray five times a day rarely, at least don't skip Friday prayer🕌 @everyone",
        ],
      },
    ],
  };

  // Iterate through scheduled messages
  for (const category in scheduleMessages) {
    const messages = scheduleMessages[category];

    for (const schedule of messages) {
      const timeUntilNextSchedule = getTimeUntil(
        schedule.hour,
        schedule.minute,
        timeZone,
        schedule.day,
        schedule,
        category // Add category to the call
      );

      const hours = Math.floor(timeUntilNextSchedule / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilNextSchedule % (1000 * 60 * 60)) / (1000 * 60));
      console.log(
        `Scheduled message will be sent in ${hours} hours ${minutes} minutes.`
      );

      // Set first message sending
      setTimeout(() => {
        client.channels
          .fetch(channelId)
          .then((channel) => {
            if (!channel) {
              console.error(`Channel with ID ${channelId} not found.`);
              return;
            }
            const randomMessage = schedule.messages[Math.floor(Math.random() * schedule.messages.length)];
            channel.send(randomMessage);

            // Schedule message sending every 24 hours after that (or one week if specific day)
            const intervalTime = schedule.day !== undefined ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
            setInterval(() => {
              const randomMessage = schedule.messages[Math.floor(Math.random() * schedule.messages.length)];
              channel.send(randomMessage);
            }, intervalTime); // 24 hours or one week in milliseconds
          })
          .catch((error) => {
            console.error(`Failed to fetch channel or send message: ${error}`);
          });
      }, timeUntilNextSchedule);
    }
  }

  // Registering /chat command globally
  const commands = [
    new SlashCommandBuilder()
      .setName('chat')
      .setDescription('Send a message via bot')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Enter the message you want to send')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('reply')
      .setDescription('Reply to a message via bot')
      .addStringOption(option =>
        option.setName('reply_message')
          .setDescription('Enter the reply message you want to send')
          .setRequired(true))
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  (async () => {
    try {
      console.log('Starting command (/).');

      // Registering commands globally
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );

      console.log('Commands successfully applied.');
    } catch (error) {
      console.error(error);
    }
  })();
});

// Event when there is an interaction (slash command)
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'chat') {
    const member = interaction.member;
    const isOwner = member.id === interaction.guild.ownerId;
    const isAdmin = member.roles.cache.some(role => role.name === '🚔Administrator');

    if (!isOwner && !isAdmin) {
      return await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }        

    const message = interaction.options.getString('message');

    await interaction.reply({ content: "Message successfully sent!", ephemeral: true });

    await interaction.channel.send(message).catch(error => {
      console.error(`Failed to send message: ${error}`);
    });
  }

  if (interaction.commandName === 'reply') {
    const member = interaction.member;
    const isOwner = member.id === interaction.guild.ownerId;
    const isAdmin = member.roles.cache.some(role => role.name === '🚔Administrator');

    if (!isOwner && !isAdmin) {
      return await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const replyMessage = interaction.options.getString('reply_message');

    // Get the last message that the user replied to
    const fetchedMessages = await interaction.channel.messages.fetch({ limit: 50 });
    const lastMessage = fetchedMessages.last(); // The last message is the one we want to reply to

    if (!lastMessage) {
      return await interaction.reply({ content: "No message found to reply to.", ephemeral: true });
    }

    try {
      await lastMessage.reply(replyMessage);
      await interaction.reply({ content: "Reply sent successfully!", ephemeral: true });
    } catch (error) {
      console.error(`Failed to reply to message: ${error}`);
      await interaction.reply({ content: "Failed to send reply. Please try again.", ephemeral: true });
    }
  }
});

// Login bot
client.login(BOT_TOKEN);
