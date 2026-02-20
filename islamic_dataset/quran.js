import surah from './obj_surah.js';

export default async function get_surah(s) {
  try {
    const namaSurahInput = s.toLowerCase().replace(/[^a-z]/g, '');
    const nomor_surah = surah[namaSurahInput];
    if (!nomor_surah) return null;
    const res = await fetch(`https://api.myquran.com/v3/quran/${nomor_surah}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    const result = json.data;
    const daftarAyat = result.ayahs.map((a, index) => {
      return `${index + 1}. ${a.arab}\n_${a.translation}_`;
    }).join('\n\n');
    const format = 
      `✨ *Surah ${result.name_latin}* ✨\n` +
      `------------------------------------------\n` +
      `📜 *Info:* ${result.revelation} | ${result.number_of_ayahs} Ayat\n\n` +
      `${daftarAyat}`;
    return format;

  } catch (err) {
    console.error("Error get_surah:", err.message);
    return null;
  }
}