/**
 * Backs up my GitHub repositories to Google Drive
 */
function gitBackup() {
  // Set GitHub Username
  var username = 'frostrubin';
  var values = [];
  var count = 0;
  
  // Get list of my repositories
  var Repos = getRepos(username);
  for (var i in Repos) {
    // For each repository, get branches
    var Branches = getRepoBranches(username, Repos[i].name);
    
    // For each branch, start a download and store the file
    for (var j in Branches) {
      var folder = getBackupFolder('GitHub Backups');
      var blob = getBranchZipFile(username, Repos[i].name, Branches[j].name);
      
      // Find the corresponding old file and delete it
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if ( file.getName() == blob.getName() ) {
          file.setTrashed(true);  
        }
      }
      
      // Create the new file
      folder.createFile(blob);
      
      values[count] = [];
      values[count][0] = blob.getName();
      
      count++;
    }
  }
  
  var ss = SpreadsheetApp.getActiveSheet();
  ss.clear();
  var rangeTxt = 'A1' + ':A' + count;
  ss.getRange(rangeTxt).setValues(values);
  // Set date and time
  ss.getRange("B1").setValue(date_time());
  // And beautify the Spreadsheet
  for (var i = 1; i <= ss.getLastColumn(); i++) {
    ss.autoResizeColumn(i);
  }
  
  // And send an email
  MailApp.sendEmail(Session.getActiveUser().getEmail(),
                    "GitHub Backup: done",
                    "Your GitHub Backup is finished.");
  
  // And finally flush
  SpreadsheetApp.flush();
};

/**
 * Adds a custom menu to the active spreadsheet
 */
function onOpen() {
  var entries = [{
    name : "Make GitHub Backups",
    functionName : "gitBackup"
  }];
  SpreadsheetApp.getActiveSpreadsheet().addMenu("Script", entries);
};

function getRepos(username) {
  var url = 'https://api.github.com/users/' + username + '/repos';
  var response = UrlFetchApp.fetch(url);
  var repos = JSON.parse(response.getContentText());
  return repos;
}

function getRepoBranches(username, reponame) {
  var url = 'https://api.github.com/repos/' + username + '/' + reponame + '/branches';
  var response = UrlFetchApp.fetch(url);
  var branches = JSON.parse(response.getContentText());
  return branches; 
}

function getBackupFolder(foldername) {
  try {
    var folder = DriveApp.getFoldersByName(foldername).next();
  } catch(err) {
    var folder = DriveApp.createFolder(foldername);
  }
  return folder;
}

function getBranchZipFile(username, reponame, branchname) {
  var url = 'http://github.com/' + username + '/' + reponame + '/zipball/' + branchname;
  var blob = UrlFetchApp.fetch(url).getBlob();
  var blobname = username + '-' + reponame + '-' + branchname + '.zip';
  blob.setName(blobname);
  return blob;
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
