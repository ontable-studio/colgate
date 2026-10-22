# Panduan instalasi dan operasional booth

Untuk tim yang memasang dan menjaga game di lokasi (24-25 Oktober instalasi, event 28 Oktober - 1 November). Ringkas dan berurutan; centang satu per satu.

## 1. Sebelum berangkat

- [ ] Game sudah di-deploy ke hosting dan bisa dibuka lewat HTTPS dari HP/laptop lain.
- [ ] Sudah dites di TV yang sama atau sejenis (lihat bagian 3).
- [ ] Bawa cadangan: laptop/mini PC dengan Chrome, kabel HDMI, dan kabel USB sentuh. Browser bawaan TV adalah titik paling berisiko.

## 2. Menyiapkan TV

1. Putar layar ke **portrait** (pengaturan TV atau braket), resolusi Full HD atau 4K.
2. Matikan penghemat daya, screensaver, dan mode tidur otomatis TV. Matikan notifikasi atau pop-up apa pun.
3. Kalibrasi sentuhan jika layar punya menu kalibrasi.
4. Buka browser, masuk ke URL game, lalu:
   - Jadikan **halaman awal** atau tambahkan ke layar utama ("Add to Home screen") supaya terbuka otomatis saat TV menyala (kalau TV mendukung).
   - Masuk **fullscreen** (tombol START juga memintanya pada sentuhan pertama).
5. Atur volume TV ke tingkat yang pas (volume game tidak punya pengaturan sendiri).

### Jika memakai PC/mini PC dengan Chrome

Mode kiosk membuat Chrome tampil penuh layar seperti aplikasi: tanpa bilah alamat, tanpa tab, dan pengunjung tidak bisa keluar sendiri. Cukup disiapkan sekali dengan membuat pintasan (shortcut):

1. Klik kanan di Desktop → **New** → **Shortcut**.
2. Pada kolom lokasi, tempel baris berikut (satu baris utuh). Alamat game sudah terisi; ganti hanya jika alamatnya berubah:

   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required https://colgate-omega.vercel.app/
   ```

3. Beri nama, misalnya `95% Vitamin C Blast`, lalu klik **Finish**.
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
| `https://colgate-omega.vercel.app/`          | Alamat game yang dibuka otomatis                                               |

Kalau Chrome terpasang di lokasi lain, sesuaikan bagian `C:\Program Files\...\chrome.exe`.

## 3. Uji akhir di lokasi (sekitar 15 menit)

- [ ] Layar Attract tampil penuh, tidak ada bilah alamat atau tombol browser.
- [ ] Sentuh START → How to Play → LET'S PLAY!: sentuhan terasa langsung.
- [ ] Main satu ronde penuh dengan geser jari. Keranjang mengikuti jari tanpa jeda, animasi mulus.
- [ ] Setelah timer habis, layar hasil menampilkan persentase. Tombol PLAY AGAIN dan HOME (ikon rumah) berfungsi.
- [ ] Suara terdengar jelas tapi tidak mengganggu stan sebelah. Setel dari volume TV.
- [ ] **Uji offline:** cabut internet, mainkan satu ronde. Harus tetap jalan sampai layar hasil.

## 4. Menyalakan dan mematikan tiap hari

Nyalakan TV dan tunggu game ke layar Attract. Tidak perlu apa-apa lagi: game memulihkan diri sendiri dan kembali ke layar Attract setelah 30 detik tanpa sentuhan. Saat tutup, matikan TV. Game tidak menyimpan data pemain, jadi tidak ada yang perlu diekspor atau dibersihkan.

## 5. Jika ada masalah

| Gejala                     | Yang dilakukan                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layar putih atau game beku | Tunggu sebentar; game me-reload sendiri. Kalau muncul "Something went wrong...", tunggu sekitar 70 detik (mencoba lagi otomatis) atau muat ulang halaman manual |
| Tidak ada suara            | Sentuh layar sekali (browser mengunci suara sebelum sentuhan). Cek volume TV. Mode PC: pakai opsi `--autoplay-policy` di atas                                   |
| Animasi patah-patah        | Buka URL dengan tambahan `?quality=low`, atau biarkan game mendeteksinya sendiri (efek diringankan otomatis bila layar kewalahan)                               |
| Sentuhan tidak merespon    | Bersihkan layar, cek kabel USB sentuh, kalibrasi ulang. Pindah ke perangkat cadangan bila perlu                                                                 |

## 6. Memperbarui game saat event berjalan

Setelah versi baru di-deploy, perangkat mengecek tiap 2 menit dan baru mengganti versi **saat layar Attract**, jadi tidak pernah memutus pemain di tengah ronde. Pembaruan tampak sebagai muat ulang singkat. Biasanya versi baru sudah tampil dalam 2-3 menit setelah deploy, selama perangkat online dan berada di layar Attract (atau kembali ke sana setelah 30 detik tanpa sentuhan).

### Kalau masih tampil versi lama (cache)

Game menyimpan semua filenya di perangkat supaya tetap jalan saat offline. Akibatnya, **reload biasa (F5) tetap menampilkan versi lama**: versi baru diunduh di latar belakang dan baru dipakai saat layar Attract. Ini normal, bukan galat.

Cara memastikan versi terbaru:

1. Tunggu 2-3 menit di layar Attract tanpa menyentuh layar. Halaman akan memuat ulang sendiri.
2. Belum berubah? **Hard reload**: tekan `Ctrl + Shift + R` (Mac: `Cmd + Shift + R`). Cara ini melewati cache dan langsung mengambil versi terbaru dari server.
3. Di TV tanpa keyboard: tutup browser sepenuhnya lalu buka lagi, atau hapus data situs dari pengaturan browser (**Clear cache / Site data**) lalu buka URL game kembali.
4. Pastikan perubahan dari versi baru memang sudah terlihat di layar (misalnya tampilan atau teks yang baru diubah).

Saat menguji di laptop: buka DevTools → **Application** → **Service Workers**, lalu centang **Update on reload**. Dengan begitu F5 biasa sudah cukup.

## 7. Setelah event

- [ ] Matikan TV dan cabut perangkat cadangan.
- [ ] Kembalikan perangkat sesuai kesepakatan dengan klien.
