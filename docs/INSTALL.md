# Panduan instalasi dan operasional booth

Untuk tim yang memasang dan menjaga game di lokasi (24-25 Oktober instalasi, event 28 Oktober - 1 November). Ringkas dan berurutan; centang satu per satu.

## 1. Sebelum berangkat

- [ ] Game sudah di-deploy ke hosting dan bisa dibuka lewat HTTPS.
- [ ] Sudah dites di TV 43 inch yang akan dipakai (lihat bagian 3). Browser bawaan TV adalah titik paling berisiko.

## 2. Menyiapkan TV

1. Putar layar ke **portrait** (pengaturan TV atau braket), resolusi Full HD atau 4K.
2. Matikan penghemat daya, screensaver, dan mode tidur otomatis TV. Matikan notifikasi atau pop-up apa pun.
3. Kalibrasi sentuhan jika layar punya menu kalibrasi.
4. Buka browser, masuk ke URL game, lalu:
   - Jadikan **halaman awal** atau tambahkan ke layar utama ("Add to Home screen") supaya terbuka otomatis saat TV menyala (kalau TV mendukung).
   - Masuk **fullscreen** (tombol START juga memintanya pada sentuhan pertama).
5. Atur volume TV ke tingkat yang pas (volume game tidak punya pengaturan sendiri).

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
| Tidak ada suara            | Sentuh layar sekali (browser mengunci suara sebelum sentuhan). Cek volume TV.                                                                                   |
| Animasi patah-patah        | Buka URL dengan tambahan `?quality=low`, atau biarkan game mendeteksinya sendiri (efek diringankan otomatis bila layar kewalahan)                               |
| Sentuhan tidak merespon    | Bersihkan layar, cek kabel USB sentuh, kalibrasi ulang.                                                                                                         |

## 6. Memperbarui game saat event berjalan

Setelah versi baru di-deploy, perangkat mengecek tiap 2 menit dan baru mengganti versi **saat layar Attract**, jadi tidak pernah memutus pemain di tengah ronde. Pembaruan tampak sebagai muat ulang singkat. Biasanya versi baru sudah tampil dalam 2-3 menit setelah deploy, selama perangkat online dan berada di layar Attract (atau kembali ke sana setelah 30 detik tanpa sentuhan).

### Kalau masih tampil versi lama (cache)

Game menyimpan semua filenya di perangkat supaya tetap jalan saat offline. Akibatnya, **reload biasa (F5) tetap menampilkan versi lama**: versi baru diunduh di latar belakang dan baru dipakai saat layar Attract. Ini normal, bukan galat.

Cara memastikan versi terbaru:

1. Tunggu 2-3 menit di layar Attract tanpa menyentuh layar. Halaman akan memuat ulang sendiri.
2. Belum berubah? Tutup browser sepenuhnya lalu buka lagi, atau hapus data situs dari pengaturan browser (**Clear cache / Site data**) lalu buka URL game kembali.
3. Pastikan perubahan dari versi baru memang sudah terlihat di layar (misalnya tampilan atau teks yang baru diubah).

## 7. Setelah event

- [ ] Matikan TV.
