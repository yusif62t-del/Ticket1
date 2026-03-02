const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const express = require('express');

// --- 🌐 خادم الويب للبقاء حياً 24 ساعة ---
const app = express();
app.get('/', (req, res) => { res.send('SP8 Ticket Bot is Online!'); });
app.listen(3000, () => { console.log('✅ خادم الويب جاهز على المنفذ 3000'); });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// --- ⚙️ الإعدادات الأصلية الخاصة بك ---
const CLOSED_CATEGORY_ID = '1477924415982534666'; 
const LOGO_URL = 'https://cdn.discordapp.com/attachments/1414721768714797208/1477926712196071434/87884DD4-16E0-48A9-AE6B-4CEBC81783DA.png'; 

const CONFIG = {
    support: { role: '1477660079275901069', category: '1477660330204070083', label: 'استفسار' },
    transfer: { role: '1477660062171402577', category: '1477924687949332636', label: 'نقل' },
    store: { role: '1477660043842158674', category: '1477924744191021099', label: 'شراء من المتجر' },
    higher_admin: { role: '1477660055859105963', category: '1477924998831149116', label: 'شكوى ضد إدارة عليا' },
    admin_comp: { role: '1477660091854487654', category: '1477925187319234714', label: 'شكوى ضد إداري' },
    citizen_comp: { role: '1477660084510130207', category: '1477925414143004693', label: 'شكوى ضد مواطن' },
    dev_apply: { role: '1477660043842158674', category: '1477925319762772069', label: 'تقديم على فريق التطوير' }
};

const ticketTimers = new Map();
const ticketData = new Map();

// --- 🏁 حدث تشغيل البوت ---
client.once('ready', () => {
    console.log(`✅✅✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
    console.log(`✅ نظام التكت جاهز للعمل 24/7`);
});

// --- 🛠️ أمر إنشاء قائمة التكتات (Setup) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_ticket')
                    .setPlaceholder('اختر نوع التذكرة التي تريد فتحها')
                    .addOptions(Object.keys(CONFIG).map(key => ({
                        label: CONFIG[key].label,
                        value: key
                    })))
            );

        const embed = new EmbedBuilder()
            .setTitle('نظام التذاكر | sp8')
            .setDescription('يرجى اختيار القسم المناسب من القائمة بالأسفل لفتح تذكرة.')
            .setImage(LOGO_URL)
            .setColor('#D4AF37');

        await message.channel.send({ embeds: [embed], components: [row] });
        return message.delete().catch(() => {});
    }
});

// --- 📩 معالجة التفاعلات (القائمة والأزرار) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {
        await interaction.deferReply({ ephemeral: true });
        const selected = CONFIG[interaction.values[0]];
        
        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `${selected.label}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: selected.category,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: selected.role, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            ticketData.set(ticketChannel.id, { userId: interaction.user.id, claimer: 'لم يتم الاستلام' });
            await interaction.editReply({ content: `تم فتح تذكرتك بنجاح: ${ticketChannel}` });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`claim_${selected.role}`).setLabel('استلام التكت').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ 
                content: `🔔 منشن للمسؤولين: <@&${selected.role}>`, 
                embeds: [new EmbedBuilder().setTitle(`قسم ${selected.label}`).setDescription(`حياك الله <@${interaction.user.id}>، تفضل بطرح استفسارك.`).setColor('#D4AF37')],
                components: [buttons]
            });
        } catch (e) {
            console.error("خطأ في إنشاء التكت:", e);
            await interaction.editReply({ content: "❌ حدث خطأ، تأكد من صلاحيات البوت." });
        }
    }

    if (interaction.isButton()) {
        const data = ticketData.get(interaction.channel.id) || { userId: interaction.user.id };

        if (interaction.customId.startsWith('claim_')) {
            const roleId = interaction.customId.split('_')[1];
            if (!interaction.member.roles.cache.has(roleId)) return interaction.reply({ content: "❌ لست من فريق العمل المخول.", ephemeral: true });
            
            ticketData.set(interaction.channel.id, { ...data, claimer: `<@${interaction.user.id}>` });
            await interaction.reply({ content: `✅ تم استلام التكت بواسطة: <@${interaction.user.id}>` });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply("🔒 جاري إغلاق التكت وأرشفته...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

// --- 🔑 محاولة تسجيل الدخول الذكية ---
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error("❌ خطأ حرج: لم يتم العثور على TOKEN في إعدادات Render!");
} else {
    client.login(TOKEN).catch(err => {
        console.error("❌ فشل الاتصال بديسكورد. تأكد من صحة التوكن:", err.message);
    });
}
