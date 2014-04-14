// Create a spreadsheet and note its existence in a UserProperty.
function doGet() {
  var app = UiApp.createApplication();

  var button = app.createButton('Create Spreadsheet');
  app.add(button);

  var label = app.createLabel('Spreadsheet was created.')
                 .setId('statusLabel')
                 .setVisible(false);
  app.add(label);

  var handler = app.createServerHandler('myClickHandler');
  handler.addCallbackElement(label);
  button.addClickHandler(handler);

  return app;
}

function myClickHandler(e) {
  var app = UiApp.getActiveApplication();

  var label = app.getElementById('statusLabel');
  label.setVisible(true);

  app.close();
  var BookSheet = UserProperties.getProperty('BookSheet');
  if (! BookSheet) {
    var BookSheet = newBookSheet();
  }
  try {
    var ss = SpreadsheetApp.openById(BookSheet);
  } catch(err) {
    var BookSheet = newBookSheet();
    var ss = SpreadsheetApp.openById(BookSheet);      
  }
  
  var sheet = ss.getSheets()[0];
  var values = [
    [ "Column1", "Col2", "Col3" ]
  ];

  var range = sheet.getRange("A1:C1");
  range.setValues(values);
  SpreadsheetApp.flush();
  
  return app;
}

function newBookSheet() {
  var ssNew = SpreadsheetApp.create("TestNeu1");
  var id = ssNew.getId();
  SpreadsheetApp.flush();
  UserProperties.setProperty('BookSheet', id);
  return id;
}
