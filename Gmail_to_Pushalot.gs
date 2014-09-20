/**
 * Looks for new Mails, stores mail IDs in spreadsheet,
 * sends notifications via Pushalot
 */
function getMail() {
  // Create our top objects to contain a list of all known Mails
  try {
    var InboxMails = getUnreadMailsForThreads(GmailApp.getInboxThreads());
  } catch(e) {
    return;
  } 
  
  // Read the Spreadsheet to get a list of all known mails
  var ss = SpreadsheetApp.getActiveSheet();
  var KnownMails = getMailIdsFromSpreadsheet(ss);
    
  // Determine which mails are new
  for (var i in InboxMails) {
    if (! (InboxMails[i].msgID in KnownMails)) {
      // Add Email to the list of known Mails
      KnownMails[InboxMails[i].msgID] = InboxMails[i];
      
      // Try to get the Sender Name via Contact
      var contact = ContactsApp.getContact(InboxMails[i].SenderMail);
      if (contact != null ) {
        var name = contact.getFullName();
      } else {
        var name = InboxMails[i].SenderName;
      }
      
      // Try to get Pushalot Settings from a Contact
      var parameters = new Object;
      if (contact != null ) {
        var fields = contact.getCustomFields();
        for (var j in fields) {
          if (fields[j].getLabel() == 'Pushalot') {
            parameters = JSON.parse(fields[j].getValue()); 
          }
        }
      }
      
      // Set Push Notification Default Parameters
      var Pushalot = new Object;
      Pushalot.AuthorizationToken = '26exampletoken';
      Pushalot.Title = InboxMails[i].Subject; //Required
      Pushalot.Body  = 'Email from ' + name;  //Required
      Pushalot.IsImportant = false;
      Pushalot.IsSilent    = false;
      Pushalot.Image       = 'http://bitnugget.de/pushalot/gmail.png';
      Pushalot.Source      = name;
      Pushalot.TimeToLive  = 1440; // One day
      Pushalot.Link        = 'mailto:' + KnownMails[InboxMails[i].msgID].SenderMail;
      Pushalot.LinkTitle   = 'Send Email';
      
      if (! ( parameters.Off != null ) ) {
        // Overwrite Parameters if applicable
        if ( parameters.IsImportant != null ) {
          Pushalot.IsImportant = parameters.IsImportant; 
        }
        if ( parameters.IsSilent != null ) {
          Pushalot.IsSilent    = parameters.IsSilent; 
        }
        if ( parameters.Image != null ) {
          Pushalot.Image       = parameters.Image; 
        }
        if ( parameters.Source != null ) {
          Pushalot.Source      = parameters.Source; 
        }
        if ( parameters.TimeToLive != null ) {
          Pushalot.TimeToLive  = parameters.TimeToLive; 
        }
        
        // Special Treatment for FritzBox based messages
        if (name == 'FRITZ!Box') {
          var plain = GmailApp.getMessageById(InboxMails[i].msgID).getPlainBody();
          var partial = plain.replace( /^\D+/g, '');
          var telno = partial.substring(0, partial.indexOf(' '));
          if (telno != null) {
            Pushalot.Link = 'tel:' + telno;
            Pushalot.LinkTitle = telno;
            Pushalot.Body = InboxMails[i].Subject;
          }
        }
        
        //Special Treatment for FullBodyForward
        if ( parameters.FullBodyForward != null ) {
          Pushalot.Body = GmailApp.getMessageById(InboxMails[i].msgID).getPlainBody(); 
        }
        
        // Final Cleanup
        Pushalot.Source = Pushalot.Source.substring(0, 24)
        
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
        var response = UrlFetchApp.fetch(url, options);
        Logger.log(response);
        var result = '';
        switch(response.getResponseCode()) {
          case 200:
            result = 'OK'; break;
          case 400:
            result = 'Bad Request'; break;
          case 405:
            result = 'Method not allowed (POST required)'; break;
          case 406:
            result = 'Message Throttle Limit hit'; break;
          case 410:
            result = 'Auth Token not valid'; break;
          case 500:
            result = 'Problem at Pushalots Side'; break;
          case 503:
            result = 'Pushalot Server not available'; break;
        }       
        
        // Store result
        KnownMails[InboxMails[i].msgID].PushResult = response.getResponseCode() + ' ' + result;
      } else {
        KnownMails[InboxMails[i].msgID].PushResult = 'Push is off for this contact';
      }
    }
  }
  
  // Clear the Spreadsheet, then commit new list of known Mails
  var rangeTxt = 'A1' + ':C' + Object.keys(KnownMails).length;
  var count = 0;
  var values = [];
  for (var i in KnownMails) {
    values[count] = [];
  //  values[count][0] = KnownMails[i].msgID;     //Fill Column A
    values[count][0] = Utilities.base64Encode(Utilities.newBlob(KnownMails[i].msgID).getBytes());
    values[count][1] = KnownMails[i].Subject;   //Fill Column B
    values[count][2] = KnownMails[i].PushResult //Fill Column C
    count++; // = count + 1;
  }
  ss.clear();
  ss.getRange(rangeTxt).setValues(values);
  
  // Commit date and time of last update into extra cell
  ss.getRange("D1").setValue(date_time());
  // And beautify the Spreadsheet
  for (var i = 1; i <= ss.getLastColumn(); i++) {
    ss.autoResizeColumn(i);
  }
  // And finally flush
  SpreadsheetApp.flush();
};

/**
 * Adds a custom menu to the active spreadsheet
 */
function onOpen() {
  var entries = [{
    name : "Look for new Mails",
    functionName : "getMail"
  }];
  SpreadsheetApp.getActiveSpreadsheet().addMenu("Script", entries);
};

function getUnreadMailsForThreads(threads) {
  var mails = new Object;
  for (var i = 0; i < threads.length; i++) {    
    // For each thread: get each message and its attributes
    // into an object, then append this object to the list of mails
    var threadMessages = threads[i].getMessages();
    for (var j = 0; j < threadMessages.length; j++) {
      if (threadMessages[j].isUnread() == true ) {
        var message = new Object;
        message.msgID = threadMessages[j].getId();
        message.Subject = threadMessages[j].getSubject();
        message.Sender = threadMessages[j].getFrom();
        var sendersub = message.Sender.substring(message.Sender.lastIndexOf('<'));
        message.SenderMail = sendersub.match('<' + "(.*?)" + '>');
        if ( message.SenderMail != null ) {
          message.SenderMail = message.SenderMail[1];
        } else {
          message.SenderMail = message.Sender;
        }
        message.SenderName = message.Sender.match('"' + "(.*?)" + '"');
        if ( message.SenderName != null ) {
          message.SenderName = message.SenderName[1];
        } else {
          message.SenderName = message.SenderMail;
        }
        mails[message.msgID] = message;
      }
    }
  }
  return mails;
}

function getMailIdsFromSpreadsheet(sheet) {
  var knownMails = new Object;
  if (sheet.getLastRow() != 0) {
    var rangeTxt = 'A1' + ':C' + sheet.getLastRow();
    var values = sheet.getRange(rangeTxt).getValues();
    for (var i = 0; i < values.length; i++) {
      var message = new Object;
      message.msgID = values[i][0];
      message.msgID = Utilities.newBlob(Utilities.base64Decode(message.msgID, Utilities.Charset.UTF_8)).getDataAsString();
      message.Subject = values[i][1];
      message.PushResult = values[i][2];
      knownMails[message.msgID] = message;
    }
  }
  return knownMails;
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
