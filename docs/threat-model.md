# Threat Model

Dokumen ini menjelaskan apa yang Cermin lindungi, dari siapa, dan batas perlindungannya. Ia bukan
sertifikasi keamanan.

## Aset sensitif

- teks posting, nama sumber, waktu capture, dan URL impor;
- pola konsumsi perhatian yang tersirat dari snapshot;
- file backup dan passphrase pengguna.

## Batas kepercayaan

Dashboard tidak memiliki backend. Batas utama berada di browser: file masuk, memori tab,
`localStorage`, service worker, dan file hasil unduhan. Extension memakai konteks terpisah
`chrome.storage.local` dan hanya membaca tab setelah gesture pengguna.

## Ancaman dan mitigasi

| Ancaman                                      | Mitigasi saat ini                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Server/operator membaca snapshot             | Tidak ada backend, akun, analytics, telemetry, atau remote model                   |
| Capture tanpa sepengetahuan pengguna         | `activeTab`, tanpa `host_permissions`, capture hanya setelah tombol ditekan        |
| PII tersimpan tanpa sengaja                  | Redaksi default email, telepon Indonesia, nomor panjang; URL capture tidak direkam |
| File import membekukan perangkat             | Batas 10 MB dan 500 item; archive dibatasi 15 MB dan work factor dibatasi          |
| Backup dicuri saat tersimpan                 | AES-256-GCM, salt/IV acak, PBKDF2-SHA-256 600.000 iterasi                          |
| Archive dimodifikasi                         | Authentication tag AES-GCM menyebabkan dekripsi gagal                              |
| Cache offline menyimpan respons pihak ketiga | Service worker hanya menangani request GET dari origin Cermin                      |
| Snapshot lama merusak UI setelah upgrade     | Metrik versi lama dihitung ulang saat dibaca                                       |
| Script atau style pihak ketiga dimuat        | Tanpa font/CDN eksternal; CSP membatasi resource ke origin sendiri                 |

Parameter PBKDF2 mengikuti rekomendasi minimum
[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
untuk HMAC-SHA-256. Web Crypto dipakai agar implementasi primitive tidak dibuat sendiri.

## Risiko yang diterima

- `localStorage` tidak terenkripsi dan dapat dibaca script pada origin yang sama.
- Redaksi berbasis regex tidak menjamin seluruh PII terdeteksi.
- Malware, extension berbahaya, perangkat terbuka, screenshot, dan clipboard berada di luar model.
- Service worker menyimpan application shell, bukan snapshot, tetapi cache browser tetap berada di
  perangkat.
- Passphrase lemah tetap dapat ditebak secara offline; minimal 12 karakter bukan jaminan kekuatan.
- Algoritme analisis dapat salah klasifikasi dan tidak boleh dipakai sebagai bukti koordinasi,
  manipulasi, atau diagnosis perilaku.

## Sebelum distribusi luas

- audit keamanan independen dan pengujian selector extension per platform;
- validasi Content Security Policy pada target hosting dan hardening header HTTP;
- dependency review serta reproducible release artifacts;
- pengujian browser untuk pemulihan archive dan lifecycle service worker;
- pertimbangkan Argon2id WASM setelah ukuran bundle dan supply-chain risk dievaluasi.
