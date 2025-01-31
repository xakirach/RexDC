// Import Discord.js dan moment-timezone
const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes } = require("discord.js");
const moment = require("moment-timezone");
require("dotenv").config();

// Buat instance bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Token bot Anda
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN tidak ditemukan di file .env!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("CLIENT_ID tidak ditemukan di file .env!");
  process.exit(1);
}

// Fungsi untuk menghitung waktu hingga jadwal berikutnya
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

  // Log gabungan dengan enter
  console.log(
    `[${category}]\n` +
    `Waktu sekarang: ${now.format("YYYY-MM-DD HH:mm:ss z")}\n` +
    `Waktu target: ${target.format("YYYY-MM-DD HH:mm:ss z")}`
  );

  return target.diff(now); // Waktu dalam milidetik
}

// Auto response (mendengarkan pesan)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const messageContent = message.content.toLowerCase();
  const responses = {
    kontol: ["jaga mulut lu!🫵", "weitsss", "prittt"],
    memek: ["ketikan lu kek ga pernah belajar agama", "santai kawan"],
    ngentot: ["ngetik yang bener", "biasa aja bos!"],
  };

  for (const keyword in responses) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(messageContent)) {
      const response =
        responses[keyword][
          Math.floor(Math.random() * responses[keyword].length)
        ];
      message.reply(response);
      return;
    }
  }
});

// Fungsi pesan terjadwal
client.once("ready", () => {
  console.log(`Bot berhasil login sebagai ${client.user.tag}`);

  // Set status bot
  try {
    client.user.setActivity({
      name: "This Server",
      type: ActivityType.Watching, // Jenis aktivitas (PLAYING, STREAMING, LISTENING, WATCHING)
    });
    console.log("Status bot berhasil diatur!");
  } catch (error) {
    console.error("Gagal mengatur status bot:", error);
  }

  const channelId = "1303385941540606096"; // Ganti dengan ID channel
  const timeZone = "Asia/Jakarta"; // Ganti dengan zona waktu yang diinginkan

  // Jadwal pesan dengan pengelompokan
  const scheduleMessages = {
    PesanPagi: [
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
    PesanJumat: [
      {
        day: 5, // Hari Jumat (0 = Minggu, 1 = Senin, ..., 5 = Jumat)
        hour: 11,
        minute: 30,
        messages: [
          "@everyone Jangan lupa sholat jumat kawan!🕌",
          "Yang merasa laki, sholat jumat bre @everyone",
          "Sholat lima waktu jarang, paling ga sholat jumat jangan skip🕌 @everyone",
        ],
      },
    ],
  };

  // Iterasi melalui jadwal pesan
  for (const category in scheduleMessages) {
    const messages = scheduleMessages[category];

    for (const schedule of messages) {
      const timeUntilNextSchedule = getTimeUntil(
        schedule.hour,
        schedule.minute,
        timeZone,
        schedule.day,
        schedule,
        category // Menambahkan kategori ke dalam pemanggilan
      );

      const hours = Math.floor(timeUntilNextSchedule / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilNextSchedule % (1000 * 60 * 60)) / (1000 * 60));
      console.log(
        `Pesan terjadwal akan terkirim dalam ${hours} jam ${minutes} menit.`
      );

      // Atur pengiriman pesan pertama
      setTimeout(() => {
        client.channels
          .fetch(channelId)
          .then((channel) => {
            if (!channel) {
              console.error(`Channel dengan ID ${channelId} tidak ditemukan.`);
              return;
            }
            const randomMessage =
              schedule.messages[
                Math.floor(Math.random() * schedule.messages.length)
              ];
            channel.send(randomMessage);

            // Jadwalkan pengiriman pesan setiap 24 jam setelahnya (atau seminggu jika spesifik hari)
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
            }, intervalTime); // 24 jam atau seminggu dalam milidetik
          })
          .catch((error) => {
            console.error(`Gagal mengambil channel atau mengirim pesan: ${error}`);
          });
      }, timeUntilNextSchedule);
    }
  }

  // Mendaftarkan perintah /chat secara global
  const commands = [
    new SlashCommandBuilder()
      .setName('chat')
      .setDescription('Kirim pesan melalui bot')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Masukkan pesan yang ingin dikirim')
          .setRequired(true))
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  (async () => {
    try {
      console.log('Memulai penyebaran perintah (/).');

      // Mendaftarkan perintah secara global
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );

      console.log('Perintah berhasil diterapkan.');
    } catch (error) {
      console.error(error);
    }
  })();
});

// Event ketika ada interaksi (perintah slash)
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'chat') {
    const member = interaction.member;
    const isOwner = member.id === interaction.guild.ownerId;
    const isAdmin = member.roles.cache.some(role => role.name === '🚔Administrator');

    //console.log(`User ID: ${member.id}, Is Owner: ${isOwner}, Is Admin: ${isAdmin}`);

    if (!isOwner && !isAdmin) {
      return await interaction.reply({ content: "Anda tidak memiliki izin untuk menggunakan perintah ini.", ephemeral: true });
    }        

    const message = interaction.options.getString('message');

    await interaction.reply({ content: "Pesan berhasil terkirim!", ephemeral: true });

    await interaction.channel.send(message).catch(error => {
      console.error(`Gagal mengirim pesan: ${error}`);
    });
  }
});

// Login bot
client.login(BOT_TOKEN);