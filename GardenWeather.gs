function getWeatherWarnings() {
  var WOEID = '12597040'; //Offenbach, Germany
  var Weather = [];
  var Warnings = [];
  var date = new Date;
  
  var Weather = getYahooWeather(WOEID);
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var rangename = 'A2' + ':' + 'C' + sheet.getLastRow();
  var values = sheet.getRange(rangename).getValues();
  
  // Are there warning relevant forecasts?
  for (var i = 0; i < values.length; i++) {
    var name = values[i][0];
    var threshold_low  = values[i][1];
    var threshold_high = values[i][2];
    
    for (var j = 0; j < Weather.length; j++) {
      // Is the day relevant? We only look at today and tomorrow!
      var today = date.getDay();
      today = today - 1;
      var tomorrow = today + 1;
      if (tomorrow == 7) {
        tomorrow = 1;
      }
      if ( (Weather[j].day == getWeekdays()[today]) ||
            (Weather[j].day == getWeekdays()[tomorrow]) ) {
        // Is a temepature threshold reached or breached?
        if (isEmpty(getExceededThreshold(Weather[j].low, threshold_low, Weather[j].high, threshold_high)) === false) {
          var newWarning = new Object;
          newWarning.name = name;
          newWarning.threshold_low  = threshold_low;
          newWarning.threshold_high = threshold_high;
          newWarning.is_low  = Weather[j].low;
          newWarning.is_high = Weather[j].high;
          newWarning.day     = Weather[j].day;
          Warnings.push(newWarning);
        }
      }
    } 
  }
  
  // Are there weather warnings? Send an email
  if (Warnings.length > 0 ) {
    sendEmail(Warnings);
    sheet.getRange('E2').setValue('Es lagen Warnungen vor');
  } else {
    sheet.getRange('E2').setValue('Es lagen keine Warnungen vor');
  }
  
  // Write the date and time into the spreadsheet cells
  sheet.getRange('E1').setValue(date_time());
  sheet.autoResizeColumn(sheet.getRange('E1').getColumn());
  SpreadsheetApp.flush(); 
}

function getYahooWeather(woeid) {
  var url = 'http://weather.yahooapis.com/forecastrss?w=' + woeid + '&u=c'; 
  var Weather = [];
  
  try {
    var xml = UrlFetchApp.fetch(url).getContentText();
    xml = replaceAll('yweather:location','yweatherLocation',xml);
    xml = replaceAll('yweather:forecast','yweatherForecast',xml);
    var document = XmlService.parse(xml);
    var channel = document.getRootElement().getChild('channel');
    var item = channel.getChild('item');
  } catch(e) {
    return Weather;  
  }
  
  Logger.log(item);
  
  try {
    Weather.location = channel.getChild('yweatherLocation').getAttribute('city').getValue();
  } catch(e) {
  }
  
  var forecasts = item.getChildren('yweatherForecast');
  for (var i = 0; i < forecasts.length; i++) {
    var newForecast = new Object;
    newForecast.day = forecasts[i].getAttribute('day').getValue();
    newForecast.date = forecasts[i].getAttribute('date').getValue();
    newForecast.low = forecasts[i].getAttribute('low').getValue();
    newForecast.high = forecasts[i].getAttribute('high').getValue();
    Weather.push(newForecast);
  }
  
  return Weather;
}

function sendEmail(Warnings) {
  var days = [];
  var wochentage = new Array('Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So');
  var htmlBody = '<html><head></head><body>';
      htmlBody += 'Hallo,<br><br>es liegen Wetterwarnungen für den Garten vor.<br><br>';
      htmlBody += '<table class="warnings"><tr><th>Pflanze</th><th colspan="2">Grenzwerte</th><th colspan="2">Vorhersage</th><th>Tag</th></tr>';
      
  var mailBody = 'Hallo, \n';
      mailBody += ' \n';
      mailBody += 'es liegen Wetterwarnungen für den Garten vor. \n';
  
  // Collect all relevant days into an array
  for (var i = 0; i < Warnings.length; i++) {
    if (days.indexOf(Warnings[i].day) == -1) {
      days.push(Warnings[i].day); 
    }
  }
  
  // Sort the days array by weekday
  for (var i = 0; i < days.length; i++) {
    days[i] = getWeekdays().indexOf(days[i]);
  }
  days.sort();
  for (var i = 0; i < days.length; i++) {
    days[i] = getWeekdays()[days[i]];
  }
  
  // For each day, write all warnings
  for (var i = 0; i < days.length; i++) {
    mailBody += days[i] + ': \n';
    for (var j = 0; j < Warnings.length; j++) {
      if (days[i] == Warnings[j].day) {
        var wochentag = wochentage[getWeekdays().indexOf(days[i])];
        var Exceed = getExceededThreshold(Warnings[j].is_low, Warnings[j].threshold_low, Warnings[j].is_high, Warnings[j].threshold_high);
        mailBody += Warnings[j].name + '\t' + Warnings[j].threshold_low + ' bis ' + Warnings[j].threshold_high + '°C \t';
        mailBody += 'Gemeldete Temperatur: ' + Warnings[j].is_low + ' bis ' + Warnings[j].is_high + '°C \n';
        htmlBody += '<tr><td>' + Warnings[j].name + '</td>';

        //htmlBody += '<td align="right">' + Warnings[j].threshold_low + '</td><td align="right">' + Warnings[j].threshold_high + '</td>';
        //htmlBody += '<td align="right">' + Warnings[j].is_low + '</td><td align="right">' + Warnings[j].is_high + '</td>';
        htmlBody += '<td align="right">Erlaubt:</td><td align="right">' + Exceed.threshold + '</td>';
        htmlBody += '<td align="right">Prognose:</td><td align="right">' + Exceed.value + '</td>';
        
        htmlBody += '<td>' + wochentag + '</td></tr>';
      }
    }
    mailBody += '\n';
  }
  
  htmlBody += '</table></body></html>';
  
  
  MailApp.sendEmail('email@example.com',
                    "Garten Wetterwarnung",
                    mailBody,{
     name: 'Garten Wetterwarnung',
     htmlBody: htmlBody
 });
}

function getExceededThreshold(low, thresh_low, high, thresh_high) {
  var Exceed = new Object;
  if (low < thresh_low) {
    Exceed.value = low;
    Exceed.threshold = thresh_low;
  } else if(high > thresh_high) {
    Exceed.value = high;
    Exceed.threshold = thresh_high;
  }
  return Exceed;
}

function onOpen() {
  var entries = [{
    name : "Look for weather updates",
    functionName : "getWeatherWarnings"
  }];
  SpreadsheetApp.getActiveSpreadsheet().addMenu("Script", entries);
};

function getWeekdays() {
  return new Array('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
}

function date_time() {
  date = new Date;
  year = date.getFullYear();
  month = date.getMonth();
  months = new Array('January', 'February', 'March', 'April', 'May', 'June', 'Jully', 'August', 'September', 'October', 'November', 'December');
  d = date.getDate();
  day = date.getDay();
  days = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
  h = date.getHours();
  if(h<10) { h = "0"+h; }
  m = date.getMinutes();
  if(m<10) { m = "0"+m; }
  s = date.getSeconds();
  if(s<10) { s = "0"+s; }
  result = ''+days[day]+' '+months[month]+' '+d+' '+year+' '+h+':'+m+':'+s;
  return result;
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}