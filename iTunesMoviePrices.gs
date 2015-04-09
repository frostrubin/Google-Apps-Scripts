/**
 * Create a spreadsheet with A1 = "Movie Name"
 * B1 to I1 = "Price N"
 * Then populate it with data in Column A
 * Then run the script
 * it will get all movies from column A and add
 * up to 8 prices via iTunes API to each movie.
 * Quite quick and quite dirty.
 */

function getPrices() {
  https://itunes.apple.com/search?term=300&country=DE&media=movie&entity=movie&limit=25 
  var baseURL = 'https://itunes.apple.com/search?term=';
  var urlAppend = '&country=DE&media=movie&entity=movie&limit=8';
  var alphabet = ['B','C','D','E','F','G','H','I','J','K'];
  
  // Get the List of all movie names
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var rangename = 'A2' + ':' + 'I' + sheet.getLastRow();
  var values = sheet.getRange(rangename).getValues();
  
  // For each movie, query iTunes
  for (var i = 0; i < values.length; i++) {
    if ( values[i][1].toString() != '' ) {
      continue;
    }
    var movieName = values[i][0].toString().replace('.m4v','');
    var url = baseURL + encodeURIComponent(movieName) + urlAppend;
    var response = UrlFetchApp.fetch(url);
    Logger.log(response);
    
    var repObj = JSON.parse(response);
    
    if ( repObj.resultCount != 0 ) {
      for (var j = 0; j < repObj.results.length; j++) {
        var price  = repObj.results[j].trackPrice;
        if ( price == 0 ) {
          price = repObj.results[j].collectionPrice;
        }
        // Write the price into the spreadsheet
        if ( j <= alphabet.length ) {
          var column = alphabet[j];
          var y = i + 2;
          rangename = column + y + ':' + column + y;
          sheet.getRange(rangename).setValue(price);
        }
      }
    }
  }
  
  SpreadsheetApp.flush();
};

// Adds a custom menu to the active spreadsheet
function onOpen() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var entries = [{
    name : "Get Prices",
    functionName : "getPrices"
  }];
  sheet.addMenu("Script", entries);
};