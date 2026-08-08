# WAFFLEO POS - Manual Smoke Test Checklist

Sebelum merilis sistem ke produksi, lakukan *smoke test* manual ini pada perangkat kasir atau tablet untuk memastikan fungsi-fungsi vital berjalan normal tanpa error.

## 1. Authentication & Shift
- [ ] **Login Admin**: Pastikan bisa login dengan akun Admin, dan diarahkan ke Dashboard.
- [ ] **Login Kasir**: Pastikan bisa login dengan akun Kasir.
- [ ] **Buka Shift Kasir**: Pastikan muncul form input saldo awal (`openingCash`), dan bisa dibuka tanpa error.
- [ ] **Tutup Shift Kasir**: Lakukan tutup shift, pastikan saldo aktual (`closingCashActual`) bisa diisi, dan tercatat di database dengan benar.

## 2. Order & Pricing (Inti Transaksi)
- [ ] **Walk-in Order**:
  - Pilih Topping A. Pastikan harga `priceDirect` terpakai.
  - Tambah rasa (flavour) dan addon. Pastikan harganya sesuai `extraPriceDirect`.
  - Proses pembayaran Cash, dan pastikan kembalian (`changeGiven`) terhitung benar.
- [ ] **Platform Order (GrabFood / GoFood / ShopeeFood)**:
  - Ubah channel ke GrabFood atau GoFood.
  - Pilih menu. Pastikan harganya menggunakan `priceGrabGo` atau `priceShopee`.
  - Selesaikan pesanan. Order ID harus punya prefix sesuai platform (misalnya "GF-Nama").
- [ ] **Half-Half Topping**:
  - Pilih Topping Tiramisu + Cokelat (Half-Half).
  - Pastikan harga yang muncul adalah (Harga Tiramisu / 2) + (Harga Cokelat / 2).

## 3. Stock Management
- [ ] **Pengurangan Stok Otomatis**:
  - Cek stok salah satu bahan sebelum transaksi (misal `Topping Tiramisu` = 1000g).
  - Lakukan pemesanan 1 porsi (misal resep = 15g).
  - Selesaikan pesanan.
  - Buka halaman Inventory, pastikan stok bahan berkurang 15g menjadi 985g.
- [ ] **Half-Half Deduction**:
  - Lakukan pemesanan Half-Half Tiramisu + Cokelat.
  - Selesaikan pesanan.
  - Pastikan masing-masing bahan berkurang **setengah** dari resepnya (misal 15g / 2 = 7.5g).

## 4. Refund & Void
- [ ] **Refund Order Baru**:
  - Buat 1 pesanan Walk-in.
  - Kasir tidak bisa melakukan refund (hanya admin/supervisor).
  - Login sebagai Admin, masuk ke menu **Audit & Refund**.
  - Temukan pesanan tadi, lalu lakukan *Refund* dengan alasan "Pelanggan batal".
  - Pastikan flag `refunded` menjadi true, dan ada log "Refund" muncul di tabel Logs.
- [ ] **Laporan & Refund**:
  - Buka halaman Reports (Laporan Pendapatan).
  - Pastikan nilai transaksi yang sudah di-refund **TIDAK** masuk lagi di grand total hari tersebut.

## 5. Sinkronisasi (WebSocket)
- [ ] **Live Order Sync**:
  - Buka halaman "Daftar Pesanan" (Orders) di dua tab/browser yang berbeda.
  - Buat pesanan di tab 1.
  - Pastikan pesanan langsung muncul di tab 2 tanpa harus merefresh halaman (WebSocket bekerja).
