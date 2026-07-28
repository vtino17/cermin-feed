# Cermin

**Lihat apa yang membentuk perhatianmu.**

Cermin adalah observatorium feed pribadi yang berjalan lokal di browser. Ia membantu pengguna
melihat konsentrasi sumber, keragaman topik, pola bahasa yang meminta reaksi cepat, dan repetisi
narasi dalam sebuah snapshot feed—tanpa mengirim teks atau nama akun ke server.

> Status: beta lokal. Skor Cermin adalah alat refleksi heuristik, bukan pengukur kebenaran, bias politik,
> kesehatan mental, ataupun diagnosis “filter bubble”.

## Mengapa dibuat?

Platform biasanya menjelaskan setiap rekomendasi satu per satu, tetapi sulit bagi pengguna untuk
melihat bentuk feed secara keseluruhan. Banyak alat yang ada berfokus pada memblokir rage-bait atau
memberikan label bias. Cermin mengambil pendekatan berbeda: tampilkan komposisi dan buktinya, lalu
biarkan pengguna mengambil keputusan sendiri.

## Fitur

- Dashboard lokal dengan snapshot history.
- Impor JSON dan CSV melalui drag-and-drop.
- Chrome/Chromium extension dengan izin minimum `activeTab`.
- Normalized Shannon entropy untuk variasi sumber dan topik.
- Cosine similarity untuk menemukan narasi berulang.
- Klaster narasi lintas sumber dan perbandingan perubahan antar-snapshot.
- Indeks konsentrasi sumber, ledakan temporal, dan skor keyakinan berbasis kualitas sampel.
- Kamus pola transparan untuk engagement bait, urgensi, outrage, dan klaim otoritas.
- Estimasi waktu baca dan skor “ruang kendali feed”.
- Ekspor ringkasan publik tanpa teks, URL, atau nama sumber.
- Redaksi email, nomor telepon Indonesia, dan nomor panjang sebelum data disimpan.
- Vault backup terenkripsi AES-256-GCM dengan kunci PBKDF2-SHA-256.
- Mode sesi tanpa persistensi dan PWA yang dapat digunakan offline.
- Migrasi otomatis snapshot analisis v1 ke metrik v2.
- Sample dataset Indonesia, pengujian unit, Docker, dan GitHub Actions.

## Struktur

```text
apps/
  dashboard/    React + Vite, seluruh analisis berjalan di browser
  extension/    Manifest V3, capture hanya saat pengguna menekan tombol
packages/
  analyzer/     parser, metrik, pola, similarity, public export
samples/
  feed-demo.json
```

## Menjalankan dashboard

```bash
git clone https://github.com/vtino17/cermin-feed.git
cd cermin-feed
corepack enable
pnpm install
pnpm dev
```

Buka http://localhost:5174.

## Memasang extension secara lokal

1. Buka `chrome://extensions`.
2. Aktifkan **Developer mode**.
3. Pilih **Load unpacked**.
4. Pilih folder `apps/extension`.
5. Buka sebuah feed, tekan icon Cermin, lalu pilih **Ambil snapshot feed**.
6. Unduh JSON dan impor ke dashboard.

Extension tidak meminta akses permanen ke semua situs. `activeTab` memberi akses sementara hanya
setelah pengguna menekan extension pada tab aktif.

## Format impor

JSON:

```json
[
  {
    "id": "post-1",
    "platform": "reddit",
    "source": "nama sumber",
    "text": "isi posting",
    "capturedAt": "2026-07-28T00:00:00.000Z"
  }
]
```

CSV menggunakan header `text,source,platform,capturedAt`. Hanya `text` yang wajib. Impor dibatasi
10 MB dan 500 item untuk menjaga analisis pasangan tetap responsif di perangkat.

## Pemeriksaan kualitas

```bash
pnpm check
pnpm audit --prod
```

## Docker

```bash
docker build -t cermin-feed .
docker run --rm -p 8080:80 cermin-feed
```

## Metodologi

Metode dan batas interpretasi dijelaskan di [docs/methodology.md](docs/methodology.md). Model privasi
ada di [docs/privacy.md](docs/privacy.md), dengan asumsi serangan rinci di
[docs/threat-model.md](docs/threat-model.md).

## Roadmap

- [x] PWA offline dan enkripsi snapshot dengan passphrase.
- [ ] Kamus komunitas multibahasa dengan versioning.
- [x] Perbandingan metrik antar-snapshot.
- [ ] Perbandingan snapshot tersegmentasi berdasarkan jam dan platform.
- [ ] Importer arsip resmi dari platform, bukan scraping.
- [ ] Topic model on-device opsional dengan WebGPU.
- [ ] Dataset benchmark untuk Bahasa Indonesia.
- [ ] Paket riset yang memerlukan persetujuan eksplisit dan differential privacy.

## Lisensi

MIT. Data demo bersifat fiktif dan hanya digunakan untuk pengujian.
