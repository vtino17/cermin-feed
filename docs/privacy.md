# Model Privasi

## Data yang diproses

Snapshot dapat berisi teks, nama sumber, platform, URL, dan waktu capture. Semua analisis dashboard
berjalan di browser. Tidak ada backend, akun, analytics, telemetry, atau remote model.

## Penyimpanan

Dashboard menyimpan maksimal 12 snapshot pada `localStorage`, kecuali pengguna mengaktifkan mode
sesi. Mode sesi menghapus snapshot persisten dan menjaga data hanya di memori tab. Extension
menyimpan satu snapshot terakhir pada `chrome.storage.local`. Pengguna dapat menghapus keduanya dari
antarmuka.

`localStorage` bukan vault terenkripsi. Pengguna pada profil OS/browser yang sama dan script dengan
origin yang sama berpotensi membacanya. Impor menawarkan redaksi default untuk email, nomor telepon
Indonesia, dan nomor panjang. Deteksi berbasis pola dapat melewatkan data sensitif; jangan impor
pesan privat pada perangkat bersama.

## Vault terenkripsi

Backup `.cermin` menggunakan AES-256-GCM dengan salt acak 16 byte dan IV acak 12 byte. Kunci
diturunkan dari passphrase melalui PBKDF2-HMAC-SHA-256 dengan 600.000 iterasi. Passphrase tidak
disimpan dan archive ditolak bila parameter KDF berada di luar batas aman yang didukung.

Enkripsi melindungi file backup saat tersimpan, bukan snapshot aktif di `localStorage`, layar yang
sedang terbuka, malware, extension browser lain, atau perangkat yang sudah dikuasai penyerang.

## Extension

Extension menggunakan:

- `activeTab` — akses sementara setelah gesture pengguna;
- `scripting` — menjalankan extractor pada tab tersebut;
- `storage` — menyimpan satu snapshot;
- `downloads` — mengekspor JSON pilihan pengguna.

Tidak ada `host_permissions`, background capture, cookie access, atau network request. Capture
menyamarkan pola email/telepon sebelum menyimpan dan tidak merekam URL halaman.

## Ekspor

**Public summary** hanya memuat metrik agregat, distribusi platform, dan distribusi topik. Ia tidak
memuat teks, URL, ID, atau nama sumber.

**Private snapshot** memuat data mentah dan harus diperlakukan sebagai data sensitif. Gunakan Vault
bila file akan dipindahkan atau dicadangkan.

## Threat model lanjutan

Lihat [threat-model.md](threat-model.md) untuk aset, batas kepercayaan, mitigasi saat ini, dan risiko
yang masih diterima.
