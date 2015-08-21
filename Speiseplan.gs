function getSpeiseplanData() {
  var planBlob = downloadSpeiseplan();
  //var planBlob = DriveApp.getFilesByName('loc40.pdf').next().getBlob();
  var planXML = pdfToXML(planBlob);
  //var planXML = HtmlService.createTemplateFromFile('example.html').getRawContent();
  DocumentApp.getActiveDocument().getBody().setText(planXML);
}

function sendSpeiseplan() {
  var d = new Date();
  var day = d.getDay();
  if (day > 0 && day < 6) {
    var planXML = DocumentApp.getActiveDocument().getBody().getText();
    var Speiseplan = parseSpeiseplanXML(planXML);
    sendToPushalot(Speiseplan[day]);
  }
}

function parseSpeiseplanXML(xml) {
  var Speiseplan = new Array();
  var rawText = XmlService.parse(xml).getRootElement().getValue();
  
  Speiseplan[1] = getTagesGerichte(stringBetween(rawText, 'Montag', 'Dienstag'));
  Speiseplan[2] = getTagesGerichte(stringBetween(rawText, 'Dienstag', 'Mittwoch'));
  Speiseplan[3] = getTagesGerichte(stringBetween(rawText, 'Mittwoch', 'Donnerstag'));
  Speiseplan[4] = getTagesGerichte(stringBetween(rawText, 'Donnerstag', 'Freitag'));
  Speiseplan[5] = getTagesGerichte(stringBetween(rawText, 'Freitag', '' ));
  return Speiseplan;
}

function getTagesGerichte(text) {
  var str = ''; // Um String zu deklarieren
  str = text;
  
  var split = str.split('Euro');
  for (var i=0; i < split.length; i++) {
    str = split[i];
    // Alle Zahlen, Punkte, Kommas löschen, Trimmen
    str = str.replace(', je ','').replace(/[0-9]/g,'').replace(/,/g,'').replace(/\./g,'').trim();
    // Wochentage löschen
    str = str.replace('Montag der ','').replace('Dienstag der ','').replace('Mittwoch der ','');
    str = str.replace('Donnerstag der ','').replace('Freitag der ','');
    // Ungewollte Zeichen löschen
    str = str.replace(/[^\u0000-~\u0080-þ]/gi, ""); //http://apps.timwhitlock.info/js/regex#  Basic Latin + Supplement
    // Ungewollte Satzteile löschen
    str = str.replace('Angebot solange der Vorrat reicht','').replace('GRILLED','');
    str = str.replace('FIT DURCH DEN SOMMER:','').replace('FPS Classic:','');
    str = str.replace('(Schwein)','').replace('(Rind)','');
    str = str.replace('Pizzatag','').replace('Schnitzeltag','').replace('Currywursttag','');
    str = str.replace('Loc ','').replace('Daimlerstraße ','').replace(' Frankfurt','').replace('= leicht','');
    str = str.replace('Campus','').replace('Oberhafen','').replace('Gebäude','');
    // Doppelte Leerzeichen & Zeilenumbrüche entfernen, trimmen
    str = str.replace('- ','').replace('=','').replace(/\s\s+/g,' ').trim();
    if (str.substr(str.length - 4) == ' I I') {
      str = str.substring(0, str.length - 4)
    }
    if (str.length > 10) {
      split[i] = str;
    } else {
      split[i] = '';
    }
  }
  
  return cleanArray(split);
}

function sendToPushalot(gerichte) {
  if (gerichte.length == 0) {
    return;
  }
  
  var text = '';
  for (var i = 0; i < gerichte.length; i++ ) {
    var c = i + 1;
    if (i > 0) {
      text = text + '\n';
    }
    text = text + 'Gericht ' + c + ': ' + gerichte[i]; 
  }
  
  var Pushalot = new Object;
  Pushalot.AuthorizationToken = '4711';
  Pushalot.Title = 'Mittagessen'; //Required
  Pushalot.Body  = text;          //Required
  Pushalot.IsImportant = true;
  Pushalot.IsSilent    = false;
  Pushalot.Image       = 'http://chip03.chipimages.de/crawler-mq/gplay/15/27/77/73/99/com.yayaapps.imhungry/ee880f16fd5a8461accacc77e6bf9300';
  Pushalot.Source      = 'Speiseplan';
  Pushalot.TimeToLive  = 120; // 120 min
  // Send Push Notification
  var payload = JSON.stringify(Pushalot); 
  var headers = {
    'Content-Type': 'application/json'
  };
  var url = 'https://pushalot.com/api/sendmessage';
  var options = {
    'muteHttpExceptions': true,
    'headers': headers,
    'payload': payload
  };
  UrlFetchApp.fetch(url, options); 
}

function downloadSpeiseplan() {
  var blob = UrlFetchApp.fetch('http://www.fps-catering.de/files/pdf_files/loc40.pdf').getBlob();
  blob.setName('loc40.pdf');
  return blob;  
}

function pdfToXML(pdfBlob) {
  // http://pdfx.cs.man.ac.uk/usage
  // curl --data-binary @"/path/to/my.pdf" -H "Content-Type: application/pdf" -L "http://pdfx.cs.man.ac.uk"
  // Found via https://github.com/okfn/ideas/issues/52  an alternative would be http://www.onlineocr.net/
  var url = 'http://pdfx.cs.man.ac.uk'
  var headers = {
    "Content-Type": "application/pdf"
  };
  
  var payload = pdfBlob.getBytes();
  var params = {
    "method":"POST",
    "contentType":"application/pdf",
    "headers":headers,
    "payload":payload
  };
  var response = UrlFetchApp.fetch(url, params);
  
  return response.getContentText();
}

function stringBetween(string, prefix, suffix) {
  s = '';
  s = string;
  var i = s.indexOf(prefix);
  if (i >= 0) {
    s = s.substring(i); //+ prefix.length
  }
  else {
    return '';
  }
  if (suffix) {
    i = s.indexOf(suffix);
    if (i >= 0) {
      s = s.substring(0, i);
    }
    else {
      return '';
    }
  }
  return s;
}

function cleanArray(actual){
  var newArray = new Array();
  for(var i = 0; i<actual.length; i++){
      if (actual[i]){
        newArray.push(actual[i]);
    }
  }
  return newArray;
}
