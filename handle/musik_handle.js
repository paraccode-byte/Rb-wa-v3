export default async function get_musik(judul) {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(judul)}&entity=song&limit=1`);
        const data = await response.json();
        if (data.resultCount > 0) {
            const lagu = data.results[0];
            console.log(lagu.previewUrl)
            console.log('berhasil mendapatkan musik')
            return await lagu.previewUrl;
        } else {
            console.log("Lagu tidak ditemukan.");
            return null;
        }
    } catch (error) {
        console.error("Gagal memanggil API:", error);
    }
}