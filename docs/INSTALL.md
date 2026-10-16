# Panduan instalasi dan operasional booth

Untuk tim yang memasang dan menjaga game di lokasi (24-25 Oktober instalasi, event 28 Oktober - 1 November). Ringkas dan berurutan; centang satu per satu.

## 1. Sebelum berangkat

- [ ] Game sudah di-deploy ke hosting dan bisa dibuka lewat HTTPS dari HP/laptop lain.
- [ ] Build memakai `.env` yang benar (`VITE_SYNC_ENDPOINT`, `VITE_SYNC_SECRET`, `VITE_DEVICE_ID`). Variabel ini dibaca **saat build**, jadi build ulang setiap kali diubah.
- [ ] Sinkron Google Sheet sudah dicoba dari build yang sama (satu ronde → baris muncul di Sheet).
- [ ] Sudah dites di TV yang sama atau sejenis (lihat bagian 3).
- [ ] Bawa cadangan: laptop/mini PC dengan Chrome, kabel HDMI, dan kabel USB sentuh. Browser bawaan TV adalah titik paling berisiko.

## 2. Menyiapkan TV

1. Putar layar ke **portrait** (pengaturan TV atau braket), resolusi Full HD atau 4K.
2. Matikan penghemat daya, screensaver, dan mode tidur otomatis TV. Matikan notifikasi atau pop-up apa pun.
3. Kalibrasi sentuhan jika layar punya menu kalibrasi.
4. Buka browser, masuk ke URL game, lalu:
   - Jadikan **halaman awal** atau tambahkan ke layar utama ("Add to Home screen") supaya terbuka otomatis saat TV menyala (kalau TV mendukung).
   - Masuk **fullscreen** (tombol PLAY NOW juga memintanya pada sentuhan pertama).
5. Atur volume TV dulu ke tingkat sedang, lalu setel volume game di menu admin (bagian 5).

### Jika memakai PC/mini PC dengan Chrome

Mode kiosk membuat Chrome tampil penuh layar seperti aplikasi: tanpa bilah alamat, tanpa tab, dan pengunjung tidak bisa keluar sendiri. Cukup disiapkan sekali dengan membuat pintasan (shortcut):

1. Klik kanan di Desktop → **New** → **Shortcut**.
2. Pada kolom lokasi, tempel baris berikut (satu baris utuh), lalu ganti `https://URL-GAME-ANDA` dengan alamat game yang sebenarnya:

   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required https://URL-GAME-ANDA
   ```

3. Beri nama, misalnya `Catch the Brightness`, lalu klik **Finish**.
4. Klik dua kali pintasan itu untuk membuka game. Agar terbuka otomatis saat PC menyala, salin pintasan ke folder Startup (tekan `Win + R`, ketik `shell:startup`, lalu Enter).
5. Untuk keluar dari mode kiosk (misalnya untuk perawatan), tekan `Alt + F4` dengan keyboard.

Arti tiap bagian baris tadi:

| Bagian                                       | Fungsinya                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `--kiosk`                                    | Tampil penuh layar tanpa bilah alamat dan tombol browser                       |
| `--noerrdialogs`                             | Menyembunyikan kotak pesan galat Chrome supaya tidak menutupi game             |
| `--disable-pinch`                            | Mematikan cubit-untuk-zoom, jadi layar tidak bisa terperbesar tanpa sengaja    |
| `--overscroll-history-navigation=0`          | Mencegah geseran dari tepi layar membuat halaman kembali (back)                |
| `--autoplay-policy=no-user-gesture-required` | Mengizinkan musik layar awal berbunyi sendiri, tanpa menunggu sentuhan pertama |
| `https://URL-GAME-ANDA`                      | Alamat game yang dibuka otomatis                                               |

Kalau Chrome terpasang di lokasi lain, sesuaikan bagian `C:\Program Files\...\chrome.exe`.

## 3. Uji akhir di lokasi (sekitar 15 menit)

