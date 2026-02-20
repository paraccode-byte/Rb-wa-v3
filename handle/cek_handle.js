export default function handle_cek(command, name) {
    try {
        if (command === '.cekiq') {
            const iq = Math.floor(Math.random() * (93 - 78 + 1)) + 78;
            return `IQ ${name} adalah: ${iq}`;
        }
        
        if (command === '.cekjodoh' || command === 'cekjodoh') {
            const huruf = "abcdefghijklmnopqrstuvwxyz";
            const inisial = huruf[Math.floor(Math.random() * huruf.length)];
            return `Jodoh ${name} berinisial: ${inisial.toUpperCase()}`;
        }
        
        if (command === '.cekkodam' || command === 'cekkodam') {
            const kodam = ['Macan Putih', 'Naga', 'Ular', 'Macan Kumbang', 'Buaya Putih', 'Kecoak Kutub'];
            const hasil = kodam[Math.floor(Math.random() * kodam.length)];
            return `Kodam ${name} adalah: ${hasil}`;
        }
        
        return "Fitur tidak ditemukan";
    } catch (err) {
        console.error('Error:', err.message);
        return "Terjadi kesalahan.";
    }
}