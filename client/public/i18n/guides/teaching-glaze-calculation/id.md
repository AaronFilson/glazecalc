---
title: Mengajarkan perhitungan glasir
lead: 6 sesi untuk kelas atau kelompok belajar, dari bahan dan ubin triaksial sampai formula Seger (UMF) yang dihitung dua arah dan cacat glasir, masing-masing dengan contoh hitungan, langkah di Glazecalc, lembar kerja untuk dicetak, dan pertanyaan untuk memeriksa pemahaman.
---

## Tentang paket ini {#about}

Paket ini untuk siapa pun yang mengajarkan perhitungan glasir: sekolah, kelas studio, kelompok belajar para pembuat keramik, atau pembuat keramik yang belajar sendiri. Isinya enam sesi, dan setiap sesi punya tujuan, persiapan, contoh hitungan dengan bahan nyata, cara mengerjakannya di Glazecalc, lembar kerja, dan pertanyaan untuk memeriksa pemahaman.

Urutan sesi mengikuti sebuah kelompok belajar yang pernah dipublikasikan: 陶磁器釉薬技術研究会 (kelompok studi glasir keramik) di Pusat Teknologi Industri Prefektur Ibaraki, Jepang, yang menjalankan enam sesi untuk 12 pembuat keramik muda pada 2015 dan melaporkannya dalam laporan penelitiannya. Kursus lanjutannya di sekolah tinggi seni keramik Kasama memberi tiga tugas ubin berisi 42, 90, dan 78 glasir, masing-masing dibakar secara oksidasi dan secara reduksi. **Glazecalc tidak berhubungan dengan pusat itu maupun sekolah tinggi itu.** Kami mengikuti urutan garis besar yang mereka publikasikan, dan mengutipnya di bawah; teks, contoh, dan lembar kerja di sini adalah buatan kami. Kursus di negara lain mengajarkan langkah yang sama dengan urutan yang hampir sama: SCT305 di Bilecik Şeyh Edebali University di Turki, ART 195 di Glendale Community College di AS, silabus Rheinland-Pfalz untuk sekolah keramik di Jerman, dan makalah 李堅萍 tahun 2006 untuk guru di Taiwan.

Table: Enam sesi
Label: Enam sesi

| Sesi | Pokok bahasan                               | Di Glazecalc                |
| ---- | ------------------------------------------- | --------------------------- |
| 1    | Bahan, fungsinya, ubin triaksial            | Bahan, Campuran (triaksial) |
| 2    | Kimia: unsur, rumus, mol                    | Halaman sebuah bahan        |
| 3    | Membaca formula Seger, bagan silika–alumina | Halaman resep, bagan Stull  |
| 4    | Dari resep ke formula Seger                 | Cara formula Seger dihitung |
| 5    | Dari formula Seger ke resep                 | Cari resep untuk target     |
| 6    | Bodi tanah liat dan cacat glasir            | Batas, Bandingkan           |

### Cara memakainya

