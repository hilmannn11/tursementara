// Object-level lessons are shared by every panorama showing the same stone.
const STONE_SOURCES = {
  decree: {
    label: "Pemerintah Kabupaten Banyuwangi (2025b). Keputusan Bupati Banyuwangi Nomor 188/82/KEP/429.011/2025 tentang Penetapan Situs Kendenglembu Banyuwangi sebagai Situs Cagar Budaya.",
    url: "https://jdih.banyuwangikab.go.id/anjungan-jdih/keputusan_bupati/detail/keputusan-bupati-banyuwangi-nomor-18882kep4290112025-tentang-penetapan-situs-kendenglembu-banyuwangi-sebagai-situs-cagar-budaya",
  },
  learning: {
    label: "Yudiana & Mahfud (2023), Santhet 7(1), 108–120; khususnya hlm. 112–117.",
    url: "https://ejournal.unibabwi.ac.id/index.php/santhet/article/view/2787",
  },
  plants: {
    label: "Sulistyarto & Muasomah (2023), Naditira Widya 17(2), 87–100; khususnya hlm. 88–91, 94, 99.",
    url: "https://ejournal.brin.go.id/nw/article/view/5622",
  },
  layers: {
    label: "Noerwidi (2009), Archaeological research at Kendeng Lembu, East Java, Indonesia, BIPPA 29, 26–32.",
    url: "https://journals.lib.washington.edu/index.php/BIPPA/article/view/9474",
  },
  mortar: {
    label: "Dinas Kebudayaan DIY, Jogjacagar: Lumpang Batu di Karangasem A, Paliyan (pembanding pengertian lumpang).",
    url: "https://jogjacagar.jogjaprov.go.id/detail/3781/lumpang-batu-di-karangasem-a-paliyan",
  },
};

const PLAQUE_LESSON = {
  title: "Situs Kendenglembu",
  subtitle: "Surat keputusan dan pelestarian situs",
  document: "./assets/documents/sk-bupati-kendenglembu-2025.pdf",
  questions: [
    {
      id: "kendenglembu-sk-penetapan",
      question: "Apa pokok penetapan dalam Keputusan Bupati Nomor 188/82/KEP/429.011/2025?",
      options: [
        "Menetapkan setiap batu koleksi sebagai bangunan cagar budaya tersendiri.",
        "Menetapkan Situs Kendenglembu Banyuwangi sebagai Situs Cagar Budaya.",
        "Menetapkan perkebunan di sekitar Kendenglembu sebagai kawasan wisata agro.",
        "Menetapkan Situs Malangsari Afdeling Mulyosari sebagai Situs Cagar Budaya.",
        "Menetapkan seluruh temuan Kendenglembu berasal dari satu periode yang sama.",
      ],
      answer: 1,
      explanation: "Diktum Kesatu menetapkan status Situs Cagar Budaya untuk Kendenglembu Banyuwangi.",
      hint: "Perhatikan nama objek dan statusnya pada bagian isi keputusan.",
    },
    {
      id: "kendenglembu-sk-lampiran",
      question: "Menurut Diktum Kedua, bagaimana kedudukan lampiran dalam SK ini?",
      options: [
        "Bahan bacaan tambahan yang terpisah dari keputusan.",
        "Daftar usulan yang baru digunakan sebelum penetapan.",
        "Kumpulan foto pengunjung yang dapat menggantikan data situs.",
        "Bagian yang menyatu dengan keputusan dan memuat deskripsi serta data cagar budaya.",
        "Dokumen baru yang membatalkan keputusan pada halaman sebelumnya.",
      ],
      answer: 3,
      explanation: "Lampiran berisi deskripsi dan data cagar budaya serta menjadi bagian dari keputusan.",
      hint: "Baca keterangan Diktum Kedua pada penjelasan surat keputusan.",
    },
    {
      id: "kendenglembu-sk-tanggal",
      question: "SK ditetapkan pada 28 April 2025. Apa makna tanggal tersebut?",
      options: [
        "Tanggal seluruh artefak Kendenglembu pertama kali dibuat.",
        "Tanggal penemuan pertama Situs Kendenglembu oleh peneliti.",
        "Tanggal berakhirnya semua kegiatan penelitian di situs.",
        "Tanggal semua batu dalam panorama mulai digunakan pada masa Neolitik.",
        "Tanggal penetapan sekaligus mulai berlakunya keputusan.",
      ],
      answer: 4,
      explanation: "Diktum Ketiga menyatakan keputusan berlaku sejak ditetapkan. Tanggal itu bukan usia artefak.",
      hint: "Hubungkan tanggal penetapan dengan Diktum Ketiga, lalu bedakan dari waktu pembuatan artefak.",
    },
  ],
};

