/**
 * Google Apps Script for Sengunthar Engineering College – Quiz Registration & Admin API
 * 
 * Supports:
 * - doGet: Fetch all registrations for Admin Panel
 * - doPost: Create new registration, Edit/Update row, Delete row
 */

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var rows = [];

    // Skip header row (index 0)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== "" || data[i][1] !== "" || data[i][2] !== "" || data[i][3] !== "") {
        rows.push({
          rowId: i + 1, // Actual 1-based row index in Google Sheet
          name: String(data[i][0] || ""),
          college_name: String(data[i][1] || ""),
          phone_no: String(data[i][2] || "").replace(/^'/, ""),
          gmail: String(data[i][3] || "")
        });
      }
    }

    var output = JSON.stringify({ status: "success", data: rows, total: rows.length });

    // Support JSONP callback for 100% CORS-free data reading
    if (e && e.parameter && e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + "(" + output + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errOutput = JSON.stringify({ status: "error", message: error.toString() });
    if (e && e.parameter && e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + "(" + errOutput + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(errOutput)
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var req = {};

    if (e && e.postData && e.postData.contents) {
      try {
        req = JSON.parse(e.postData.contents);
      } catch (err) {
        req = e.parameter || {};
      }
    } else if (e && e.parameter) {
      req = e.parameter;
    }

    var action = req.action || "create";

    // 1. UPDATE / EDIT ROW
    if (action === "update") {
      var rowId = parseInt(req.rowId, 10);
      if (isNaN(rowId) || rowId < 2) {
        throw new Error("Invalid rowId for update");
      }

      var name = req.name || "";
      var collegeName = req.college_name || "";
      var phoneNo = "'" + (req.phone_no || "");
      var gmail = req.gmail || "";

      sheet.getRange(rowId, 1, 1, 4).setValues([[name, collegeName, phoneNo, gmail]]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", message: "Participant details updated successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. DELETE ROW
    if (action === "delete") {
      var deleteRowId = parseInt(req.rowId, 10);
      if (isNaN(deleteRowId) || deleteRowId < 2) {
        throw new Error("Invalid rowId for deletion");
      }

      sheet.deleteRow(deleteRowId);

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", message: "Participant deleted successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. CREATE / REGISTER (Default)
    var newName = req.name || "";
    var newCollege = req.college_name || "";
    var newPhone = "'" + (req.phone_no || "");
    var newGmail = req.gmail || "";

    // Append exactly the 4 columns: Name | College Name | Phone No | Gmail
    sheet.appendRow([newName, newCollege, newPhone, newGmail]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Registration recorded successfully" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
