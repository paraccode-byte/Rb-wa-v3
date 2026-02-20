import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import qrcode from 'qrcode-terminal';
import Ffmpeg from 'fluent-ffmpeg';
import { JSONFilePreset } from 'lowdb/node';
import * as fs from 'fs';
import sharp from 'sharp';
import create_img from './create_img.js';
import create_stiker from './create_stiker.js';
import generateImage from './ai/img_maker.js';
import gemini from './ai/chat_ai.js';
import search_Anime from './search_anime.js';
import anime_chat from './ai/chat_anime.js';
import audiomaker from './ai/audio_maker.js';
import handle_list from './handle/list_handle.js';
import handle_cek from './handle/cek_handle.js';
import stiker_handle from './handle/stiker_handle.js';
import img_handle from './handle/img_handle.js';
import vid_handle from './handle/vid_handle.js';
import get_lirik from './handle/lirik_handle.js';
import get_musik from './handle/musik_handle.js';
import get_info from './handle/info_anim_handle.js';
import get_surah from './islamic_dataset/quran.js';
import get_audio from './islamic_dataset/audio_surah.js';
import get_time from './islamic_dataset/solat_schedule.js';
import { list, cek, stiker, img, vid, topup, pulsa, vcr, game, char, cari_anim } from './menu_array.js';
import { verify, url_banner, nameBot } from './verif.js';
import menu from './menu.js';
import add from './add_data.js';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        defaultQueryTimeoutMs: undefined,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus karena:', lastDisconnect.error, ', mencoba hubungkan kembali:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Bot sudah terhubung ke WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
    const messageHistory = {};
    sock.ev.on('messages.upsert', async m => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];

        const remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            msg.message.extendedTextMessage?.text ||
            "";

        if (remoteJid === '104105779396783@lid') {
            if (text.startsWith('.getinfo')) {
                console.log(`menerima perintah ✅`)
                try {
                    const link = text.replace('.getinfo', '').trim();
                    if (!link) return await sock.sendMessage(remoteJid, { text: 'masukan link!' })
                    const match = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]{20,26})/);
                    const code = match ? match[1] : null;
                    if (!code) {
                        throw new Error("Link invite tidak valid!");
                    }
                    const grupinfo = await sock.groupGetInviteInfo(code);
                    console.log(grupinfo);
                    const format = `*--- Informasi Grup Ditemukan ---*\n\n` +
                        `JID Grup  : ${grupinfo.id}\n` +
                        `Nama      : ${grupinfo.subject}\n` +
                        `Pembuat   : ${grupinfo.owner}\n` +
                        `Deskripsi : ${grupinfo.desc}`
                    await sock.sendMessage(remoteJid, {
                        text: format
                    }, { quoted: msg })
                } catch (error) {
                    console.error(error)
                    await sock.sendMessage(remoteJid, {
                        text: 'Nomor bot tidak ada dalam group'
                    }, { quoted: msg })
                }
            }
            if (text.startsWith('.add-data')) {
                const data_array = text.split('|');
                if (data_array.length < 4) {
                    return await sock.sendMessage(remoteJid, {
                        text: 'Format salah!'
                    }, { quoted: msg });
                }
                try {
                    console.log('Menambahkan data...');
                    const name = data_array[1].trim();
                    const jid = data_array[2].trim();
                    const url = data_array[3].trim();
                    await add(name, jid, url);
                    await sock.sendMessage(remoteJid, {
                        text: `Data berhasil ditambahkan! ✅\n\nID: ${name}\nJID: ${jid}`
                    }, { quoted: msg });
                } catch (error) {
                    await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat menambah data. ❌' }, { quoted: msg });
                    console.error(error);
                }
            }
        }

        const grupIndex = await verify(remoteJid);
        if (grupIndex === false) return

        const msgType = Object.keys(msg.message)[0];
        if (!msg.message) return;
        const sender = msg.key.participantAlt || msg.key.remoteJid;
        const no_link_json = JSON.parse(fs.readFileSync('./no_link.json', "utf-8"));
        for (let key in no_link_json[grupIndex]) {
            const filter = no_link_json[grupIndex][key];
            if (filter.condition === 'on' && text.includes(filter.link)) {
                console.log(`Link terlarang (${key}) ditemukan`);
                await sock.sendMessage(remoteJid, { delete: msg.key });
                await sock.sendMessage(remoteJid, {
                    text: "⚠️ Pesan otomatis dihapus karena mengandung link terlarang."
                });
                break;
            }
        }
        const toxic = await JSONFilePreset('./toxic.json', {})
        const toxic_word = ['anjing', 'babi', 'asu', 'bangsat', 'tolol', 'goblok', 'memek', 'peler', 'ngentot', 'ajg', 'mmk', 'gblk'];
        const find_teks = toxic_word.some(w => text.toLowerCase().includes(w));
        if (toxic.data[grupIndex] === 'on' && find_teks) {
            await sock.sendMessage(remoteJid, { delete: msg.key });
            await sock.sendMessage(remoteJid, { text: "⚠️ Pesan dihapus: Toxic terdeteksi." });
        }

        const spam = await JSONFilePreset('./spam.json', {})
        const now = Date.now();
        if (!messageHistory[sender]) {
            messageHistory[sender] = [];
        }
        messageHistory[sender].push(now);
        messageHistory[sender] = messageHistory[sender].filter(timestamp => now - timestamp < 10000);
        if (spam.data[grupIndex] === 'on' && messageHistory[sender].length > 4) {
            console.log(`Spam terdeteksi dari: ${sender}`);
            await sock.sendMessage(remoteJid, {
                text: `@${sender.split('@')[0]} Terdeteksi spam! Jangan flooding grup.`,
                mentions: [sender]
            });
            await sock.sendMessage(remoteJid, { delete: msg.key });
            messageHistory[sender] = [];
        }
        if (text === '.menu') {
            console.log(text)
            try {
                const url = await url_banner(grupIndex);
                const botname = await nameBot(grupIndex);
                await sock.sendMessage(remoteJid, {
                    image: { url: url },
                    caption: menu(botname)
                }, { quoted: msg }
                );
            } catch (err) {
                console.error('Gagal membaca file:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu sedang tidak tersedia.' });
            }
        }

        if (text === '.listmember' || text === '.member') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const metadata = await sock.groupMetadata(remoteJid);
                const listPeserta = metadata.participants.map(peserta => peserta.id);
                const jumlahAnggota = listPeserta.length;
                let pesan = `Daftar Anggota Grup *${metadata.subject}*\n`;
                pesan += `Total Anggota: ${jumlahAnggota}\n\n`;

                listPeserta.forEach((jid, index) => {
                    const nomor = jid.split('@')[0];
                    pesan += `${index + 1}. @${nomor}\n`;
                });

                await sock.sendMessage(remoteJid, {
                    text: pesan,
                    mentions: listPeserta
                }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membaca perintah', err.message);
                await sock.sendMessage(remoteJid, { text: 'Gagal mengambil data anggota grup.' });
            }
        }

        if (text === '.grup') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const list = fs.readFileSync('./list/list_group.txt', 'utf-8');
                await sock.sendMessage(remoteJid, { text: list }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membaca file:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub sedang tidak tersedia.' });
            }
        }

        if (text.startsWith('.makepolling')) {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const isiTeks = text.replace('.makepolling', '').trim();
                if (!isiTeks) {
                    return await sock.sendMessage(remoteJid, {
                        text: "❌ Format salah!\nContoh: *.makepolling Warna | merah/biru/hijau*"
                    });
                }
                const [judul, opsi] = isiTeks.split('|');
                if (!judul || !opsi) {
                    return await sock.sendMessage(remoteJid, {
                        text: "❌ Gunakan tanda | untuk memisahkan judul dan pilihan.\nContoh: *.makepolling Nama Buah | Apel/Jeruk*"
                    });
                }
                const values = opsi.split('/').map(v => v.trim()).filter(v => v !== '');
                if (values.length < 2) {
                    return await sock.sendMessage(remoteJid, { text: "❌ Berikan minimal 2 pilihan jawaban!" });
                }
                await sock.sendMessage(remoteJid, {
                    poll: {
                        name: judul.trim(),
                        values: values,
                        selectableCount: 1,
                    }
                }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membuat polling:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, polling sedang tidak tersedia.' });
            }
        }

        if (text === '.hidetag') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                const participants = groupMetadata.participants;
                const members = participants.map(p => p.id);
                const pesanTambahan = text.split(' ').slice(1).join(' ') || 'Halo semuanya!';
                await sock.sendMessage(remoteJid, {
                    text: pesanTambahan,
                    mentions: members
                }, { quoted: msg });
            } catch (err) {
                console.error('Gagal tag anggota:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub ini sedang tidak tersedia.' });
            }
        }

        if (text === '.visibeltag' || text === '.tagall') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                const participants = groupMetadata.participants;
                let teksTag = `*📢 TAG ALL MEMBERS*\n\n`;
                const membersJid = [];
                participants.forEach((mem, i) => {
                    teksTag += `${i + 1}. @${mem.id.split('@')[0]}\n`;
                    membersJid.push(mem.id);
                });
                teksTag += `\n*Total:* ${participants.length} Anggota`;
                await sock.sendMessage(remoteJid, {
                    text: teksTag,
                    mentions: membersJid
                }, { quoted: msg });
            } catch (err) {
                console.error('Gagal tag all:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub sedang tidak tersedia.' });
            }
        }

        if (text === '.listadmin') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                const participants = groupMetadata.participants;
                const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
                let teks = `*DAFTAR ADMIN GRUP*\n\n`;
                const adminMentions = [];
                admins.forEach((admin, i) => {
                    teks += `${i + 1}. @${admin.id.split('@')[0]}\n`;
                    adminMentions.push(admin.id);
                });
                teks += `\nTotal: ${admins.length} Admin`;
                await sock.sendMessage(remoteJid, {
                    text: teks,
                    mentions: adminMentions
                }, { quoted: msg });

            } catch (err) {
                console.error('Gagal mengambil daftar admin:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat mengambil data admin.' });
            }
        }

        if (text === '.linkgc') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const link = await sock.groupInviteCode(remoteJid);
                await sock.sendMessage(remoteJid, { text: `🔗link grup: https://chat.whatsapp.com/${link}` }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membaca file:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub sedang tidak tersedia.' });
            }
        }

        if (text === '.time') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const now = new Date();
                const waktuWIB = new Intl.DateTimeFormat("id-ID", {
                    timeZone: "Asia/Jakarta",
                    dateStyle: "full",
                    timeStyle: "medium"
                }).format(now);
                await sock.sendMessage(remoteJid, { text: waktuWIB }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membaca waktu:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub sedang tidak tersedia.' });
            }
        }

        if (text === '.namegc' || text === '.descgc') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const metadata = await sock.groupMetadata(remoteJid);
                const teks = text === '.namegc' ? metadata.subject : metadata.desc?.toString() || "Tidak ada deskripsi.";
                await sock.sendMessage(remoteJid, { text: teks }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membaca info grub:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub sedang tidak tersedia.' });
            }
        }

        if (text === '.ppgc') {
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) return await sock.sendMessage(remoteJid, { text: "Perintah ini hanya bisa digunakan di dalam grup!" });
            console.log(text)
            try {
                const pp = await sock.profilePictureUrl(remoteJid, 'image')
                await sock.sendMessage(remoteJid, {
                    image: { url: pp },
                    caption: 'Ini foto profil grupnya!'
                }, { quoted: msg });
            } catch (err) {
                console.error('Gagal membaca info grub:', err.message);
                await sock.sendMessage(remoteJid, { text: 'Maaf, menu groub sedang tidak tersedia.' });
            }
        }

        //list ....
        const flat_list = list.flat();
        if (flat_list.includes(text.toLowerCase())) {
            console.log(text);
            const result = await handle_list(text);
            await sock.sendMessage(remoteJid, { text: result }, { quoted: msg });
        }

        //cek ...
        const cek_ms = cek.find(p => text.startsWith(p))
        if (cek_ms) {
            console.log(cek_ms);
            const name = text.replace(cek_ms, '').trim();
            if (!name) return await sock.sendMessage(remoteJid, { text: `Masukkan namamu! Contoh: ${cek_ms} amba` });
            const result = handle_cek(cek_ms, name);
            await sock.sendMessage(remoteJid, { text: result }, { quoted: msg });
        }

        //teks to ...
        if (text.startsWith('.teks2img')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.teks2img', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Masukkan teksnya! Contoh: .teks2img Teks/baris2/baris3" });
                const buffer = await create_img(isiTeks);

                await sock.sendMessage(remoteJid, {
                    image: buffer,
                    caption: 'Ini adalah gambar hasil generate canvas!'
                }, { quoted: msg });

                console.log('Gambar berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal membuat gambar.' });
            }
        }

        if (text.startsWith('.teks2stiker')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.teks2stiker', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Masukkan teksnya! Contoh: .teks2stiker Teks/baris2/baris3" });

                const stiker = await create_stiker(isiTeks)
                await sock.sendMessage(remoteJid, {
                    sticker: stiker
                }, { quoted: msg });

                console.log('Stiker berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal membuat gambar.' });
            }
        }

        // AI 
        if (text.startsWith('.imgmaker')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.imgmaker', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Masukkan teksnya! Contoh: .imgmaker buat gambar orang" });
                console.log(`Generating image for: ${isiTeks}`);

                const img = await generateImage(isiTeks)

                await sock.sendMessage(remoteJid, {
                    image: img,
                    caption: '',
                }, { quoted: msg })

                console.log('Gambar berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal membuat gambar.' });
            }
        }

        if (text.startsWith('.chatai')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.chatai', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Tanyakan sesuatu! contoh: .chatai apa itu amba" });

                const answer = await gemini(isiTeks);

                await sock.sendMessage(remoteJid, { text: answer }, { quoted: msg })

                console.log('Jawaban berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Kena limit bro! tunggu 30 detik baru coba lagi' });
            }
        }

        if (text.startsWith('.audiomaker')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.audiomaker', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Ketik sesuatu! contoh: .audiomaker halo guys" });

                const audioBuffer = await audiomaker(isiTeks);

                await sock.sendMessage(remoteJid, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: false
                }, { quoted: msg })

                console.log('Audio berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal membuat Adio.' });
            }
        }

        //stiker
        const stiker_ms = stiker.find(p => p === text)
        if (stiker_ms) {
            console.log(text)
            try {
                const res = await stiker_handle(text)
                if (!res) {
                    return await sock.sendMessage(remoteJid, { text: 'Maaf, stiker tidak ditemukan di server.' });
                }
                await sock.sendMessage(remoteJid, {
                    sticker: res,
                    mimetype: 'image/webp'
                }, { quoted: msg }
                )
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal memuat stiker.' });
            }
        }
        if (text === '.stikerpp') {
            console.log(text)
            try {
                const image = await sharp("./pp.webp")
                    .webp()
                    .toBuffer()
                await sock.sendMessage(remoteJid, {
                    sticker: image,
                    mimetype: 'image/webp'
                }, { quoted: msg }
                )
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal memuat stiker.' });
            }
        }
        if (text === '.img2stiker') {
            console.log("Memproses stiker...");
            try {
                const isImage = msgType === 'imageMessage';
                const isQuotedImage = msgType === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage;
                if (!isImage && !isQuotedImage) {
                    return await sock.sendMessage(remoteJid, { text: 'Kirim gambar dengan caption .img2stiker atau balas gambar dengan .img2stiker' });
                }
                const messageToDownload = isQuotedImage ? {
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                } : msg;
                const buffer = await downloadMediaMessage(
                    messageToDownload,
                    'buffer',
                    {},
                    {
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
                const stickerBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp()
                    .toBuffer();
                await sock.sendMessage(remoteJid, {
                    sticker: stickerBuffer,
                    mimetype: 'image/webp'
                }, { quoted: msg });

            } catch (err) {
                console.error("Error Detail:", err);
                await sock.sendMessage(remoteJid, { text: 'Gagal memproses gambar menjadi stiker.' });
            }
        }

        if (text === '.vid2stiker') {
            console.log("Memproses video ke stiker...");
            try {
                const isVideo = msgType === 'videoMessage';
                const isQuotedVideo = msgType === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage?.videoMessage;
                if (!isVideo && !isQuotedVideo) {
                    return await sock.sendMessage(remoteJid, { text: '❌ Balas atau kirim video dengan caption .vid2stiker' });
                }
                const messageToDownload = isQuotedVideo ? {
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                } : msg;
                const buffer = await downloadMediaMessage(messageToDownload, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
                const fileName = `./temp_${Date.now()}`;
                const inputPath = `${fileName}.mp4`;
                const outputPath = `${fileName}.webp`;
                fs.writeFileSync(inputPath, buffer);
                Ffmpeg(inputPath)
                    .setStartTime('00:00:00')
                    .setDuration(3)
                    .outputOptions([
                        "-vcodec", "libwebp",
                        "-vf", "scale='min(512,iw)': 'min(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000",
                        "-lossless", "0",
                        "-compression_level", "6",
                        "-q:v", "30",
                        "-loop", "0",
                        "-preset", "picture",
                        "-an",
                        "-vsync", "0"
                    ])
                    .on('end', async () => {
                        const sticker = new Sticker(fs.readFileSync(outputPath), {
                            pack: 'My Bot',
                            author: 'Paras',
                            type: StickerTypes.FULL,
                            quality: 50
                        });
                        const result = await sticker.toBuffer();
                        console.log('berhasil membuat stiker')
                        await sock.sendMessage(remoteJid, { sticker: result }, { quoted: msg });
                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    })
                    .on('error', async (err) => {
                        console.error("FFmpeg Error:", err);
                        await sock.sendMessage(remoteJid, { text: '❌ Gagal memproses video.' });
                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    })
                    .save(outputPath)

            } catch (err) {
                console.error("Sistem Error:", err);
                await sock.sendMessage(remoteJid, { text: '❌ Terjadi kesalahan internal.' });
            }
        }
        //islamic
        if (text.startsWith('.kisahnabi')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.kisahnabi', '').trim().toLowerCase(); // Tambah toLowerCase()

                if (!isiTeks) {
                    return await sock.sendMessage(remoteJid, { text: "Ketik nama nabi! contoh: .kisahnabi adam" });
                }
                const rawData = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const dataJson = JSON.parse(rawData);
                const data_nabi = dataJson.prophet_story[isiTeks];
                if (!data_nabi) {
                    return await sock.sendMessage(remoteJid, { text: `Data nabi "${isiTeks}" tidak ditemukan.` });
                }
                const format = `✨ *Kisah ${data_nabi.nama}* ✨\n\n` +
                    `📍 *Tempat Lahir:* ${data_nabi.tempat_lahir}\n` +
                    `⏳ *Usia:* ${data_nabi.usia}\n` +
                    `🛡️ *Mukjizat:* ${data_nabi.mukjizat}\n\n` +
                    `📖 *Kisah:* \n${data_nabi.kisah_lengkap}`;

                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat memuat data.' });
            }
        }

        if (text.startsWith('.asmaulhusna')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.asmaulhusna', '').trim();
                const index = parseInt(isiTeks);
                if (!isiTeks || isNaN(index) || index < 1 || index > 99) {
                    return await sock.sendMessage(remoteJid, {
                        text: "Ketik urutannya! Contoh: *.asmaulhusna 10* (Pilih angka 1 - 99)"
                    });
                }
                const data = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const json = JSON.parse(data);
                const asmaulhusna = json.asmaul_husna[isiTeks];
                if (!asmaulhusna) {
                    return await sock.sendMessage(remoteJid, { text: "Data tidak ditemukan." });
                }
                const format =
                    `✨ *Asmaul Husna Ke-${isiTeks}* ✨\n\n` +
                    `*Nama:* ${asmaulhusna.nama}\n` +
                    `*Arab:* ${asmaulhusna.arab}\n` +
                    `*Arti:* ${asmaulhusna.arti}\n\n` +
                    `*Deskripsi:* \n${asmaulhusna.deskripsi}`;
                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat memuat data.' });
            }
        }
        if (text.startsWith('.bacaansholat')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.bacaansholat', '').trim();
                const index = parseInt(isiTeks);
                if (!isiTeks || isNaN(index) || index < 1 || index > 9) {
                    return await sock.sendMessage(remoteJid, {
                        text: "Ketik urutannya! Contoh: *.bacaansholat 5* (Pilih angka 1 - 9)"
                    });
                }
                const data = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const json = JSON.parse(data);
                const bacaan_sholat = json.bacaan_sholat[isiTeks];
                if (!bacaan_sholat) {
                    return await sock.sendMessage(remoteJid, { text: "Data tidak ditemukan." });
                }
                const format =
                    `✨ *Bacaan sholat\n\n` +
                    `*Nama:* ${bacaan_sholat.nama}\n` +
                    `*Arab:* ${bacaan_sholat.arab}\n` +
                    `*Latin:* ${bacaan_sholat.latin}\n\n` +
                    `*Arti:* \n${bacaan_sholat.arti}`;
                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat memuat data.' });
            }
        }
        if (text.startsWith('.doaharian')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.doaharian', '').trim();
                const index = parseInt(isiTeks);
                if (!isiTeks || isNaN(index) || index < 1 || index > 11) {
                    return await sock.sendMessage(remoteJid, {
                        text: "Ketik urutannya! Contoh: *.doaharian 7* (Pilih angka 1 - 11)"
                    });
                }
                const data = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const json = JSON.parse(data);
                const doa_harian = json.doa_harian[isiTeks];
                if (!doa_harian) {
                    return await sock.sendMessage(remoteJid, { text: "Data tidak ditemukan." });
                }
                const format =
                    `✨ *Doa harian\n\n` +
                    `*Nama:* ${doa_harian.nama}\n` +
                    `*Arab:* ${doa_harian.arab}\n` +
                    `*Latin:* ${doa_harian.latin}\n\n` +
                    `*Arti:* \n${doa_harian.arti}`;
                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat memuat data.' });
            }
        }
        if (text === ".quotesislami") {
            try {
                const data = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const json = JSON.parse(data);
                const allQuotes = json.quotes[0];
                const angka_random = Math.floor(Math.random() * 7) + 1;
                const quoteText = allQuotes[angka_random.toString()];
                if (!quoteText) {
                    return await sock.sendMessage(remoteJid, { text: "Data tidak ditemukan." });
                }
                const format = `✨ *Quotes hari ini*\n\n` + `"${quoteText}"`;
                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat memuat data.' });
            }
        }
        if (text.startsWith('.niatsholat')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.niatsholat', '').trim();
                const index = parseInt(isiTeks);
                if (!isiTeks || isNaN(index) || index < 1 || index > 5) {
                    return await sock.sendMessage(remoteJid, {
                        text: "Ketik urutan solat! Contoh: *.niatsholat 3* (Pilih angka 1 - 5)"
                    });
                }
                const data = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const json = JSON.parse(data);
                const niat_sholat_wajib = json.niat_sholat_wajib[isiTeks];
                if (!niat_sholat_wajib) {
                    return await sock.sendMessage(remoteJid, { text: "Data tidak ditemukan." });
                }
                const format =
                    `✨ *Niat sholat\n\n` +
                    `*Nama:* ${niat_sholat_wajib.nama}\n` +
                    `*Arab:* ${niat_sholat_wajib.arab}\n` +
                    `*Latin:* ${niat_sholat_wajib.latin}\n\n` +
                    `*Arti:* \n${niat_sholat_wajib.arti}`;
                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat memuat data.' });
            }
        }
        if (text === '.ayatkursi') {
            console.log(text)
            try {
                const data = fs.readFileSync('./islamic_dataset/islamic_dataset.json', 'utf-8');
                const json = JSON.parse(data);
                const ayat_kursi = json.ayat_kursi[0];
                if (!ayat_kursi) {
                    return await sock.sendMessage(remoteJid, { text: "Data tidak ditemukan." });
                }
                const format =
                    `✨ *Ayat kursi\n\n` +
                    `*Ayat:* ${ayat_kursi.arab}\n` +
                    `*Latin:* ${ayat_kursi.latin}\n\n` +
                    `*Arti:* \n${ayat_kursi.arti}`;
                await sock.sendMessage(remoteJid, { text: format }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan saat memuat data.' });
            }
        }
        if (text.startsWith('.alquran')) {
            try {
                const isiTeks = text.replace('.alquran', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Ketik nama surah! Contoh: *.alquran alfatihah*" });
                const hasilQuran = await get_surah(isiTeks);
                if (!hasilQuran) {
                    return await sock.sendMessage(remoteJid, { text: `Surah *${isiTeks}* tidak ditemukan. Pastikan penulisan benar (tanpa spasi/tanda baca).` });
                }
                await sock.sendMessage(remoteJid, { text: hasilQuran }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem.' });
            }
        }
        if (text.startsWith('.audiosurah')) {
            try {
                const isiTeks = text.replace('.audiosurah', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Ketik nama surah! Contoh: *.audiosurah alfatihah*" });
                const urlAudio = await get_audio(isiTeks);
                if (!urlAudio) {
                    return await sock.sendMessage(remoteJid, { text: `Surah *${isiTeks}* tidak ditemukan.` });
                }
                await sock.sendMessage(remoteJid, {
                    audio: { url: urlAudio },
                    mimetype: 'audio/mp4',
                    ptt: false
                }, { quoted: msg });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim audio.' });
            }
        }
        if (text === '.jadwalsholat') {
            try {
                const time = await get_time()
                await sock.sendMessage(remoteJid, {
                    text: time
                }, { quoted: msg });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem.' });
            }
        }

        //image
        const img_ms = img.find(p => text.startsWith(p))
        if (img_ms) {
            try {
                console.log(img_ms);
                const result = await img_handle(img_ms);
                await sock.sendMessage(remoteJid, { image: { url: result } }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem.' });
            }
        }
        //video
        const vid_ms = vid.find(p => text.startsWith(p))
        if (vid_ms) {
            try {
                console.log(vid_ms);
                const result = await vid_handle(vid_ms);
                if (result) {
                    console.log(result)
                    await sock.sendMessage(remoteJid, {
                        video: result,
                        mimetype: 'video/mp4',
                        fileName: `video_${Date.now()}.mp4`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(remoteJid, { text: 'Maaf, video tidak ditemukan atau folder kosong.' });
                }
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem.' });
            }
        }
        //anime ...
        if (text.startsWith('.carianime')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.carianime', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Contoh: .carianime solo leveling" });

                const data = await search_Anime(isiTeks);
                if (!data) return await sock.sendMessage(remoteJid, { text: "Anime tidak ditemukan." });


                const format = `*ANIME INFORMATION* 🎬\n\n` +
                    `*🇯🇵 Judul:* ${data.title}\n` +
                    `*🇺🇸 English:* ${data.english}\n` +
                    `*⭐ Score:* ${data.score}\n` +
                    `*📊 Status:* ${data.status}\n` +
                    `*🏷️ Genre:* ${data.genres.join(', ')}\n\n` +
                    `*📖 Sinopsis:*\n_${data.description}_\n\n` +
                    `*📺 Streaming Resmi:*\n${data.link}\n\n` +
                    `*🔔 Info:* ${data.nextepi ? 'Eps ' + data.nextepi + ' akan tayang.' : 'Sudah Tamat.'}`;

                await sock.sendMessage(remoteJid, {
                    image: { url: data.poster },
                    caption: format
                }, { quoted: msg });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem.' });
            }
        }
        const anim_ms = char.find(c => text.startsWith(c))
        if (anim_ms) {
            console.log(text)
            try {
                const isiTeks = text.replace(anim_ms, '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Tanyakan sesuatu! contoh: .noa apa itu ikan" });
                const answer = await anime_chat(isiTeks, anim_ms.replace('.', ''));
                await sock.sendMessage(remoteJid, { text: answer }, { quoted: msg })
                console.log('Jawaban berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Kena limit bro! tunggu 30 detik baru coba lagi' });
            }
        }
        const info_anim_ms = cari_anim.find(c => text.startsWith(c.msg))?.msg;
        if (info_anim_ms) {
            console.log(text)
            try {
                const isiTeks = text.replace(info_anim_ms, '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: `Ketik nama anime! contoh nya: ${info_anim_ms} naruto` });
                const answer = await get_info(text.replace(isiTeks, '').trim(), isiTeks)
                if (!answer) return await sock.sendMessage(remoteJid, { text: 'Anime tidak di temukan!' })
                await sock.sendMessage(remoteJid, { text: answer }, { quoted: msg })
                console.log('Jawaban berhasil dikirim!');
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Gagal membuat jawaban.' });
            }
        }

        //musik
        if (text.startsWith('.carimsk')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.carimsk', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Ketik nama musik, contoh: .carimsk ghost" });
                const urlAudio = await get_musik(isiTeks)
                await sock.sendMessage(remoteJid, {
                    audio: { url: urlAudio },
                    mimetype: 'audio/mp4',
                    ptt: false
                }, { quoted: msg });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim audio.' });
            }
        }
        if (text.startsWith('.carilirik')) {
            console.log(text)
            try {
                const isiTeks = text.replace('.carilirik', '').trim();
                if (!isiTeks) return await sock.sendMessage(remoteJid, { text: "Ketik nama lagu, contoh: .carilirik ghost" });
                const format = await get_lirik(isiTeks)
                if (!format) return await sock.sendMessage(remoteJid, { text: 'tidak menemukan lagu yang anda cari' })
                await sock.sendMessage(remoteJid, {
                    text: format
                }, { quoted: msg });

            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim audio.' });
            }
        }
        //top up game
        const tp_ms = topup.find(p => p.msg === text)
        if (tp_ms) {
            console.log(tp_ms)
            console.log(msg.key)
            try {
                await sock.sendMessage(remoteJid, {
                    text: `Halo @${sender.split('@')[0]}, permintaan top up kamu sudah diteruskan ke Admin. Silahkan cek chat pribadi.`,
                    mentions: [sender]
                }, { quoted: msg });
                await sock.sendMessage(sender, {
                    text: `Halo ${user_name}, permintaan top up game *${tp_ms.game}* kamu sedang diproses oleh Admin. Tunggu sebentar ya.`
                });
                const adminNumber = '62895322357910@s.whatsapp.net'
                const infoUntukAdmin = `*NOTIFIKASI TOP UP*\n\n` +
                    `👤 Nama: ${user_name}\n` +
                    `📱 Nomor: ${sender.split('@')[0]}\n` +
                    `💬 Pesan: Ingin melakukan top up game ${tp_ms.game}.\n\n` +
                    `Silahkan hubungi user tersebut atau klik link ini:\n` +
                    `wa.me/${sender.split('@')[0]}`;
                await sock.sendMessage(adminNumber, { text: infoUntukAdmin });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim pesan.' });
            }
        }
        //pulsa
        const puls_ms = pulsa.find(p => p.msg === text)
        if (puls_ms) {
            console.log(puls_ms)
            console.log(msg.key)
            try {
                await sock.sendMessage(remoteJid, {
                    text: `Halo @${sender.split('@')[0]}, permintaan top up pulsa kamu sudah diteruskan ke Admin. Silahkan cek chat pribadi.`,
                    mentions: [sender]
                }, { quoted: msg });
                await sock.sendMessage(sender, {
                    text: `Halo ${user_name}, permintaan top up game *${puls_ms.puls}* kamu sedang diproses oleh Admin. Tunggu sebentar ya.`
                });
                const adminNumber = '62895322357910@s.whatsapp.net'
                const infoUntukAdmin = `*NOTIFIKASI TOP UP*\n\n` +
                    `👤 Nama: ${user_name}\n` +
                    `📱 Nomor: ${sender.split('@')[0]}\n` +
                    `💬 Pesan: Ingin melakukan top up pulsa ${puls_ms.puls}.\n\n` +
                    `Silahkan hubungi user tersebut atau klik link ini:\n` +
                    `wa.me/${sender.split('@')[0]}`;
                await sock.sendMessage(adminNumber, { text: infoUntukAdmin });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim pesan.' });
            }
        }
        //voucher
        const vcr_ms = vcr.find(p => p.msg === text)
        if (vcr_ms) {
            console.log(vcr_ms)
            try {
                await sock.sendMessage(remoteJid, {
                    text: `Halo @${sender.split('@')[0]}, permintaan voucher kamu sudah diteruskan ke Admin. Silahkan cek chat pribadi.`,
                    mentions: [sender]
                }, { quoted: msg });
                await sock.sendMessage(sender, {
                    text: `Halo ${user_name}, permintaan *${vcr_ms.value}* kamu sedang diproses oleh Admin. Tunggu sebentar ya.`
                });
                const adminNumber = '62895322357910@s.whatsapp.net'
                const infoUntukAdmin = `*NOTIFIKASI TOP UP*\n\n` +
                    `👤 Nama: ${user_name}\n` +
                    `📱 Nomor: ${sender.split('@')[0]}\n` +
                    `💬 Pesan: Ingin melakukan pembelian ${vcr_ms.value}.\n\n` +
                    `Silahkan hubungi user tersebut atau klik link ini:\n` +
                    `wa.me/${sender.split('@')[0]}`;
                await sock.sendMessage(adminNumber, { text: infoUntukAdmin });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim pesan.' });
            }
        }
        //game
        const game_ms = game.find(p => p.game === text)
        if (game_ms) {
            console.log(game_ms)
            try {
                const name_game = game_ms.game.replace('.', '').trim();
                await sock.sendMessage(remoteJid, {
                    text: `Silahkan klik link di bawah ini untuk memainkan game *${name_game}*\n${game_ms.link}`,
                }, { quoted: msg });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(remoteJid, { text: 'Terjadi kesalahan sistem saat mengirim pesan.' });
            }
        }
        //grup
        if (remoteJid.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const participant = groupMetadata.participants.find(p => p.phoneNumber === sender);
            const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            if (!isAdmin) return;
            const args = text.trim().split(/ +/);
            const fullCommand = args[0].toLowerCase();
            if (fullCommand.startsWith('.nolink')) {
                console.log(text);
                const command = fullCommand.replace('.nolink', '');
                const on_of = args[1]?.toLowerCase();
                if (no_link_json[grupIndex][command]) {
                    console.log(text);
                    try {
                        if (!on_of || (on_of !== 'on' && on_of !== 'off')) {
                            return await sock.sendMessage(remoteJid, {
                                text: `Format salah! Gunakan: .nolink${command} on/off`
                            }, { quoted: msg });
                        }
                        const currentCondition = no_link_json[grupIndex][command].condition;
                        if (currentCondition !== on_of) {
                            no_link_json[grupIndex][command].condition = on_of;
                            fs.writeFileSync('./no_link.json', JSON.stringify(no_link_json, null, 4));
                            return await sock.sendMessage(remoteJid, {
                                text: `Pengaturan *${command}* telah diubah menjadi *${on_of}* ✅.`
                            });
                        } else {
                            return await sock.sendMessage(remoteJid, {
                                text: `Pengaturan *${command}* memang sudah *${on_of}*.`
                            });
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            }

            if (text.startsWith('.mute')) {
                const on_of = text.replace('.mute', '').trim().toLowerCase();
                try {
                    if (on_of !== 'on' && on_of !== 'off') return await sock.sendMessage(remoteJid, {
                        text: 'Format salah! contoh .mute on'
                    }, { quoted: msg })
                    if (on_of === 'on') {
                        await sock.groupSettingUpdate(remoteJid, 'announcement');
                        await sock.sendMessage(remoteJid, {
                            text: `Pengaturan mute telah di ubah menjadi ${on_of}.`
                        })
                    } else {
                        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
                        await sock.sendMessage(remoteJid, {
                            text: `Pengaturan mute telah di ubah menjadi ${on_of}.`
                        })
                    }
                } catch (error) {
                    console.error("Gagal mengubah izin grup:", error);
                    await sock.sendMessage(remoteJid, { text: 'Gagal mengubah pengaturan. Pastikan bot adalah Admin!' });
                }
            }

            if (text.startsWith('.setwelcome')) {
                console.log(text);
                const isitext = text.replace('.setwelcome', '').trim();
                if (!isitext) return await sock.sendMessage(remoteJid, { text: 'Set pesan yang akan di kirim! contoh: .setwelcome selamat datang di grop kami!, sebutkan namamu' })
                try {
                    const set_welcome = await JSONFilePreset('./welcome.json', {});
                    set_welcome.data[grupIndex] = isitext;
                    set_welcome.write();
                    await sock.sendMessage(remoteJid, {
                        text: '✅ Pesan welcome berhasil diperbarui!'
                    }, { quoted: msg });
                } catch (err) {
                    console.error(err);
                    await sock.sendMessage(remoteJid, { text: 'Gagal menyimpan file.' });
                }
            }
            if (text.startsWith('.setleave')) {
                console.log(text);
                const isitext = text.replace('.setleave', '').trim();
                if (!isitext) return await sock.sendMessage(remoteJid, { text: 'Set pesan yang akan di kirim! contoh: .setleave selamat tinggal dari grop kami 👋' })
                try {
                    const set_leave = await JSONFilePreset('./leave.json', {})
                    set_leave.data[grupIndex] = isitext;
                    set_leave.write();
                    await sock.sendMessage(remoteJid, {
                        text: '✅ Pesan leave berhasil diperbarui!'
                    }, { quoted: msg });
                } catch (err) {
                    console.error(err);
                    await sock.sendMessage(remoteJid, { text: 'Gagal menyimpan file.' });
                }
            }

            if (text.startsWith('.notoxic')) {
                console.log(text);
                const on_of = text.replace('.notoxic', '').trim().toLowerCase();
                if (on_of !== 'on' && on_of !== 'off') {
                    return await sock.sendMessage(remoteJid, { text: 'Format salah! contoh .notoxic on' });
                }
                if (on_of === 'on') {
                    toxic.data[grupIndex] = 'on'
                    toxic.write()
                    return await sock.sendMessage(remoteJid, { text: `Fitur notoxic berhasil diubah ke ${on_of}` });
                } else {
                    toxic.data[grupIndex] = 'off'
                    toxic.write()
                    return await sock.sendMessage(remoteJid, { text: `Fitur notoxic berhasil diubah ke ${on_of}` });
                }
            }

            if (text.startsWith('.nospam')) {
                console.log(text);
                const on_of = text.replace('.nospam', '').trim().toLowerCase();
                if (on_of !== 'on' && on_of !== 'off') {
                    return await sock.sendMessage(remoteJid, { text: 'Format salah! contoh .nospam on' });
                }
                if (on_of === 'on') {
                    spam.data[grupIndex] = 'on'
                    spam.write()
                    return await sock.sendMessage(remoteJid, { text: `Fitur nospam berhasil diubah ke ${on_of}` });
                } else {
                    spam.data[grupIndex] = 'off'
                    spam.write()
                    return await sock.sendMessage(remoteJid, { text: `Fitur nospam berhasil diubah ke ${on_of}` });
                }
            }
            if (text.startsWith('.setnamegroup')) {
                try {
                    const nama = text.replace('.setnamegroup', '').trim().toLocaleLowerCase();
                    if (!nama) return await sock.sendMessage(remoteJid, {
                        text: 'Ketik nama grup yang di ingin kan! contoh: .setnamegroup JB oki store'
                    })
                    await sock.groupUpdateSubject(remoteJid, nama);
                    await sock.sendMessage(remoteJid, {
                        text: 'Nama grup berhasil di ubah ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text.startsWith('.setdescgrpup') || text.startsWith('.editinfo')) {
                try {
                    const desc = text.replace('.setdescgrpup', '').trim().toLocaleLowerCase();
                    if (!desc) return await sock.sendMessage(remoteJid, {
                        text: 'Ketik isi deskripsi yang di ingin kan! contoh: .setdescgrpup jangan toxic ya guys'
                    })
                    await sock.groupUpdateDescription(remoteJid, desc);
                    await sock.sendMessage(remoteJid, {
                        text: 'Descripsi grup berhasil di ubah ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text === '.setppgroup') {
                try {
                    const isImage = msgType === 'imageMessage';
                    const isQuotedImage = msgType === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage;
                    if (!isImage && !isQuotedImage) {
                        return await sock.sendMessage(remoteJid, { text: 'Kirim gambar dengan caption .img2stiker atau balas gambar dengan .img2stiker' });
                    }
                    const messageToDownload = isQuotedImage ? {
                        message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                    } : msg;
                    const buffer = await downloadMediaMessage(
                        messageToDownload,
                        'buffer',
                        {},
                        {
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );
                    const pp = await sharp(buffer)
                        .resize(512, 512, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .webp()
                        .toBuffer();
                    await sock.updateProfilePicture(remoteJid, pp)
                    await sock.sendMessage(remoteJid, {
                        text: 'Profile picture grup berhasil di ubah ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text === '.delppgroup') {
                try {
                    await sock.removeProfilePicture(remoteJid)
                    await sock.sendMessage(remoteJid, {
                        text: 'Profile picture grup berhasil di hapus ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text.startsWith('.add')) {
                try {
                    const nomor = text.replace('.add', '').trim().toLocaleLowerCase();
                    if (!nomor || !(/^08\d{8,11}$/.test(nomor))) return await sock.sendMessage(remoteJid, {
                        text: 'Ketik nomor yang ingin di masukan! contoh: .add 0812399999'
                    })
                    const format_nomor = [`${nomor.replace('0', '62')}@s.whatsapp.net`]
                    await sock.groupParticipantsUpdate(remoteJid, format_nomor, "add");
                    await sock.sendMessage(remoteJid, {
                        text: 'Anggota baru berhasil di tambahkan ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text.startsWith('.kick')) {
                try {
                    const nomor = text.replace('.kick', '').trim().toLocaleLowerCase();
                    if (!nomor || !(/^08\d{8,11}$/.test(nomor))) return await sock.sendMessage(remoteJid, {
                        text: 'Ketik nomor yang ingin di keluarkan! contoh: .kick 0812399999'
                    })
                    const format_nomor = [`${nomor.replace('0', '62')}@s.whatsapp.net`]
                    await sock.groupParticipantsUpdate(remoteJid, format_nomor, "remove");
                    await sock.sendMessage(remoteJid, {
                        text: 'Anggota berhasil di keluarkan ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text.startsWith('.createadmin')) {
                try {
                    const nomor = text.replace('.createadmin', '').trim().toLocaleLowerCase();
                    if (!nomor || !(/^08\d{8,11}$/.test(nomor))) return await sock.sendMessage(remoteJid, {
                        text: 'Ketik nomor yang ingin di tambahkan menjadi admin! contoh: .createadmin 0812399999'
                    })
                    const format_nomor = [`${nomor.replace('0', '62')}@s.whatsapp.net`]
                    await sock.groupParticipantsUpdate(remoteJid, format_nomor, "promote");
                    await sock.sendMessage(remoteJid, {
                        text: 'Admin baru berhasil di tambahkan ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            if (text.startsWith('.cabutadmin')) {
                try {
                    const nomor = text.replace('.cabutadmin', '').trim().toLocaleLowerCase();
                    if (!nomor || !(/^08\d{8,11}$/.test(nomor))) return await sock.sendMessage(remoteJid, {
                        text: 'Ketik nomor yang ingin di cabut menjadi admin! contoh: .cabutadmin 0812399999'
                    })
                    const format_nomor = [`${nomor.replace('0', '62')}@s.whatsapp.net`]
                    await sock.groupParticipantsUpdate(remoteJid, format_nomor, "demote");
                    await sock.sendMessage(remoteJid, {
                        text: 'Admin berhasil di cabut ✅'
                    })
                } catch (error) {
                    console.error(error)
                }
            }
        }
    });
    sock.ev.on('group-participants.update', async (update) => {
        const jid = update.id;
        const grupIndex = await verify(jid);
        if (update.action === 'add') {
            const mentions = update.participants.map(p => p.phoneNumber || p.id);
            const teks = await JSONFilePreset('./welcome.json', {})
            await sock.sendMessage(jid, {
                text: teks.data[grupIndex],
                mentions: mentions
            });
        }
        if (update.action === 'remove') {
            const mentions = update.participants.map(p => p.phoneNumber || p.id);
            const teks = await JSONFilePreset('./leave.json', {});
            await sock.sendMessage(jid, {
                text: teks.data[grupIndex],
                mentions: mentions
            });
        }
    })
}

connectToWhatsApp();