/**
 * ============================================================
 *  GOOGLE APPS SCRIPT – Wedding RSVP Backend - Bản Nâng Cấp Giao Diện
 *  Văn Cường & Hải Lý
 * ============================================================
 */

const DEFAULT_SHEET = 'RSVP';

function getSheetBySource(source) {
  if (source === 'nhatrai') return 'Nhà Trai';
  if (source === 'nhagai') return 'Nhà Gái';
  return DEFAULT_SHEET;
}

// ── Nhận dữ liệu gửi từ form RSVP ──────────────────────────
function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : '';
    const data = JSON.parse(raw);
    
    const sheetName = getSheetBySource(data.source);
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    // 1. TẠO TAB MỚI VÀ ĐỊNH DẠNG HEADER ĐẸP MẮT
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    }
    
    if (sheet.getLastRow() === 0) {
      // Viết Tiếng Việt cho các cột để người dùng dễ xem
      sheet.appendRow(['Mã ID', 'Họ và Tên', 'Số Điện Thoại', 'Tình Trạng Xác Nhận', 'Người Đi Cùng', 'Lời Nhắn Gửi', 'Thời Gian Gửi']);
      sheet.setFrozenRows(1); // Cố định dòng tiêu đề
      
      // Makeup Header
      const headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F4CCCC'); // Màu hồng pastel hợp đám cưới
      headerRange.setFontColor('#990000');  // Chữ đỏ đậm
      headerRange.setHorizontalAlignment('center');
      headerRange.setVerticalAlignment('middle');
      
      // Độ rộng các cột
      sheet.setColumnWidth(1, 110); // ID
      sheet.setColumnWidth(2, 200); // Tên
      sheet.setColumnWidth(3, 130); // Điện thoại
      sheet.setColumnWidth(4, 180); // Xác nhận
      sheet.setColumnWidth(5, 120); // Số người
      sheet.setColumnWidth(6, 350); // Lời nhắn
      sheet.setColumnWidth(7, 160); // Thời gian
    }

    // 2. CHUẨN BỊ DỮ LIỆU CẢI THIỆN (Tiếng Việt & Màu)
    let attendVi = '⏳ Chưa phản hồi';
    let bgColor = '#FFFFFF';
    let fgColor = '#000000';
    
    if (data.attend === 'yes') {
      attendVi = '✅ Có tham dự';
      bgColor = '#D9EAD3'; // Xanh lá pastel
      fgColor = '#274E13';
    } else if (data.attend === 'no') {
      attendVi = '❌ Rất tiếc, không đến được';
      bgColor = '#F8CECC'; // Đỏ nhạt pastel
      fgColor = '#990000';
    }

    // Điện thoại thêm dấu nháy đơn ' ở trước để Sheet không tự xóa số 0
    const phoneNum = data.phone ? "'" + data.phone : '';

    // Ghi dữ liệu vào dòng cuối cùng
    sheet.appendRow([
      data.id      || Date.now(),
      data.name    || '',
      phoneNum,
      attendVi,
      data.guests  || 0,
      data.message || '',
      new Date() // Lưu dưới dạng Date của Google Sheets
    ]);

    // 3. MAKEUP CHO DÒNG VỪA THÊM (Cell Formatting)
    const lastRow = sheet.getLastRow();
    
    // Toàn bộ dòng
    const rowRange = sheet.getRange(lastRow, 1, 1, 7);
    rowRange.setVerticalAlignment('middle');
    rowRange.setBorder(true, true, true, true, true, true, '#CCCCCC', SpreadsheetApp.BorderStyle.SOLID);
    
    // Căn giữa cột ID (cột 1)
    sheet.getRange(lastRow, 1).setHorizontalAlignment('center');
    
    // Căn giữa cột SDT (cột 3)
    sheet.getRange(lastRow, 3).setHorizontalAlignment('center');

    // Make up ô Tham Dự (cột 4)
    const attendRange = sheet.getRange(lastRow, 4);
    attendRange.setBackground(bgColor);
    attendRange.setFontColor(fgColor);
    attendRange.setHorizontalAlignment('center');
    attendRange.setFontWeight('bold');

    // Make up Số người đi cùng (cột 5)
    sheet.getRange(lastRow, 5).setHorizontalAlignment('center');

    // Chỉnh format ngày giờ (cột 7)
    const timeRange = sheet.getRange(lastRow, 7);
    timeRange.setNumberFormat('dd/MM/yyyy HH:mm:ss');
    timeRange.setHorizontalAlignment('center');

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Trả về danh sách cho trang admin ───────────────────────
function doGet(e) {
  try {
    const source = e.parameter.source;
    const sheetName = getSheetBySource(source);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
       return ContentService
        .createTextOutput(JSON.stringify({ ok: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    const data = rows
      .filter(function(row) { return row[0]; }) // bỏ hàng trống
      .map(function(row) {
        
        // Chuyển hóa lại dạng Tiếng Việt về 'yes' / 'no' để tương thích trang Admin của bạn
        let attStr = (row[3] || '').toString().toLowerCase();
        let attKey = '';
        if (attStr.includes('c') || attStr.includes('yes')) attKey = 'yes';
        if (attStr.includes('kh') || attStr.includes('no')) attKey = 'no';
        
        // Chuẩn hóa thời gian sang chuỗi ISO 
        let timeIso = '';
        if (row[6] instanceof Date) {
          timeIso = row[6].toISOString();
        } else if (row[6]) {
          timeIso = new Date(row[6]).toISOString();
        }

        return {
          id:      row[0],
          name:    row[1],
          phone:   (row[2] || '').toString().replace(/'/g, ''),
          attend:  attKey,
          guests:  row[4],
          message: row[5],
          time:    timeIso
        };
      });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, data: [], error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