- Setiap sesi berlangsung sekitar 2 jam. Sesi 4 dan 5 memerlukan kalkulator, dan komputer atau ponsel dengan Glazecalc untuk setiap pasangan.
- Contoh hitungan memakai bahan yang dijual di Jepang dan angka dari pustaka standar Glazecalc: 福島長石 (feldspar Fukushima), whiting (石灰石, kalsium karbonat), sebuah kaolin, dan silika (珪石). Pakai analisis dari pemasok Anda jika ada: tambahkan di [halaman Bahan](/material), maka angkanya berubah, tetapi metodenya tidak.
- Pembakaran dilakukan pada SK 8, {{2282 °F; 1250 °C}} nominal. Pakai kerucut yang dipakai kelas Anda; [Membakar dengan kerucut SK](/guides/firing#sk-cones) menjelaskan nomor SK.
- Untuk mencetak lembar kerja atau peta ubin, cetak halaman ini dari peramban. Menyimpan resep, campuran, dan catatan memerlukan akun gratis.

> [!WARNING]
> Sesi 1, 3, dan 6 adalah kerja laboratorium: menimbang bahan kering dan membakar. Sebelum ada yang menimbang bahan, baca [Kebiasaan yang paling penting](/guides/safe-mixing#habits). Debu glasir kering adalah bahaya utama.

## Sesi 1: Bahan dan ubin triaksial {#materials}

> [!WARNING]
> Timbang bahan kering dengan perlahan, bersihkan dengan cara basah, dan pakai respirator yang pas selama serbuk masih kering. Baca dulu [Bahaya utama: debu](/guides/safe-mixing#the-main-hazard) dan [Respirator](/guides/safe-mixing#respirators).

### Tujuan

- Sebutkan tiga fungsi dalam glasir: pembentuk kaca {{en: glass former}}, pelebur {{en: flux}}, dan penstabil {{en: stabilizer}}.
- Kelompokkan 4 bahan umum menurut oksida yang dibawanya.
- Siapkan campuran triaksial, dan baca ubinnya sebagai peta.

### Persiapan

- Satu kantong masing-masing 福島長石, whiting, kaolin, dan silika, atau bahan yang dimiliki kelas Anda.
- [Peta ubin triaksial](#tile-maps) di bawah, dicetak, dan 21 ubin uji per siswa untuk setiap segitiga.
- Ubin yang sudah dibakar dari triaksial sebelumnya, jika ada, untuk diedarkan.

### Contoh hitungan

Analisis setiap bahan, dari pustaka Glazecalc, memberi oksida yang tersisa setelah dibakar. Susut pijar (LOI) adalah bagian yang terbakar habis.

Table: Empat bahan dan yang dibawanya (persen berat, dari pustaka)
Label: Empat bahan

| Bahan               | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Fungsinya                                     |
| ------------------- | ---: | ----: | ----: | ---: | ----: | ----: | --------------------------------------------- |
| 福島長石 (feldspar) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Pelebur, dengan alumina dan silikanya sendiri |
| Whiting (石灰石)    |    – |     – |     – |    – | 56,03 | 43,97 | Pelebur (kalsium)                             |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Penstabil: sumber utama alumina               |
| Silika (珪石)       |  100 |     – |     – |    – |     – |     – | Pembentuk kaca                                |

Feldspar sendirian meleleh pada SK 8 menjadi kaca yang kental; whiting sendirian tidak meleleh; silika sendirian tidak meleleh. Dicampur, ketiganya meleleh jauh lebih baik daripada salah satunya. Campuran triaksial menunjukkan di mana: peta ubin di bawah menaikkan ketiganya dengan langkah ~20% (18 dari 90), dengan 10% kaolin di setiap ubin.

::shops

### Di Glazecalc

1. Buka setiap bahan di [halaman Bahan](/material), atau halaman publiknya, misalnya [Fukushima Feldspar](/materials/fukushima-feldspar). Catat oksida apa yang dibawanya.
2. Buat tiga resep: 福島長石 90 dengan kaolin 10, whiting 90 dengan kaolin 10, dan silika 90 dengan kaolin 10. Di [Campuran](/blends), pilih **Triaksial (3 resep)** dan 6 baris: 21 ubin, sama seperti peta di bawah.
3. Pilih batch untuk setiap ubin dan **Cetak** daftar yang akan ditimbang. Setelah pembakaran, simpan ubin yang Anda sukai sebagai resep dari gambar ubin.

### Lembar kerja

Table: Lembar kerja 1: yang dibawa setiap bahan
Label: Lembar kerja 1

| Bahan    | Oksida yang dibawanya | Pembentuk kaca, pelebur, atau penstabil? | LOI (%) |
| -------- | --------------------- | ---------------------------------------- | ------- |
| 福島長石 |                       |                                          |         |
| Whiting  |                       |                                          |         |
| Kaolin   |                       |                                          |         |
| Silika   |                       |                                          |         |

### Pemeriksaan

- Bahan mana yang membawa sebagian besar alumina, dan mengapa glasir memerlukannya?
- Mengapa sudut whiting pada segitiga tidak meleleh dengan sendirinya?
- Di bagian mana pada segitiga ubin Anda meleleh paling baik, dan sudut mana yang paling dekat?

## Sesi 2: Kimia yang Anda perlukan {#chemistry}

### Tujuan

- Baca rumus kimia: SiO₂, CaO, Al₂O₃, CaCO₃.
- Hitung massa molar dari bobot atom.
- Ubah gram menjadi mol, dan sebaliknya.

### Persiapan

- Satu tabel periodik untuk setiap siswa, dan kalkulator.
- Bobot atom pada tabel di bawah (nilai standar IUPAC, seperti yang dipakai Glazecalc).

### Contoh hitungan

Table: Bobot atom yang dipakai di sini (g/mol)
Label: Bobot atom

| Unsur     | Simbol | Bobot atom |
| --------- | ------ | ---------: |
| Oksigen   | O      |     15,999 |
| Karbon    | C      |     12,011 |
| Natrium   | Na     |      22,99 |
| Aluminium | Al     |     26,982 |
| Silikon   | Si     |     28,085 |
| Kalium    | K      |     39,098 |
| Kalsium   | Ca     |     40,078 |

Rumus menghitung atom. SiO₂ adalah satu silikon dan dua oksigen, jadi satu mol senyawa itu bermassa 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ adalah 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO adalah 56,077 g, dan whiting, CaCO₃, adalah 100,086 g; pustaka Glazecalc membulatkannya menjadi 100,08.

Satu **mol** adalah hitungan, seperti selusin: jumlah molekul yang sama, apa pun jenisnya. Mol adalah gram ÷ massa molar:

- 25 g silika adalah 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g whiting adalah 20 ÷ 100,08 = 0,200 mol. Di dalam tungku, whiting kehilangan karbon dioksidanya (CO₂, 44,009 g/mol) dan menyisakan 0,200 mol CaO, yang bermassa 0,200 × 56,077 = 11,2 g. Kehilangan itu adalah LOI-nya: 43,97%.

### Di Glazecalc

1. Buka [Whiting](/materials/whiting) dan [Silika](/materials/silica): setiap halaman memberi rumus dan bobotnya.
2. Periksa satu massa molar dengan menghitung sendiri, lalu cocokkan dengan halaman itu.

### Lembar kerja

Table: Lembar kerja 2: massa molar dan mol
Label: Lembar kerja 2

| Oksida atau bahan | Rumus | Massa molar (g/mol) | Gram | Mol |
| ----------------- | ----- | ------------------- | ---- | --- |
| Silika            | SiO₂  |                     | 30   |     |
| Alumina           | Al₂O₃ |                     | 10   |     |
| Kalsium oksida    | CaO   |                     | 5    |     |
| Whiting           | CaCO₃ |                     | 15   |     |

### Pemeriksaan

- Berapa gram satu mol SiO₂, dan bagaimana menghitungnya?
- Mengapa 20 g whiting menyisakan kurang dari 20 g dalam glasir yang sudah dibakar?
- Mengapa kita membandingkan oksida dengan mol, bukan dengan gram?

## Sesi 3: Membaca formula Seger {#reading-the-formula}

> [!WARNING]
> Mewarnai glasir berarti menimbang pewarna, dan sebagian di antaranya memerlukan kehati-hatian lebih daripada bahan dasar. Baca dulu [Bahan yang paling perlu hati-hati](/guides/safe-mixing#materials).

### Tujuan

- Baca tiga kolom formula Seger (ゼーゲル式): pelebur, penstabil, pembentuk kaca.
- Temukan sebuah glasir pada bagan silika–alumina, dan ketahui apa yang dapat dan tidak dapat dikatakan bagan itu.
- Warnai glasir siap pakai secara bertahap, dan catat.

### Persiapan

- Formula Seger di bawah, ditulis besar.
- Glasir transparan siap pakai, dan pewarna seperti oksida besi merah (弁柄).

### Contoh hitungan

Glasir sesi 4, 福島長石 45, whiting 20, kaolin 10, dan silika 25, memiliki formula Seger ini (angka Glazecalc, dibulatkan):

Table: Formula Seger dalam tiga kolomnya
Label: Formula Seger

| Pelebur (RO, R₂O) | Penstabil (R₂O₃) | Pembentuk kaca (RO₂) |
| ----------------- | ---------------- | -------------------- |
| K₂O 0,18          | Al₂O₃ 0,43       | SiO₂ 3,45            |
| Na₂O 0,10         |                  |                      |
| CaO 0,72          |                  |                      |

- Pelebur berjumlah 1: itulah aturan formula ini. Setiap angka lain adalah mol untuk setiap mol pelebur.
- Silika terhadap alumina adalah 3,45 ÷ 0,43, sekitar 8: glasir mengilap yang khas.
- Kalsium adalah sebagian besar pelebur, seperti pada kebanyakan glasir kapur Jepang (石灰釉).

Bagan dengan silika di sumbu mendatar dan alumina di sumbu tegak menempatkan setiap glasir sebagai sebuah titik. Uji Seger dan bagan Stull tahun 1912 termasuk jenis ini, dan 釉性状図 memetakan ubin kelas yang sudah dibakar ke dalamnya. Halaman resep Glazecalc menggambar bagan Stull, dan glasir ini berada di wilayahnya yang cerah. Wilayah Stull berasal dari pelebur dan pembakarannya sendiri: sekadar acuan, bukan prediksi. [Kisi ubin](#tile-maps) di bawah memungkinkan kelas menggambar bagannya sendiri pada pembakarannya sendiri.

::stull-chart

Untuk mewarnai glasir siap pakai yang resepnya tidak Anda ketahui, Glazecalc tidak dapat menghitung formulanya. Sebagai gantinya, tambahkan pewarna di atas 100: 100 g glasir kering dengan 1, 2, dan 3 g oksida besi, satu ubin masing-masing, dibakar secara oksidasi dan reduksi.

### Di Glazecalc

1. Di [halaman resep](/recipe), masukkan resep di atas dan baca **Formula Seger** dan **Bagan Stull**.
2. Ubah silika dari 25 menjadi 35, dan lihat titik bergeser ke kanan.
3. Untuk dasar yang resepnya Anda punya, jadikan pewarna sebagai tambahan dan pakai campuran garis di [Campuran](/blends) untuk membuat tahapannya.

### Lembar kerja

Table: Lembar kerja 3: pewarna dalam glasir siap pakai
Label: Lembar kerja 3

| Ubin | Pewarna (g per 100 g) | Oksidasi: tampilannya | Reduksi: tampilannya |
| ---- | --------------------- | --------------------- | -------------------- |
| 1    | 0                     |                       |                      |
| 2    | 1                     |                       |                      |
| 3    | 2                     |                       |                      |
| 4    | 3                     |                       |                      |

### Pemeriksaan

- Dalam formula Seger, kolom mana yang berjumlah 1?
- Berapa rasio silika terhadap alumina glasir ini, dan apa yang disarankannya?
- Mengapa titik di wilayah cerah bagan masih dapat menghasilkan ubin doff di tungku Anda?

## Sesi 4: Dari resep ke formula Seger {#recipe-to-formula}

### Tujuan

- Hitung formula Seger dari resep dengan tangan.
- Periksa hasilnya dengan hitungan Glazecalc sendiri.

### Persiapan

- Lembar kerja 4, keempat analisis dari sesi 1, dan kalkulator.

### Contoh hitungan

Resepnya: 福島長石 45, whiting 20, EPK kaolin 10, silika 25. Anggap setiap jumlah sebagai gram. Untuk setiap bahan, gram × persen oksida ÷ 100 ÷ massa molarnya menghasilkan mol-nya. Tabel memberi oksida utama; Glazecalc menghitung unsur jejaknya juga (besi dan titanium dari kaolin, magnesium dari feldspar).

Table: Mol setiap oksida dalam batch (100 g)
Label: Mol dalam batch

| Bahan    | Gram |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ---: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |   45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Whiting  |   20 |      – |      – | 0,1998 |      – |      – |
| Kaolin   |   10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Silika   |   25 |      – |      – |      – |      – | 0,4161 |
| Total    |  100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Pelebur berjumlah 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesia) = 0,2847 mol. Bagi setiap total dengan angka itu:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Itulah formula pada sesi 3.

### Di Glazecalc

1. Masukkan resep di [halaman resep](/recipe).
2. Buka **Cara formula Seger dihitung**. Bagian itu menunjukkan langkah-langkah ini dengan angka resep ini: gram, mol setiap oksida pada setiap bahan, totalnya, dan pembagian dengan pelebur.
3. Bandingkan setiap baris dengan lembar kerja Anda. Lalu ubah satu jumlah dan hitung hanya kolom yang berubah.

### Lembar kerja

Table: Lembar kerja 4: dari resep ke formula Seger
Label: Lembar kerja 4

| Bahan     | Gram | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| --------- | ---- | --- | ---- | --- | ----- | ---- |
|           |      |     |      |     |       |      |
|           |      |     |      |     |       |      |
|           |      |     |      |     |       |      |
|           |      |     |      |     |       |      |
| Total     |      |     |      |     |       |      |
| ÷ pelebur |      |     |      |     |       |      |

### Pemeriksaan

- Mengapa ukuran batch berapa pun menghasilkan formula Seger yang sama?
- Oksida apa yang dibawa kaolin, dan mana di antaranya yang paling penting di sini?
- Mengapa LOI whiting tidak dimasukkan dalam formula?

## Sesi 5: Dari formula Seger ke resep {#formula-to-recipe}

### Tujuan

- Pilih bahan untuk formula target, dan hitung berapa banyak masing-masing.
- Pakai Cari resep untuk target, dan katakan seberapa dekat hasilnya.

### Persiapan

- Target di bawah, lembar kerja 5, dan kalkulator; Glazecalc dengan akun.

### Contoh hitungan

Targetnya: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃, dan 4,0 SiO₂. Ambil bahan dalam urutan ini, masing-masing untuk oksida yang hanya bisa dibawanya:

1. **Feldspar, untuk kalium dan natrium.** Satu unit 福島長石 (536,8 g, bobot yang memuat satu mol pelebur) membawa 0,94 mol K₂O dan Na₂O. Target memerlukan 0,3, jadi 0,3 ÷ 0,94 = 0,319 unit: 171,4 g. Feldspar itu juga membawa 0,015 CaO, 0,328 Al₂O₃, dan 1,865 SiO₂.
2. **Whiting, untuk sisa kalsium.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, untuk sisa alumina.** 0,4 − 0,328 = 0,072 mol. EPK kaolin memuat satu mol Al₂O₃ dalam 272,6 g, jadi 19,6 g, yang juga membawa 0,149 SiO₂.
4. **Silika, untuk sisanya.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Batch-nya 379,0 g. Dalam persen: 福島長石 45,2, whiting 18,1, kaolin 5,2, silika 31,5. Feldspar menentukan rasio kalium terhadap natrium, jadi resep ini menghasilkan 0,195 K₂O dan 0,104 Na₂O: dekat dengan target, tetapi tidak tepat.

### Di Glazecalc

1. Buka [Cari resep untuk target](/solve), pilih **Formula Seger (mol, pelebur berjumlah 1)**, dan ketik targetnya.
2. Di bawah **Bahan**, berikan 福島長石, whiting, EPK kaolin, dan silika, lalu pilih **Cari**.
3. Hasilnya 福島長石 44,9, whiting 18,2, kaolin 5,6, dan silika 31,3, beserta tabel seberapa dekat setiap oksida. Bandingkan dengan hitungan tangan Anda: pencari resep menghitung setiap unsur jejak, dan menemukan kecocokan terbaik yang dimungkinkan keempat bahan itu.
4. **Buka sebagai resep baru**, dan periksa di halaman resep.

### Lembar kerja

Table: Lembar kerja 5: dari target ke resep
Label: Lembar kerja 5

| Langkah | Bahan | Untuk oksida apa | Mol yang diperlukan | Gram | Juga membawa |
| ------- | ----- | ---------------- | ------------------- | ---- | ------------ |
| 1       |       |                  |                     |      |              |
| 2       |       |                  |                     |      |              |
| 3       |       |                  |                     |      |              |
| 4       |       |                  |                     |      |              |

### Pemeriksaan

- Mengapa feldspar dihitung lebih dulu?
- Mengapa keempat bahan ini tidak dapat menghasilkan tepat 0,2 K₂O dan 0,1 Na₂O?
- Apa yang akan Anda tambahkan ke bahan untuk memasukkan magnesia?

## Sesi 6: Bodi tanah liat dan cacat glasir {#body-and-defects}

> [!WARNING]
> Glasir yang sudah dibakar dapat melepaskan logam ke makanan dan minuman, dan tampilannya bisa sempurna meskipun melepaskannya. Glasir yang kaya barium atau yang memakai tembaga, dan setiap glasir yang mengandung timbal, dapat mengalami pelindian. Hanya uji pelindian di laboratorium terhadap pot yang sudah dibakar yang menunjukkan apa yang dilepaskannya; tidak ada perhitungan yang dapat menunjukkannya. Baca [Keamanan pangan](/guides/glazing-basics#food-safety) dan [Bahan yang paling perlu hati-hati](/guides/safe-mixing#materials).

### Tujuan

- Ukur susut dan penyerapan air bodi.
- Sebutkan cacat yang umum, penyebab yang lazim, dan perbaikan pertamanya.
- Ketahui cacat mana yang membuat benda tidak aman.

### Persiapan

- Batang uji dari bodi tanah liat Anda, diberi tanda berjarak 100 mm saat basah, yang sudah dibakar dan yang belum.
- Ubin yang bercacat, jika ada: retak halus, menggumpal, lubang jarum, mengalir.

### Contoh hitungan

- **Susut**: (panjang bertanda − panjang setelah dibakar) ÷ panjang bertanda × 100. Tanda berjarak 100 mm yang terukur 88 mm setelah dibakar: susut 12%.
- **Penyerapan air**: (bobot setelah direndam − bobot kering) ÷ bobot kering × 100. Batang yang sudah dibakar seberat 50,0 g yang beratnya 50,6 g setelah direndam: 1,2%.

Table: Cacat, penyebab, dan perbaikan pertama dalam formula Seger
Label: Cacat

| Cacat                  | Penyebab yang lazim                              | Perbaikan pertama yang dicoba                              |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Retak halus            | Glasir menyusut lebih banyak daripada bodi       | Kurangi K₂O dan Na₂O; tambah kalsium, magnesia, atau boron |
| Mengelupas (shivering) | Glasir menyusut jauh lebih sedikit daripada bodi | Tambah K₂O dan Na₂O                                        |
| Mengalir               | Alumina terlalu sedikit, atau terlalu tebal      | Tambah alumina; lapisan lebih tipis                        |
| Menggumpal             | Biskuit berdebu, atau lapisan tebal yang retak   | Bersihkan biskuit; lapisan lebih tipis                     |
| Lubang jarum           | Gas yang tidak menutup kembali                   | Tahan di puncak pembakaran; lapisan lebih tipis            |

[Kecocokan glasir dan cacat](/guides/glazing-basics#fit-and-defects) menjelaskan masing-masing, dengan uji air es untuk retak halus. Jangan pakai benda yang retak halus atau mengelupas untuk makanan atau minuman.

::food-limits

### Di Glazecalc

1. Di [halaman resep](/recipe), baca panel **Batas** untuk glasir Anda, dan pemuaian hasil hitungannya.
2. Salin resep, tukar sebagian feldspar dengan whiting, lalu bandingkan keduanya: ke arah mana pemuaian bergerak?

### Lembar kerja

Table: Lembar kerja 6: bodi tanah liat
Label: Lembar kerja 6

| Batang | Panjang bertanda (mm) | Panjang setelah dibakar (mm) | Susut (%) | Bobot kering (g) | Bobot setelah direndam (g) | Penyerapan (%) |
| ------ | --------------------- | ---------------------------- | --------- | ---------------- | -------------------------- | -------------- |
| 1      | 100                   |                              |           |                  |                            |                |
| 2      | 100                   |                              |           |                  |                            |                |

### Pemeriksaan

- Cacat mana yang berasal dari glasir yang menyusut lebih banyak daripada bodinya, dan apa perbaikan pertamanya?
- Mengapa benda yang mengelupas jangan pernah dipakai untuk makanan?
- Dapatkah perhitungan menunjukkan bahwa glasir aman untuk makanan? Apa yang dapat?

## Peta ubin untuk dicetak {#tile-maps}

### Peta triaksial: 42 glasir

Dua segitiga dengan 21 ubin, dari tata letak Campuran dengan 6 baris: ubin 1 di puncak (feldspar), baris bawah dari whiting (kiri) ke silika (kanan). Segitiga II adalah segitiga I dengan 1 g oksida besi merah di atas setiap 100 g, yang bergeser ke arah seladon (青磁) pada reduksi. Dibakar secara oksidasi dan reduksi, itu 84 ubin. Jumlah dalam gram per 100 g.

Table: Peta triaksial: 福島長石, whiting, dan silika, dengan 10 kaolin di setiap ubin
Label: Peta triaksial

| Ubin (I) | Ubin (II) | 福島長石 | Whiting | Silika | Kaolin | I oks | I red | II oks | II red |
| -------- | --------- | -------: | ------: | -----: | -----: | ----- | ----- | ------ | ------ |
| 1        | 22        |       90 |       0 |      0 |     10 |       |       |        |        |
| 2        | 23        |       72 |      18 |      0 |     10 |       |       |        |        |
| 3        | 24        |       72 |       0 |     18 |     10 |       |       |        |        |
| 4        | 25        |       54 |      36 |      0 |     10 |       |       |        |        |
| 5        | 26        |       54 |      18 |     18 |     10 |       |       |        |        |
| 6        | 27        |       54 |       0 |     36 |     10 |       |       |        |        |
| 7        | 28        |       36 |      54 |      0 |     10 |       |       |        |        |
| 8        | 29        |       36 |      36 |     18 |     10 |       |       |        |        |
| 9        | 30        |       36 |      18 |     36 |     10 |       |       |        |        |
| 10       | 31        |       36 |       0 |     54 |     10 |       |       |        |        |
| 11       | 32        |       18 |      72 |      0 |     10 |       |       |        |        |
| 12       | 33        |       18 |      54 |     18 |     10 |       |       |        |        |
| 13       | 34        |       18 |      36 |     36 |     10 |       |       |        |        |
| 14       | 35        |       18 |      18 |     54 |     10 |       |       |        |        |
| 15       | 36        |       18 |       0 |     72 |     10 |       |       |        |        |
| 16       | 37        |        0 |      90 |      0 |     10 |       |       |        |        |
| 17       | 38        |        0 |      72 |     18 |     10 |       |       |        |        |
| 18       | 39        |        0 |      54 |     36 |     10 |       |       |        |        |
| 19       | 40        |        0 |      36 |     54 |     10 |       |       |        |        |
| 20       | 41        |        0 |      18 |     72 |     10 |       |       |        |        |
| 21       | 42        |        0 |       0 |     90 |     10 |       |       |        |        |

### Kisi Seger: 24 glasir

Setiap ubin memiliki pelebur yang sama, 0,2 KNaO dan 0,8 CaO, dari 福島長石 dan whiting. Alumina bertambah ke bawah di sepanjang baris kisi, dan silika bertambah ke samping di sepanjang kolom. Resepnya dihitung dengan metode sesi 5; formula Seger Glazecalc untuk masing-masing berada dalam 0,01 dari alumina dan 0,06 dari silikanya. Tandai setiap ubin pada bagan silika terhadap alumina, dan gambar wilayah Anda sendiri: doff, mengilap, kurang bakar, mengalir.

Table: Kisi Seger: 0,2 KNaO, 0,8 CaO, persen berat
Label: Kisi Seger

| Ubin | Al₂O₃ | SiO₂ | 福島長石 | Whiting | Kaolin | Silika | Oksidasi | Reduksi |
| ---- | ----: | ---: | -------: | ------: | -----: | -----: | -------- | ------- |
| 1    |  0,25 |  2,0 |     46,9 |    32,5 |    3,5 |   17,1 |          |         |
| 2    |  0,25 |  2,5 |     41,8 |    28,9 |    3,1 |   26,2 |          |         |
| 3    |  0,25 |  3,0 |     37,6 |    26,1 |    2,8 |   33,5 |          |         |
| 4    |  0,25 |  3,5 |     34,3 |    23,7 |    2,5 |   39,5 |          |         |
| 5    |  0,25 |  4,0 |     31,4 |    21,7 |    2,3 |   44,5 |          |         |
| 6    |  0,25 |  4,5 |     29,0 |    20,1 |    2,2 |   48,7 |          |         |
| 7    |  0,35 |  2,0 |     44,3 |    30,6 |   13,9 |   11,3 |          |         |
| 8    |  0,35 |  2,5 |     39,6 |    27,4 |   12,4 |   20,5 |          |         |
| 9    |  0,35 |  3,0 |     35,9 |    24,8 |   11,2 |   28,0 |          |         |
| 10   |  0,35 |  3,5 |     32,8 |    22,7 |   10,3 |   34,2 |          |         |
| 11   |  0,35 |  4,0 |     30,2 |    20,9 |    9,5 |   39,5 |          |         |
| 12   |  0,35 |  4,5 |     28,0 |    19,4 |    8,8 |   43,9 |          |         |
| 13   |  0,45 |  2,0 |     41,9 |    29,0 |   23,1 |    6,1 |          |         |
| 14   |  0,45 |  2,5 |     37,7 |    26,1 |   20,8 |   15,4 |          |         |
| 15   |  0,45 |  3,0 |     34,3 |    23,7 |   18,9 |   23,0 |          |         |
| 16   |  0,45 |  3,5 |     31,5 |    21,8 |   17,4 |   29,4 |          |         |
| 17   |  0,45 |  4,0 |     29,1 |    20,1 |   16,0 |   34,8 |          |         |
| 18   |  0,45 |  4,5 |     27,0 |    18,7 |   14,9 |   39,4 |          |         |
| 19   |  0,55 |  2,0 |     39,7 |    27,5 |   31,4 |    1,5 |          |         |
| 20   |  0,55 |  2,5 |     35,9 |    24,9 |   28,4 |   10,8 |          |         |
| 21   |  0,55 |  3,0 |     32,8 |    22,7 |   26,0 |   18,5 |          |         |
| 22   |  0,55 |  3,5 |     30,2 |    20,9 |   23,9 |   25,0 |          |         |
| 23   |  0,55 |  4,0 |     28,0 |    19,4 |   22,1 |   30,5 |          |         |
| 24   |  0,55 |  4,5 |     26,1 |    18,1 |   20,6 |   35,3 |          |         |

Campuran Glazecalc membuat segitiga dan persegi dari 3 sampai 66 ubin, bukan kisi ini; buka ubin mana pun sebagai resep di [halaman resep](/recipe) dan cetak daftar batch-nya dari sana.

## Sumber {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): enam sesi itu.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: tanggal dan pokok bahasan sesi.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: tugas kursus lanjutan berupa 42, 90, dan 78 glasir dalam oksidasi dan reduksi.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): program perhitungan milik pusat itu sendiri.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): formula Seger pada minggu 5, 6, dan 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): perhitungan glasir untuk guru sekolah di Taiwan.
- Glendale Community College, ART 195 course outline: formula Seger pada minggu 5 sampai 7 dari 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analisis 福島長石 dalam pustaka Glazecalc.
- IUPAC, bobot atom standar, seperti yang dipakai kimia Glazecalc.
