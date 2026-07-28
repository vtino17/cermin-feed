# Model Privasi

## Data yang diproses

Snapshot dapat berisi teks, nama sumber, platform, URL, dan waktu capture. Semua analisis dashboard
berjalan di browser. Tidak ada backend, akun, analytics, telemetry, atau remote model.

## Penyimpanan

Dashboard menyimpan maksimal 12 snapshot pada `localStorage`. Extension menyimpan satu snapshot
terakhir pada `chrome.storage.local`. Pengguna dapat menghapus keduanya dari antarmuka.

`localStorage` bukan vault terenkripsi. Pengguna pada profil OS/browser yang sama dan script dengan
origin yang sama berpotensi membacanya. Jangan impor pesan privat atau data sensitif pada perangkat
bersama.

## Extension

Extension menggunakan:

- `activeTab` — akses sementara setelah gesture pengguna;
- `scripting` — menjalankan extractor pada tab tersebut;
- `storage` — menyimpan satu snapshot;
- `downloads` — mengekspor JSON pilihan pengguna.

Tidak ada `host_permissions`, background capture, cookie access, atau network request.

## Ekspor

**Public summary** hanya memuat metrik agregat, distribusi platform, dan distribusi topik. Ia tidak
memuat teks, URL, ID, atau nama sumber.

**Private snapshot** memuat data mentah dan harus diperlakukan sebagai data sensitif.

## Threat model lanjutan

Sebelum rilis store:

- tambahkan Content Security Policy eksplisit;
- lakukan audit selector capture per platform;
- sediakan enkripsi snapshot dengan Web Crypto;
- tambahkan batas ukuran dan proteksi decompression bomb;
- lakukan external security review.
