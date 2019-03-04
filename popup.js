function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function appendToSheet(sheetId, row) {
  var rangeEnd = String.fromCharCode('A'.charCodeAt(0) + row.length);
  var appendParams = {
    'spreadsheetId': sheetId,
    'range': 'A:' + rangeEnd,
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

function addRowInputs(contentDiv) {
  for (var i = 0; i < 26; i++) {
    var input = document.createElement('textarea');
    input.id = 'col' + i;
    input.style.display = 'none';
    contentDiv.appendChild(input);
  }
}

function showRowInputs(num_columns) {
  for (var i = 0; i < 26; i++) {
    var input = document.getElementById('col' + i);
    if (i < num_columns) {
      input.style.display = '';
    } else {
      input.style.display = 'none';
    }
  }
}

function createSubmitButton(numColumnsSelector, sheetSelector) {
  var submitButton = document.createElement('button');
  submitButton.innerText = 'Append Row';
  submitButton.onclick = function() {
    var row = [];
    for (var i = 0; i < numColumnsSelector.value; i++) {
      row.push(document.getElementById('col' + i).value);
    }

    setStatus('Appending row, please wait');
    appendToSheet(sheetSelector.value, row)
      .then(function() {
        setStatus('Successfully appended row');
        // Clear inputs
        for (var i = 0; i < 26; i++) {
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

function createNumColumnsSelector(contentDiv) {
  var selector = document.createElement('select');
  for (var i = 1; i <= 26; i++) {
    selector.appendChild(new Option(i, i));
  }
  selector.value = 2;
  selector.onchange = function () {
    showRowInputs(selector.value);
  };
  return selector;
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

      // Add num columns selector
      var numColumnsSelector = createNumColumnsSelector();
      var numColumnsText = document.createElement('p')
      numColumnsText.innerText = 'Number of columns in row: ';
      contentDiv.appendChild(numColumnsText);
      contentDiv.appendChild(numColumnsSelector);
      contentDiv.appendChild(document.createElement('br'));

      // Add row inputs
      addRowInputs(contentDiv);
      showRowInputs(numColumnsSelector.value);
      contentDiv.appendChild(document.createElement('br'));

      // Add submit button
      var submitButton = createSubmitButton(numColumnsSelector, sheetSelector);
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
  if (token === undefined) {
    setStatus('Error authenticating with Google Drive');
    console.log('Error authenticating with Google Drive');
  } else {
    gapi.load('client', function() {
      gapi.client.setToken({access_token: token});
      gapi.client.load('drive', 'v3', function() {
        gapi.client.load('sheets', 'v4', function() {
          main();
        });
      });
    });
  }
});
