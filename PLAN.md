# Colgate Optic White Vitamin C — Catch the Brightness

Rencana kerja Ontable Studio (Irsal = Developer, Oji = Artist). Dokumen hidup: update saat klien menjawab.

- Disusun: 14 Okt 2026
- Event: 28 Okt - 1 Nov 2026 | Instalasi: 24-25 Okt | Deadline: 24 Okt (belum jelas: serah build atau keputusan vendor)
- Budget: Rp3,5-4 juta | Pembayaran: DP 50% saat deal, 50% saat instalasi
- Garansi: bug fix dan maintenance 30 hari

## 1. Scope

**Masuk:**

- Satu game: Catch the Brightness (touch, portrait; brief awal 30-45 detik, sekarang 15 detik atas permintaan tim)
- Layar: Attract, How to Play, Gameplay, Unlock, Akhir (skor, meter, inisial, top 10, Play Again)
- Booth-proofing: attract mode, auto-reset idle, leaderboard lokal
- Simpan hasil lokal, sinkron ke Google Sheet saat ada internet
- Menu admin tersembunyi (status sync, ekspor CSV)

**Tidak masuk (hitung terpisah jika diminta):** game kedua, Photo Booth, Live Streaming, leaderboard online, data kontak (HP/email), 3D, video, audio custom.

## 2. Perangkat (dari klien)

TV touchscreen 43" atau 55", portrait, Full HD/4K. TV bisa akses browser (Android/smart TV).

**Asumsi:** tanpa PC; game jalan di browser TV; internet booth belum pasti.

## 3. Keputusan teknis

| Hal               | Pilihan                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Engine            | Phaser 3 (v3.90) + TypeScript + Vite                                                           |
| Layar             | Canvas 1080x1920, `Scale.FIT` + `CENTER_BOTH`, aset @2x untuk 4K                               |
| Offline           | PWA lewat vite-plugin-pwa, `registerType: 'autoUpdate'`                                        |
| Precache          | **Wajib** tambah `workbox.globPatterns` untuk png/webp/audio/font (default hanya js/css/html)  |
| Penyimpanan lokal | IndexedDB lewat `idb`, minta `navigator.storage.persist()`                                     |
| Sinkron           | Antrean di IndexedDB → Google Apps Script web app → Google Sheet                               |
| Input             | Keranjang mengikuti `pointer.x`, `input.activePointers: 1`, blok zoom/long-press/selection     |
| Hosting           | Cloudflare Pages / Netlify (statis, gratis)                                                    |
| Cadangan          | Build web yang sama di Chrome kiosk pada mini PC; atau Unity APK jika TV Android boleh install |

Catatan: Unity WebGL tidak dipakai (berat untuk browser TV).

## 4. Alur data dan sinkron

1. Game selesai → simpan ke IndexedDB, status `pending`.
2. Leaderboard top 10 dibaca dari data lokal (tidak bergantung internet).
3. Sync worker tiap ~30 detik dan saat event `online`: kirim batch `pending`, tandai `synced` jika sukses.
4. Gagal → coba lagi dengan backoff. Data tidak dihapus sebelum sukses.
5. Sheet menolak duplikat berdasarkan `id` (UUID), jadi kirim ulang aman.

**Penting (idb):** transaksi IndexedDB tertutup otomatis jika ada `await` lain di tengahnya. Urutan di sync worker: baca pending → tutup transaksi → `fetch` → transaksi baru untuk update status.

**Skema (satu baris per permainan):** `id`, `timestamp`, `deviceId`, `initials`, `score`, `meterPct`, `catches`, `hits`, `durationSec`, `gameVersion`.

**Keamanan:** URL Apps Script terlihat di kode game → pakai shared secret, hanya terima field yang dikenal, batasi panjang, sheet tidak publik. Tanpa nomor HP/email sampai klien menjawab.

**Perlu dites:** CORS dan redirect Apps Script dari browser TV (fallback: `text/plain` atau form POST).

## 5. Aturan game (asumsi sementara, semua di satu file config)

Semua angka ada di `src/config/game.ts` dan masih asumsi sampai klien mengonfirmasi. Keseimbangannya divalidasi dengan simulasi (`tests/domain/balance.test.ts`).

