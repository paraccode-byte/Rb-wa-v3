import surah from './obj_surah.js';

export default async function get_audio(s) {
    try {
        const namaSurahInput = s.toLowerCase().replace(/[^a-z]/g, '');
        const nomor_surah = surah[namaSurahInput];
        if (!nomor_surah) return null;
        const res = await fetch(`https://api.myquran.com/v3/quran/${nomor_surah}`, {
            headers: { "Accept": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        return json.data.audio_url;
    } catch (err) {
        console.error("Error get_surah:", err.message);
        return null;
    }
}