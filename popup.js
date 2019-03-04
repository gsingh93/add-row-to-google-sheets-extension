function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function appendToSheet(sheetId, row) {
  var appendParams = {
    'spreadsheetId': sheetId,
    'range': 'A:B',
    'valueInputOption': 'RAW',
  };
  var valueRangeBody = {
    'majorDimension': 'ROWS',
    'values': [
      row
    ]
  };
  return gapi.client.sheets.spreadsheets.values.append(appendParams, valueRangeBody);
}

function createSheetSelector(files) {
  var sheetSelector = document.createElement('select');
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    sheetSelector.appendChild(new Option(file.name, file.id))
  }
  return sheetSelector;
}

function addRowInputs(num_columns, contentDiv) {
  for (var i = 0; i < num_columns; i++) {
    var input = document.createElement('input');
    input.id = 'col' + i;
    contentDiv.appendChild(input);
  }
}

function createSubmitButton(num_columns, sheetSelector) {
  var submitButton = document.createElement('button');
  submitButton.innerText = 'Append Row';
  submitButton.onclick = function() {
    var row = [];
    for (var i = 0; i < num_columns; i++) {
      row.push(document.getElementById('col' + i).value);
    }

    setStatus('Appending row, please wait');
    appendToSheet(sheetSelector.value, row)
      .then(function() {
        setStatus('Successfully appended row');
        // Clear inputs
        for (var i = 0; i < num_columns; i++) {
          var input = document.getElementById('col' + i);
          input.value = '';
        }
      }, function(response) {
        setStatus('Error appnding row');
        console.log(response);
      });
  };
  return submitButton;
}

function main() {
  setStatus('Getting list of Sheets from Google Drive');
  gapi.client.drive.files.list({
    'q': "mimeType='application/vnd.google-apps.spreadsheet'",
    'orderBy': 'modifiedByMeTime desc,name',
    'pageSize': 10,
    'fields': "nextPageToken, files(id, name)"
  }).then(function(response) {
    var files = response.result.files;
    if (files && files.length > 0) {
      setStatus('');
      var contentDiv = document.getElementById('content');

      // Add instructions
      var instructions = document.createElement('p')
      instructions.innerText = 'Select a sheet, enter the values, and click "Append Row"';
      contentDiv.appendChild(instructions);

      // Add sheet selector
      var sheetSelector = createSheetSelector(files);
      contentDiv.appendChild(sheetSelector);
      contentDiv.appendChild(document.createElement('br'));

      // Add row inputs
      // TODO: Support arbitrary number of columns
      var num_columns = 2;
      addRowInputs(num_columns, contentDiv);
      contentDiv.appendChild(document.createElement('br'));

      // Add submit button
      var submitButton = createSubmitButton(num_columns, sheetSelector);
      contentDiv.appendChild(submitButton);
    } else {
      setStatus('No Sheets found');
    }
  }, function(response) {
    setStatus('Error fetching sheets from Google Drive');
    console.log(response);
  });
}

setStatus('Authenticating with Google Drive');
chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
  gapi.load('client', function() {
    gapi.client.setToken({access_token: token});
    gapi.client.load('drive', 'v3', function() {
      gapi.client.load('sheets', 'v4', function() {
        main();
      });
    });
  });
});
