const owner = 'clien-source';
const repo = 'material';

async function getRandomFileFromGithub(path) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/video/${path}`);
        if (!response.ok) throw new Error("Gagal mengambil folder dari GitHub");
        const data = await response.json();
        const filesOnly = data.filter(item => item.type === 'file' && item.name.endsWith('.mp4'));
        if (filesOnly.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * filesOnly.length);
        const downloadUrl = filesOnly[randomIndex].download_url;
        console.log('Downloading from:', downloadUrl); 
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) throw new Error("Gagal mendownload data video");
        const arrayBuffer = await fileResponse.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        console.error('GitHub API Error:', error);
        return null;
    }
}

export default async function vid_handle(text) {
    const command = text.toLowerCase().trim();
    const folderMap = {
        '.videstetik': 'estetik',
        '.vidjmk': 'jomok',
        '.vidwowo': 'wowo',
        '.vidrandom': 'random',
        '.vidmeme': 'meme',
        '.vidjj': 'jedagjedug',
    };

    const folderName = folderMap[command];
    if (folderName) {
        return await getRandomFileFromGithub(folderName);
    }
    return null;
}