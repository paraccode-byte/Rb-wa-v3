import fs from 'fs/promises';

export default async function handle_list(text) {
    const command = text.toLowerCase();
    const menuMap = {
        '.listgame': 'list_game.txt',
        '.game': 'list_game.txt',
        '.liststiker': 'list_stiker.txt',
        '.stiker': 'list_stiker.txt',
        '.chatanime': 'chat_anime.txt',
        '.anime': 'list_anime.txt',
        '.islami': 'list_islami.txt',
        '.img': 'list_img.txt',
        '.vid': 'list_vid.txt',
        '.msk': 'list_musik.txt',
        '.topup': 'list_topup.txt',
        '.pulsa': 'list_pulsa.txt',
        '.data': 'list_pulsa.txt',
        '.vcr': 'list_vcr.txt',
        '.token': 'list_vcr.txt',
        '.admin': 'list_admin.txt',
    };

    try {
        if (menuMap[command]) {
            const fileName = menuMap[command];
            return await fs.readFile(`./list/${fileName}`, 'utf-8');
        }

        return "Menu tidak ditemukan.";
    } catch (err) {
        console.error('Gagal membaca file:', err.message);
        return "Terjadi kesalahan saat membaca menu.";
    }
}