- Timer 15 detik; ronde berakhir lebih awal jika meter 95%, dan sisa detiknya dibayar **bonus waktu** (+25 poin per detik) supaya yang cepat menang skor lebih tinggi.
- **Combo**: kapsul berturut-turut menaikkan pengali poin (2 → ×2, 4 → ×3, 6 → ×4, 8 → ×5). Noda, decoy, atau kapsul yang terlewat memutus combo. Combo hanya memengaruhi skor, bukan meter, jadi syarat menang tidak berubah. Seri di leaderboard dipecah: skor sama → yang selesai lebih cepat, lalu yang main lebih dulu.
- **Reward (konfirmasi klien):** semua pemain yang menyelesaikan permainan mendapat 1 sticker, berapa pun skornya. Layar akhir menampilkan "YOU WIN 1 FREE STICKER!" dan meminta pemain menunjukkan layar ke staf; layar admin menampilkan jumlah sticker (1 per permainan).
- Kapsul Vitamin C: +10 poin, meter +14 (±8 kapsul untuk penuh). Noda: -10 poin, meter -8. Pengecoh: -5 poin, meter -5.
- **Kesulitan naik bertahap**: awal santai (jeda 900 ms, jatuh 480 px/s, 20% hazard), akhir lebih cepat (jeda 560 ms, 700 px/s, 45% hazard).
- **Penjadwal yang adil** (bukan lemparan dadu murni): tiga objek pertama selalu kapsul, hazard tidak pernah lebih dari 2 beruntun, hazard wajib muncul setelah 4 kapsul beruntun, dan posisi objek berikutnya selalu terjangkau dari objek sebelumnya.
- **Zona tangkap**: kapsul dihitung walau hanya menyentuh bibir keranjang (pemaaf), hazard hanya dihitung jika benar-benar masuk mangkuk (selisih tipis dianggap lolos). Kapsul yang meleset meredup supaya terlihat tidak dihitung.
- Perkiraan hasil untuk pemain simulasi (bukan data nyata, ronde 15 detik): pemula 4% menang (rata-rata meter 40%), casual 49%, rata-rata 90%, bagus dan ahli 100% (ahli selesai ±8 detik, skor ±285-415).
- Animasi akhir: gigi Day 1 → Day 7 (wipe), lalu skor
- Tanpa reward fisik dan tanpa audio kecuali ada suara bebas royalti

**Perlu play-test nyata:** model pemain di simulasi adalah asumsi. Setelah dites dengan orang sungguhan, sesuaikan model di `tests/support/simulate.ts` dan angka di config.

## 6. Aset

Sumber: `.resources/` (banyak duplikat; hampir semua CMYK dan berlapis).

- Oji ekspor PNG/WebP **RGB** per elemen: kapsul, noda, pengecoh, keranjang, meter, gigi Day 1/Day 7, tube, background, logo, ikon
- Font: Colgate Ready (Bold, BoldItalic, Light), Myriad Pro — boleh dipakai di game (konfirmasi klien)
- Referensi visual: `.resources/moodboard/` (storyboard Catch the Brightness; 2 video animasi alur game: satu landscape 1024x576, satu **portrait 576x1024** yang jadi acuan utama UI)
- Jangan masukkan PSD/AI ke project game

Brand: merah Colgate dengan gradient merah gelap radial, aksen oranye-emas. Klaim dan disclaimer wajib sesuai teks final dari klien (termasuk asterisk). Hati-hati karakter noda berduri — feedback sebelumnya menyebut molekul "terlihat seram".

## 7. Jadwal

| Tanggal         | Irsal                                                           | Oji                            |
| --------------- | --------------------------------------------------------------- | ------------------------------ |
| Rab 14 - Kam 15 | **Tes TV** → go/no-go; wireframe 4 layar; setup Vite+Phaser     | Ekstrak dan ekspor aset awal   |
| Jum 16 - Sab 17 | Prototype loop inti (placeholder)                               | Mockup dari wireframe          |
| Min 18          | Buffer                                                          | Review mockup, aset final awal |
| Sen 19 - Sel 20 | Skor, meter, timer, attract, auto-reset, IndexedDB, leaderboard | Aset final                     |
| Rab 21          | Sync Apps Script, menu admin                                    | Polishing                      |
| Kam 22          | Integrasi aset final, tuning                                    | Cek warna dan layout           |
| Jum 23          | Soak test 3-4 jam di TV asli, bug fix                           | Cek visual di TV               |
| Sab 24 - Min 25 | Instalasi dan serah                                             | Cek visual di lokasi           |

Scope beku setelah 19 Okt; revisi besar tidak masuk.

## 8. Tes TV (selesai sebelum wireframe dikunci)

