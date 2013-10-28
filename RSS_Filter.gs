/**
 * Clears the current sheet completly,
 * Reads an RSS Feed
 * Applies filters and outputs the matching links
 * in Cells A1 to AX and the time of the retrieval
 * in Cell B1
 */
function getXml() {
  var sheet = SpreadsheetApp.getActiveSheet();
  
  var url = 'http://rss.golem.de/rss.php?feed=RSS2.0';
  try {
    var xml = UrlFetchApp.fetch(url).getContentText();
  } catch(e) {
    return;  
  }
  var document = XmlService.parse(xml);
  var root = document.getRootElement();

  sheet.clear();
  var channel = document.getRootElement().getChildren('channel');
  var item = channel[0].getChildren('item');
  var j = 0;
  for (var i = 0; i < item.length; i++) {
    var flag = '';
    var title = item[i].getChild('title').getText();
    var link  = item[i].getChild('link').getText(); 
    if (title.indexOf("NSA") != -1) {
      if( (title.indexOf("Wikipedia") != -1) ||
          (title.indexOf("Neu") != -1 && title.indexOf("Verdacht") != -1 ) ||
          (title.indexOf("Index") != -1)
        ) {
        flag = 'X';
      }
    } else if (title.indexOf("World of Warcraft") != -1) {
      if( (title.indexOf("Blizzard") != -1) ||
        (title.indexOf("Expansion") != -1 && title.indexOf("Neu") != -1 ) ||
        (title.indexOf("Update") != -1 && title.indexOf("Neu") != -1 )
        ) {
        flag = 'X';
      }
    }
    if (flag == 'X') {
      j++;
      var content = '=hyperlink("' + link + '"' + ';' + '"' + title + '"' + ')';
      var values = [
        [ content ]
      ];
      var rangeTxt = 'A' + j; // + ':' + 'B' + j;
      var range = sheet.getRange(rangeTxt);
      range.setValues(values);
    }
  }
  var fullRangeTxt = 'A1' + ':' + rangeTxt;
  var sortRange = sheet.getRange(fullRangeTxt);
  sortRange.sort(1);
  
  var id = SpreadsheetApp.getActiveSpreadsheet().getId();
  var values = [
    [ date_time() ]
  ];
//  var values = [
//    [ id ]
//  ];
  sheet.getRange("B1").setValues(values);
  SpreadsheetApp.flush();
};

/**
 * Adds a custom menu to the active spreadsheet
 */
function onOpen() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var entries = [{
    name : "Get new Data",
    functionName : "getXml"
  }];
  sheet.addMenu("Script", entries);
};

/**
  * Helper Function to get the current date
  */
function date_time() {
  date = new Date;
  year = date.getFullYear();
  month = date.getMonth();
  months = new Array('January', 'February', 'March', 'April', 'May', 'June', 'Jully', 'August', 'September', 'October', 'November', 'December');
  d = date.getDate();
  day = date.getDay();
  days = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
  h = date.getHours();
  if(h<10) {
    h = "0"+h;
  }
  m = date.getMinutes();
  if(m<10) {
    m = "0"+m;
  }
  s = date.getSeconds();
  if(s<10) {
    s = "0"+s;
  }
  result = ''+days[day]+' '+months[month]+' '+d+' '+year+' '+h+':'+m+':'+s;
  return result;
}
