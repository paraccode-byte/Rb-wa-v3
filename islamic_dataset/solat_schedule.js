export default async function get_time() {
    const res = await fetch("https://api.myquran.com/v3/sholat/jadwal/eda80a3d5b344bc40f3bc04f65b7a357/today?tz=Asia%2FJakarta", {
        headers: { "Accept": "application/json" }
    })
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    const jadwal = Object.values(json.data.jadwal)[0]
    const format = `
┏━━━━━━━━━━━━━━━━━━┓
🕌 JADWAL SHOLAT HARI INI
┗━━━━━━━━━━━━━━━━━━┛
📅 Tanggal: ${jadwal.tanggal}

⏳ Imsak   : ${jadwal.imsak}
🌅 Subuh   : ${jadwal.subuh}
☀️ Dhuha   : ${jadwal.dhuha}
🌞 Dzuhur  : ${jadwal.dzuhur}
⛅ Ashar   : ${jadwal.ashar}
🌇 Maghrib : ${jadwal.maghrib}
🌙 Isya    : ${jadwal.isya}

"Shalatlah tepat pada waktunya."
`;
    return format;
}