const STONE_LESSONS = {
  first: {
    title: "Batu Lumpang",
    subtitle: "Cekungan batu dan jejak pengolahan bahan",
    summary: "Kenali bentuk lumpang, cara kerjanya, dan bukti kecil yang membantu peneliti memahami pemanfaatan tumbuhan.",
    observation: "Pada dokumentasi ini, batu pertama tampak lebih membulat dan tinggi, dengan satu cekungan di bagian atas. Perhatikan bibir, dinding, dan dasar cekungannya melalui model 3D.",
    sections: [
      {
        title: "Apa yang disebut lumpang?",
        body: "Lumpang adalah alat tumbuk dengan lubang cekung pada permukaan. Cekungan menjadi tempat bahan saat ditumbuk, sehingga bahan lebih terkumpul. Pengolahan biji-bijian merupakan salah satu penggunaan lumpang yang dikenal. Namun, bentuk berlubang saja belum menentukan bahan yang pernah diolah pada batu ini.",
        sources: ["mortar"],
      },
      {
        title: "Dari bentuk menuju bukti pemakaian",
        body: "Sulistyarto dan Muasomah meneliti sisa tumbuhan berukuran mikroskopis pada artefak kawasan Kendenglembu. Pati adalah cadangan makanan tumbuhan; fitolit merupakan bentukan silika dari jaringan tumbuhan yang dapat tertinggal. Peneliti membandingkan temuan dengan contoh tumbuhan modern untuk membantu mengenali sumbernya. Analisis seperti ini dapat menguji dugaan penggunaan alat.",
        sources: ["plants"],
      },
      {
        title: "Apa yang sudah diketahui?",
        body: "Kajian tersebut membahas bukti pemanfaatan tumbuhan, termasuk padi pada residu gerabah. Temuan itu memberi konteks kehidupan di kawasan situs, tetapi tidak membuktikan bahwa batu yang sedang kamu lihat dipakai menumbuk padi. Penulis juga menegaskan bahwa bukti domestikasi masih memerlukan penelitian lanjutan. Pemanfaatan tumbuhan dan domestikasi tidak boleh langsung disamakan.",
        sources: ["plants"],
      },
      {
        title: "Latihan membaca benda",
        body: "Pisahkan catatan pengamatan dari dugaan. “Ada satu cekungan di atas batu” adalah pengamatan. “Batu ini khusus untuk padi” adalah dugaan yang perlu diuji. Saat memutar model, coba jelaskan bentuknya tanpa langsung memberi tanggal, nama pembuat, atau jenis bahan yang diolah.",
        sources: [],
      },
    ],
    sources: ["mortar", "plants"],
    questions: [
      {
        id: "lumpang-1-fungsi",
        question: "Dalam cara kerja lumpang, apa peran utama cekungan?",
        options: [
          "Menjadi bidang gesek untuk mengasah sisi tajam alat.",
          "Menjadi cetakan yang menentukan bentuk alat batu baru.",
          "Menampung bahan agar terkumpul saat proses penumbukan.",
          "Menjadi dudukan tetap bagi tangkai alat pemotong.",
          "Menjadi saluran untuk mengalirkan air dari permukaan.",
        ],
        answer: 2,
        explanation: "Cekungan berfungsi sebagai wadah penumbukan. Fungsi umum ini belum memberi tahu bahan apa yang pernah diolah pada batu yang ditampilkan.",
        hint: "Bedakan wadah untuk menumbuk dengan bidang asah, cetakan, dan saluran.",
      },
      {
        id: "lumpang-1-residu",
        question: "Peneliti ingin menguji dugaan bahwa suatu alat digunakan mengolah tumbuhan. Bukti mana yang paling langsung berkaitan dengan dugaan itu?",
        options: [
          "Kesamaan warna alat dengan batu di sekitar kebun.",
          "Kedekatan tempat pajangnya dengan tanaman pangan.",
          "Kemiripan ukuran lubang dengan lumpang lain.",
          "Posisi alat di dekat gerabah dalam ruang pamer.",
          "Residu pati atau fitolit pada alat yang dianalisis secara terkontrol.",
        ],
        answer: 4,
        explanation: "Residu tumbuhan dapat menguji dugaan pemakaian. Penelitian kawasan belum berarti kedua batu dalam tur ini sudah diuji.",
        hint: "Cari bukti yang melekat pada alat dan dapat diperiksa, bukan hanya kemiripan atau lokasi pajang.",
      },
      {
        id: "lumpang-1-pengamatan",
        question: "Catatan mana yang benar-benar berupa pengamatan dari foto atau model batu pertama?",
        options: [
          "Batu digunakan khusus untuk menumbuk padi.",
          "Batu tampak membulat dengan satu cekungan di atas.",
          "Batu dibuat pada satu tahun tertentu di masa Neolitik.",
          "Batu dimiliki keluarga petani yang tinggal di dekat sungai.",
          "Cekungan dibuat untuk mengolah satu jenis tanaman saja.",
        ],
        answer: 1,
        explanation: "Bentuk dan jumlah cekungan dapat diamati. Fungsi khusus, umur, dan pemilik membutuhkan bukti tambahan.",
        hint: "Pilih ciri yang bisa kamu tunjuk langsung pada gambar tanpa menebak riwayatnya.",
      },
    ],
  },
  second: {
    title: "Batu Lumpang",
    subtitle: "Bentuk berbeda, riwayat yang perlu ditelusuri",
    summary: "Bandingkan batu yang lebih melebar ini dan pelajari mengapa konteks penemuan penting untuk memahami umur serta fungsinya.",
    observation: "Batu kedua tampak lebih memanjang dan rendah dibanding batu pertama, dengan cekungan pada permukaan atas. Warna gelap dan bercak pada permukaan terlihat dalam foto; keduanya bukan ukuran umur batu.",
    sections: [
      {
        title: "Bentuk berbeda belum berarti fungsi berbeda",
        body: "Bandingkan garis luar, proporsi badan, posisi cekungan, dan tebal bibir kedua batu. Perbedaan itu dapat dicatat, tetapi tidak cukup untuk menyimpulkan bahwa keduanya pasti berasal dari zaman atau mempunyai fungsi yang berbeda. Model tidak memiliki skala ukur terverifikasi; jangan memakai ukuran di layar untuk menyatakan ukuran asli.",
        sources: [],
      },
      {
        title: "Mengapa konteks penemuan penting?",
        body: "Konteks adalah hubungan benda dengan lokasi asal, lapisan tanah, dan temuan di sekitarnya. Laporan Noerwidi membedakan lapisan budaya Neolitik dan masa sejarah di Kendenglembu. Dalam kotak ekskavasi yang dibahas, endapan tuf memisahkan lapisan tersebut. Karena situs memiliki lebih dari satu fase, semua benda di kawasan ini tidak otomatis sezaman.",
        sources: ["layers"],
      },
      {
        title: "Bagaimana menelusuri umur batu ini?",
        body: "Mulailah dengan nomor inventaris dan catatan penemuan, kemudian cocokkan dengan laporan penelitian. Tanyakan dari lapisan mana benda berasal serta temuan apa yang menyertainya. Tempat pajang sekarang tidak selalu sama dengan tempat penemuan. Dua batu yang berdekatan dalam panorama belum membuktikan bahwa keduanya ditemukan bersama atau digunakan pada masa yang sama.",
        sources: ["layers"],
      },
      {
        title: "Belajar sejarah dari benda nyata",
        body: "Yudiana dan Mahfud mencantumkan lumpang batu di antara temuan Kendenglembu dan membahas situs sebagai sumber belajar sejarah. Kegiatan belajarnya meliputi mengamati objek, mencatat ciri, bertanya kepada pemandu, lalu menyusun kesimpulan dari data. Saat berkunjung, dokumentasikan tanpa menggores atau memindahkan benda. Untuk batu kedua, pertanyaan yang berguna ialah: apa nama inventarisnya dan di mana pertama kali ditemukan?",
        sources: ["learning"],
      },
    ],
    sources: ["layers", "learning"],
    questions: [
      {
        id: "lumpang-2-konteks",
        question: "Dua batu dipajang berdekatan di Kendenglembu. Kesimpulan mana yang paling dapat dipertanggungjawabkan?",
        options: [
          "Keduanya berasal dari lapisan tanah yang sama.",
          "Batu yang lebih gelap dibuat lebih dahulu.",
          "Keduanya pasti digunakan oleh kelompok yang sama.",
          "Hubungan waktunya perlu diperiksa melalui catatan penemuan.",
          "Batu yang lebih rendah adalah versi yang lebih baru.",
        ],
        answer: 3,
        explanation: "Kedekatan tempat pajang bukan bukti kesamaan umur. Riwayat dan konteks penemuan perlu dicocokkan.",
        hint: "Pisahkan posisi benda saat dipajang dari posisi serta lapisan asalnya.",
      },
      {
        id: "lumpang-2-lapisan",
        question: "Apa arti penting adanya lapisan Neolitik dan masa sejarah dalam laporan Kendenglembu?",
        options: [
          "Seluruh temuan dapat diberi umur dari lapisan tertua.",
          "Ada beberapa fase kegiatan; tiap benda perlu dikaitkan dengan konteksnya.",
          "Bentuk cekungan saja cukup untuk memilih periode sebuah batu.",
          "Letak benda di permukaan sekarang menentukan lapisan asalnya.",
          "Semua temuan batu termasuk Neolitik, sedangkan gerabah masa sejarah.",
        ],
        answer: 1,
        explanation: "Situs memuat beberapa fase. Bahan atau bentuk benda saja tidak menentukan lapisan asal dan umurnya.",
        hint: "Satu kawasan dapat digunakan pada waktu berbeda. Pikirkan hubungan benda dengan lapisan asalnya.",
      },
      {
        id: "lumpang-2-dokumentasi",
        question: "Catatan lapangan mana yang paling membantu menelusuri identitas batu kedua?",
        options: [
          "Foto dekat yang hanya menampilkan warna permukaannya.",
          "Nama populer batu tanpa mencatat sumber informasinya.",
          "Perkiraan umur berdasarkan ukuran model di layar.",
          "Posisi pajang saat ini yang dianggap sebagai lokasi penemuan.",
          "Foto ciri, nomor inventaris, serta keterangan asal dari pengelola.",
        ],
        answer: 4,
        explanation: "Ciri visual, nomor inventaris, dan keterangan asal dapat dicocokkan dengan catatan koleksi. Cantumkan sumber informasi agar bisa diperiksa kembali.",
        hint: "Pilih catatan yang memungkinkan foto dihubungkan kembali dengan benda dan riwayatnya.",
      },
    ],
  },
};
