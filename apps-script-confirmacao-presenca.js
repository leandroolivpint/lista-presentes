const SPREADSHEET_ID = "1uT-vwbjaJS2iP_H3J_gBFvkObGwucRMOx1B7qZaRXT4";
const SHEET_NAME = "ConfirmacaoPresenca";

function getOrCreatePresenceSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["Data", "Nome dos convidados", "Confirmação"]);
    sheet.getRange("A1:C1").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  const headers = sheet.getRange(1, 1, 1, 3).getValues()[0];
  const expectedHeaders = ["Data", "Nome dos convidados", "Confirmação"];

  if (headers.join("|") !== expectedHeaders.join("|")) {
    sheet.getRange(1, 1, 1, 3).setValues([expectedHeaders]);
  }

  return sheet;
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, message: "API pronta para receber confirmações." })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    const nome = String(payload.nome || "").trim();
    const confirmacao = String(payload.confirmacao || "").trim();
    const data = payload.data || new Date().toISOString();

    if (!nome || !confirmacao) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, message: "Nome e confirmação são obrigatórios." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getOrCreatePresenceSheet();
    sheet.appendRow([data, nome, confirmacao]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "Confirmação salva com sucesso." }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.message || "Erro ao salvar confirmação." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
