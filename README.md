# CMM Progress Dashboard

Dashboard theo dõi tiến độ đo kiểm CMM / ITR / Shipment, đọc trực tiếp file
Excel raw data từ Google Drive. Giao diện dark mode kỹ thuật, React + Vite.

Pipeline: **Google Drive (file .xlsx) -> GitHub (mã nguồn) -> Vercel (hosting)**

---

## Dashboard có gì

1. **Tổng quan tiến độ** - vòng tiến độ chung, số job hoàn thành, balance còn lại, cảnh báo quá hạn.
2. **Phân tích theo Category & Status** - biểu đồ cột Target vs Completed, biểu đồ tròn Open/Completed.
3. **Theo dõi Due Date** - danh sách job quá hạn và sắp đến hạn (<= 7 ngày).
4. **Bảng chi tiết** - tìm kiếm, lọc theo category/status, sắp xếp mọi cột.

Dashboard tự nhận cột từ file: Category, Ref No, Due Date, Plan Date,
Actual Date, Part Name, Qty Target, Stock, Completed, Ring SN, CMM Features,
Comment, Status, Balance, Progress %.

---

## 1. Chuẩn bị raw data trên Google Sheets

1. Mở file trên Google Sheets, đảm bảo có sheet (tab) tên `Raw_Data` với
   đúng các cột raw data.
2. Share -> đổi thành "Anyone with the link" -> Viewer.
3. Copy link, lấy phần GSHEET_ID:

   https://docs.google.com/spreadsheets/d/<GSHEET_ID>/edit...

   Phần <GSHEET_ID> là chuỗi cần copy.

Dashboard tải bản .xlsx qua endpoint export chính thức của Google Sheets:
https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx
Mỗi lần sửa số trên Sheets, bấm "Tải lại" trên dashboard là có số mới.

## 2. Cấu hình mã nguồn

File đã được cấu hình sẵn GSHEET_ID của bạn trong `src/config.js`:

    export const GSHEET_ID = '19S8uVe6yPyWz_R_jvtImqkiXZvKmy2iC';
    export const USE_SAMPLE_FALLBACK = false;   // false = đọc dữ liệu thật

Đổi sang sheet khác: chỉ cần thay GSHEET_ID. Nếu fetch thất bại (CORS / quyền),
dashboard tự rơi về dữ liệu mẫu kèm banner cảnh báo thay vì lỗi trắng.

## 3. Chạy thử ở máy

    npm install
    npm run dev      # mở http://localhost:5173

## 4. Đưa lên GitHub

    git init
    git add .
    git commit -m "CMM dashboard"
    git branch -M main
    git remote add origin https://github.com/<user>/<repo>.git
    git push -u origin main

## 5. Deploy lên Vercel

1. Vào vercel.com -> Add New -> Project -> import repo GitHub.
2. Vercel tự nhận Vite. Cấu hình đã có sẵn trong vercel.json
   (build: npm run build, output: dist).
3. Bấm Deploy. Mỗi lần git push, Vercel tự build lại.

---

## Lưu ý CORS với Google Drive

Trình duyệt fetch file từ drive.google.com đôi khi bị chặn CORS hoặc trả về
trang xác nhận với file lớn. Nếu gặp lỗi tải, chọn một trong các cách:

- Cách A (khuyến nghị): Dùng Google Sheet. Mở file bằng Google Sheets ->
  File -> Share -> Publish to web -> CSV, rồi sửa src/config.js để fetch CSV.
- Cách B (ổn định nhất): Đặt file .xlsx ngay trong repo (thư mục public/) và
  trỏ dataUrl() tới /ten-file.xlsx. Cập nhật data = push file mới.
- Cách C: Dùng serverless function trên Vercel làm proxy tải file từ Drive.

Phần tải dữ liệu tách riêng ở src/data.js (hàm loadData) nên đổi nguồn chỉ
sửa một chỗ.

---

## Cấu trúc dự án

    src/
      config.js       cấu hình nguồn dữ liệu (FILE_ID)
      data.js         tải + chuẩn hoá + tính metrics
      sampleData.js   dữ liệu mẫu từ file gốc
      App.jsx         toàn bộ UI dashboard
      dashboard.css   style components
      index.css       design tokens (màu, font)
