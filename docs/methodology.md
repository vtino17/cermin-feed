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
  source_concentration_penalty
```

Skor membantu membandingkan snapshot milik pengguna yang sama. Ia tidak layak dipakai untuk
meranking orang, platform, komunitas, atau orientasi politik.
