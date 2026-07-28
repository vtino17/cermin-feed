# Metodologi

## Prinsip

Cermin mengukur komposisi snapshot, bukan niat platform atau kebenaran sebuah posting. Setiap hasil
harus dapat ditelusuri ke formula atau kamus yang terbuka.

## Keragaman

Distribusi sumber dan topik diringkas dengan normalized Shannon entropy:

```text
H = -Σ(pᵢ × ln(pᵢ))
normalized = H / ln(k) × 100
```

Nilai tinggi berarti distribusi lebih merata dalam snapshot tersebut. Nilai rendah tidak otomatis
buruk: feed spesialis memang dapat berfokus pada satu topik atau sumber.

## Klasifikasi topik

MVP memakai pencocokan istilah Bahasa Indonesia dan Inggris. Kategori dengan jumlah istilah cocok
terbanyak dipilih. Bila tidak ada istilah cocok, item masuk `other`.

Metode ini sengaja sederhana dan dapat diaudit, tetapi tidak memahami ironi, konteks, homonim, atau
topik baru. Topic model on-device hanya akan ditambahkan sebagai fitur opsional.

## Kemiripan

Teks dinormalisasi menjadi token, stop words dibuang, lalu dihitung cosine similarity atas frekuensi
token. Pasangan dengan similarity minimal 0,62 ditandai. Ini mendeteksi kemiripan kata, bukan
koordinasi, plagiarisme, ataupun asal narasi.

## Klaster narasi

Pasangan yang melewati ambang 0,62 dianggap sebagai sisi dalam sebuah graph. Connected components
menjadi klaster narasi. Cermin menampilkan jumlah item, jumlah sumber, rata-rata similarity, dan
istilah yang berulang. Satu rantai kemiripan dapat menggabungkan item yang tidak mirip secara
langsung; karena itu klaster adalah alat navigasi, bukan bukti koordinasi.

## Konsentrasi dan waktu

Konsentrasi sumber memakai jumlah kuadrat proporsi sumber (`Σpᵢ² × 100`). Nilai mendekati 100
berarti snapshot didominasi sedikit sumber.

Ledakan temporal adalah proporsi item pada jam capture terpadat. Ini mengukur waktu pengambilan
snapshot, bukan waktu publikasi atau strategi platform.

## Pola persuasif

Empat kamus awal:

- engagement bait;
- urgensi buatan;
- pemicu kemarahan;
- klaim otoritas tanpa konteks.

Deteksi hanya berarti frasa kamus ditemukan. Cermin menampilkan frasa bukti dan tidak menyembunyikan
postingan.

## Skor ruang kendali

```text
score =
  source_diversity × 0.33 +
  topic_diversity × 0.27 +
  (100 - bait_rate) × 0.20 +
  (100 - repetition_rate) × 0.20 -
  source_concentration_penalty -
  temporal_burst_penalty
```

Skor membantu membandingkan snapshot milik pengguna yang sama. Ia tidak layak dipakai untuk
meranking orang, platform, komunitas, atau orientasi politik.

## Keyakinan analisis

Skor keyakinan menggabungkan ukuran sampel (65%) dan kelengkapan metadata utama (35%). Pertumbuhan
nilai ukuran sampel bersifat logaritmik dan mencapai plafon pada 100 item. Skor ini bukan confidence
interval statistik dan tidak mengurangi ketidakpastian klasifikasi topik.

## Perbandingan snapshot

Perbandingan menghitung selisih poin pada ruang kendali, keragaman sumber/topik, pola pemicu, dan
repetisi. Topik yang muncul dan surut dihitung dari perubahan share. Snapshot sebaiknya dikumpulkan
dengan metode dan durasi yang serupa agar perbandingan masuk akal.
