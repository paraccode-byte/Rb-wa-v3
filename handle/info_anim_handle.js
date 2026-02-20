import { cari_anim } from "../menu_array.js";
import search_Anime from "../search_anime.js";

export default async function get_info(get, text) {
    try {
        const need_info = cari_anim.find(e => e.msg === get);
        const info = await search_Anime(text);
        if (!info) return null;
        let dataTampil = info[need_info.value];
        if (Array.isArray(dataTampil)) {
            dataTampil = dataTampil.join(', ');
        }
        const format =
            `Ini informasi yang anda butuhkan:\n\n` +
            `*${info.title}*\n` + 
            `> ${need_info.value.toUpperCase()}:\n` +
            `${dataTampil}`;

        return format
    } catch (error) {
        console.error(error);
        return null;
    }
}