- [ ] Layar Attract tampil penuh, tidak ada bilah alamat atau tombol browser.
- [ ] Sentuh PLAY NOW → How to Play → LET'S PLAY: sentuhan terasa langsung.
- [ ] Main satu ronde penuh dengan geser jari. Keranjang mengikuti jari tanpa jeda, animasi mulus.
- [ ] Ketik inisial, tekan SAVE, papan skor muncul dan baris Anda ter-highlight.
- [ ] Suara terdengar jelas tapi tidak mengganggu stan sebelah. Setel di admin.
- [ ] **Uji offline:** cabut internet, mainkan satu ronde. Harus tetap jalan. Sambung lagi, buka admin: `PENDING` turun ke 0 dalam kurang dari satu menit.
- [ ] Buka admin dan cek: `SYNC on`, `LAST ERROR -`, `QUALITY normal`.
- [ ] Hapus data uji lewat admin (RESET DATA, dua ketukan), lalu pastikan baris uji di Sheet dihapus.

## 4. Menyalakan dan mematikan tiap hari

Nyalakan TV dan tunggu game ke layar Attract. Tidak perlu apa-apa lagi: game memulihkan diri sendiri dan kembali ke layar Attract setelah 30 detik tanpa sentuhan. Saat tutup, matikan TV; data tersimpan di perangkat.

## 5. Layar admin (operator)

Tahan pojok kiri atas layar Attract selama 2 detik. Layar admin menampilkan:

| Baris                      | Arti                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| `PLAYS` / `PENDING`        | Jumlah permainan tersimpan / yang belum terkirim ke Sheet                      |
| `LAST SYNC` / `LAST ERROR` | Waktu kirim terakhir / pesan galat terakhir                                    |
| `ONLINE`                   | Perkiraan browser saja, bisa "yes" walau jaringan putus. Percayai `LAST ERROR` |
| `QUALITY`                  | `low` berarti layar kewalahan dan efek diringankan otomatis                    |
| `SOUND`                    | Status dan volume                                                              |

Tombol: **SYNC NOW** (kirim sekarang), **EXPORT CSV** (unduh data), **RESET DATA** (hapus semua data lokal, dua ketukan), **SOUND ON/OFF**, **VOLUME** (25/50/75/100%), **BACK**.

Setiap hari sebelum pulang: pastikan `PENDING 0` (tekan SYNC NOW kalau perlu), lalu EXPORT CSV sebagai cadangan. **Jangan RESET DATA sebelum data terkirim atau diekspor.**

## 6. Jika ada masalah

| Gejala                                | Yang dilakukan                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layar putih atau game beku            | Tunggu sebentar; game me-reload sendiri. Kalau muncul "Something went wrong...", tunggu sekitar 70 detik (mencoba lagi otomatis) atau muat ulang halaman manual |
| Tidak ada suara                       | Sentuh layar sekali (browser mengunci suara sebelum sentuhan). Cek volume TV dan menu admin (SOUND: ON). Mode PC: pakai opsi `--autoplay-policy` di atas        |
| Animasi patah-patah                   | Buka URL dengan tambahan `?quality=low`, atau biarkan game mendeteksinya sendiri (baris `QUALITY` di admin)                                                     |
| `PENDING` tidak turun                 | Cek internet. Baca `LAST ERROR`. SYNC NOW. Data aman di perangkat dan terkirim begitu jaringan kembali                                                          |
| Sentuhan tidak merespon               | Bersihkan layar, cek kabel USB sentuh, kalibrasi ulang. Pindah ke perangkat cadangan bila perlu                                                                 |
| Inisial ditolak ("TRY OTHER LETTERS") | Normal: kombinasi huruf tertentu diblokir demi menjaga brand                                                                                                    |

## 7. Memperbarui game saat event berjalan

Setelah versi baru di-deploy, perangkat mengecek tiap 10 menit dan baru mengganti versi **saat layar Attract**, jadi tidak pernah memutus pemain di tengah ronde. Pembaruan tampak sebagai muat ulang singkat.

## 8. Setelah event

- [ ] EXPORT CSV dan simpan, pastikan semua data sudah di Sheet.
- [ ] Hapus baris uji dari Sheet (`TST`, `DUP`, `SAA`, dan sejenisnya).
- [ ] Ganti `SECRET` di Apps Script dan nonaktifkan deployment bila game tidak dipakai lagi.
- [ ] Serahkan data sesuai kesepakatan dengan klien.
