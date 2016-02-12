/**
 * @OnlyCurrentDoc
 */
var http_base = 'http://http-ras.wdr.de/';
var AppToken  = 'Oabcdefghi1234567890kkkiz';

function save_maus() {
  var html_string = '';
  var url = 'www.wdrmaus.de/aktuelle-sendung/index.php5';
  try {
    var response = UrlFetchApp.fetch(url);
    html_string = response.getContentText();
  } catch(e) {
  }
  
  var output = [];
  output = parse_try1(html_string);
  if (output.length < 1) {
    output = parse_try2(html_string);
  }
  
  //output.push('http://bitnugget.de/Ironpickaxe.png');
  
  for (var i = 0; i < output.length; i++) {
    // Save to Dropbox
    var headers = {
      'Authorization': 'Bearer ' + AppToken
    };
    var payload = {
      'url': output[i]
    }
    
    var date_string = get_date_time();
    var target_file = 'https://api.dropbox.com/1/save_url/auto/Maus/' + date_string + '.mp4';
    var options = {
      'method': 'post',
      'muteHttpExceptions': true,
      'headers': headers,
      'payload': payload
    };
    var response = UrlFetchApp.fetch(target_file, options);
    Logger.log(response);
  }
}

function onOpen() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var entries = [{
    name : "Save Maus",
    functionName : "save_maus"
  }];
  sheet.addMenu("Script", entries);
};

function get_date_time() {
  var d = new Date();
  return d.getUTCFullYear() + '-' + addZero(d.getUTCMonth()) + '-' + addZero(d.getUTCDate()) + 
         addZero(d.getUTCHours()) + addZero(d.getUTCMinutes()) + addZero(d.getUTCSeconds());
}

function parse_try2(html_string) {
  var step1 = stringBetween(html_string, '<!-- Start des Video Objektes -->', '<!-- Ende des Video Objektes -->');
  var step2 = stringBetween(step1, 'startVideo', '>');
  var step3 = stringBetween(step2, '/CMS2010/', '.mp4');
  var step4 = stringBetween(step3, '/CMS2010/', ',');
  
  var step5 = stringBetween(step3, step4, '.mp4').replace(step4,'');
  var step6 = stringBetween(step5, '', ',');
  var final = step4.replace(',','') + step6.replace(',','');
  var out = [];
  out.push(http_base + final + '.mp4');
  return out;
}

function parse_try1(html_string) {
  var step1 = stringBetween(html_string, '<!-- Start des Video Objektes -->', '<!-- Ende des Video Objektes -->');
  var fake_html = '<html>' + step1 + '</html>'
  
  try {
    var doc = XmlService.parse(fake_html);
    var htmlXML = doc.getRootElement();
    var links = getElementsByTagName(htmlXML, 'a' );
    var details = [];
    for (var i = 0; i < links.length; i++) {
      var link_text = XmlService.getRawFormat().format(links[i]);
      if (link_text.indexOf(".mp4") != -1) {
        // Link contains something about MP4
        details.push(link_text);
      }
    }
  } catch(e) {
  }
  
  var out = [];
  try {
    for (var i = 0; i < details.length; i++) {
      var link = stringBetween( details[i], 'rtmp://', '.mp4');
      // Now we have the RTMP link and we can take it apart to derive the http link
      // rtmp://gffstream.fcod.llnwd.net/a792/e2/CMS2010/mdb/ondemand/weltweit/fsk0/92/924550/924550_10151845.mp4
      var cms_link = stringBetween(link, 'CMS2010', '.mp4');
      var newlink = http_base + cms_link;
      out.push(newlink);
    }
  } catch(e) {
  }
  
  return out;
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
      s = s.substring(0, i + suffix.length);
    }
    else {
      return '';
    }
  }
  return s;
}

function addZero(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function getElementsByTagName(element, tagName) {  
  //https://sites.google.com/site/scriptsexamples/learn-by-example/parsing-html#TOC-getElementsByTagName
  var data = [];
  var descendants = element.getDescendants();  
  for(i in descendants) {
    var elt = descendants[i].asElement();     
    if( elt !=null && elt.getName()== tagName) data.push(elt);      
  }
  return data;
}