- Touch dan drag kiri-kanan mulus, tanpa lag
- Fullscreen jalan, address bar hilang, tanpa pull-to-refresh/pinch zoom/long-press
- Layar tidak sleep, tanpa screensaver
- Resolusi dan DPR yang dilaporkan browser (1080p atau 4K), FPS animasi
- Browser apa dan versi berapa; bisa auto-buka URL saat TV nyala atau tidak
- Offline: halaman tetap jalan tanpa internet (service worker)
- Apps Script: kirim data dari browser TV berhasil (CORS)

Jika banyak yang gagal → pindah ke cadangan hari itu juga.

## 9. Pengujian akhir

- Touch dengan jari di TV asli, termasuk sentuhan cepat dan tidak sengaja
- Offline penuh → internet menyala: antrean terkirim, tanpa duplikat di sheet
- Tutup/buka browser atau TV: data lokal tetap ada
- Soak 3-4 jam tanpa crash atau memori bocor
- Idle reset: skor/inisial tidak bocor ke pemain berikutnya

## 10. Risiko

| Risiko                                     | Mitigasi                                          |
| ------------------------------------------ | ------------------------------------------------- |
| Browser TV tidak fullscreen/kiosk          | Tes 14-15 Okt, PWA, cadangan mini PC              |
| Data lokal terhapus (cache TV dibersihkan) | `storage.persist()`, ekspor CSV harian oleh admin |
| Tanpa internet sama sekali                 | Tetap jalan; ekspor CSV manual dari menu admin    |
| Aset CMYK/PSD berat                        | Oji ekspor RGB, ukuran dibatasi (jalur kritis)    |
| Waktu 10 hari                              | Scope beku setelah 19 Okt                         |
| Klaim/teks belum final                     | Teks di config, ganti tanpa ubah kode             |
| Mini PC cadangan belum dianggarkan         | Jangan dijanjikan ke klien sebelum biaya jelas    |

## 11. Pertanyaan ke klien (belum dijawab)

**Perangkat (blocker):**

1. Model TV, ukuran, resolusi; boleh uji di TV yang sama sebelum 24 Okt?
2. Ada internet/Wi-Fi di booth, stabil?
3. Hanya browser, atau boleh install aplikasi? Siapa yang menyalakan/menjaga TV?

**Game (blocker wireframe):** 4. Timer 30 atau 45 detik; berakhir saat meter penuh atau hanya saat waktu habis? 5. Poin per kapsul, penalti noda dan pengecoh, ada nyawa atau tidak? 6. Animasi akhir: gigi Day 1 → Day 7, atau gelombang Vitamin C + senyum? Ada reward fisik/voucher?

**Data:** 7. Data apa yang disimpan (inisial saja, atau HP/email)? Siapa penerima dan formatnya? 8. Jika ada data kontak: teks persetujuan (consent) disiapkan klien?

**Brand dan jadwal:** 9. Teks klaim/disclaimer final; musik/suara; boleh pakai font Colgate Ready? 10. Karakter noda berduri boleh seperti storyboard atau perlu versi ramah? 11. 24 Okt = serah build atau keputusan vendor? Kapan akses lokasi untuk uji?

Draft pesan WhatsApp untuk klien ada di riwayat percakapan.

## 12. Inkonsistensi dokumen klien (perlu dikonfirmasi)

- Win condition: "isi meter sebelum waktu habis" vs "meter penuh atau waktu habis"
- Animasi akhir: moodboard (gigi Day 1 → Day 7) vs dokumen mechanism (gelombang + senyum)
- "Reveal & Reward" tanpa isi reward; wireframe kita tanpa panel reward
- "LED touchscreen" vs "TV touchscreen"
- Slide Colgate Visual Update menyebut "Shoot the Stains" (4 lingkaran target); dikonfirmasi klien: pakai **Catch the Brightness**

## 13. Belum diperiksa

- Video moodboard sudah dilihat per frame (tanpa suara). Keduanya dibuat dengan AI dan berisi teks ngawur ("TRANSFOST SMILE", "UNLOB BEFORE & REWARD"), jadi teks final tetap dari dokumen mekanisme klien.
- Belum ada aset: **foto mulut Day 1/Day 7** untuk layar Unlock versi video (saat ini memakai render gigi Tooth 1 -> Tooth 4), dan efek pecahan hitam saat noda tertangkap.
- Belum diputuskan klien: tombol utama **emas** (video portrait) atau **merah** (storyboard gambar); saat ini emas untuk tombol utama, merah untuk tombol keyboard.
- File `.ai`, `.psd`, `.tif`, `.skp` hanya dilihat dari nama dan ukuran
- Slide Photo Booth dan Live Streaming tidak masuk scope
- Dokumen `Technical Drawing POSM OW Vit C.pptx` (116 slide, POSM fisik) tidak relevan untuk game
