// Send a list of URLs to Pocket. Note the "sent" status in Column B
// Since regular Gmail allows for only 100 mails a day, a longer list
// can take several days
function urlToPocket() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rangename = 'A2' + ':' + 'B' + sheet.getLastRow();
  var values = sheet.getRange(rangename).getValues();
  var counter = 0;
  
  for (var i = 0; i < values.length; i++) {
    var url = values[i][0];
    var sent = values[i][1];
    
    if (sent != '' || url == '') {
      continue; 
    }
    
    counter = counter + 1;
    if (counter > 2) {
      SpreadsheetApp.flush();
      return;
    }
    
    MailApp.sendEmail('add@getpocket.com',
                    "Add this link", 
                     url);
    var row = i + 2; // 1 for the header line, 1 for the array beginning at zero
    sheet.getRange(row, 2).setValue('X');
  }
  
  SpreadsheetApp.flush();
}
