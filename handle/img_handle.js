const owner = 'clien-source';
const repo = 'material';

async function getRandomFileFromGithub(path) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
        if (!response.ok) throw new Error("Gagal mengambil folder dari GitHub");
        const data = await response.json();
        const filesOnly = data.filter(item => item.type === 'file');
        const randomIndex = Math.floor(Math.random() * filesOnly.length);

        return filesOnly[randomIndex].download_url;
    } catch (error) {
        console.error('GitHub API Error:', error);
        return null;
    }
}

export default async function img_handle(text) {
    const command = text.toLowerCase();
    const folderMap = {
        '.imganim': 'anime',
        '.imgteks': 'teks',
        '.imgjmk': 'jomok',
        '.imgwowo': 'wowo',
        '.imgrandom': 'random',
        '.imgrmeme': 'meme',
        '.imgestetik': 'estetik'
    };

    const folderName = folderMap[command];
    if (folderName) {
        return await getRandomFileFromGithub(folderName);
    }
    return null;
}