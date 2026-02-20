import fs from 'fs/promises';
import sharp from 'sharp';

const owner = 'clien-source';
const repo = 'material';

async function getRandomFileFromGithub(path) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
        if (!response.ok) throw new Error("Gagal mengambil folder dari GitHub");
        const data = await response.json();
        const filesOnly = data.filter(item => item.type === 'file');
        const randomIndex = Math.floor(Math.random() * filesOnly.length);

        const bfr = await fetch(filesOnly[randomIndex].download_url);
        const array_buffer = await bfr.arrayBuffer();
        const buffer = Buffer.from(array_buffer)

        const stickerBuffer = await sharp(buffer)
            .resize(512, 512, { 
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp() 
            .toBuffer();

        return stickerBuffer;
    } catch (error) {
        console.error('GitHub API Error:', error);
        return null;
    }
}

export default async function stiker_handle(text) {
    const command = text.toLowerCase();
    const folderMap = {
        '.stikeranim': 'anime',
        '.stikerteks': 'teks',
        '.stikerjmk': 'jomok',
        '.stikerwowo': 'wowo',
        '.stikerrandom': 'random'
    };

    const folderName = folderMap[command];
    if (folderName) {
        return await getRandomFileFromGithub(folderName);
    }
    return null;
}