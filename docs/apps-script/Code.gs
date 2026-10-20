/**
 * Receives play results from the booth game and appends them to the active sheet.
 *
 * Setup: see README.md in this folder.
 * Request: POST text/plain body = JSON { secret, plays: [{ id, timestamp, deviceId,
 *          score, meterPct, pops, misses, durationSec, gameVersion }] }
 * Response: JSON { ok: true, accepted: [ids] }  (duplicates are accepted but not re-added)
 */
var HEADERS = [
  'id',
  'timestamp',
  'deviceId',
  'score',
  'meterPct',
  'pops',
  'misses',
  'durationSec',
  'gameVersion',
];

/**
 * Makes sure the header row has every column the game sends, and returns the header names in the
 * sheet's own order. An empty sheet gets the full header; a sheet from an older version keeps its
 * old columns (and data) and gets the missing ones added at the end, so nothing needs to be
 * changed by hand.
 */
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return HEADERS.slice();
  }
  var width = sheet.getLastColumn();
  var current = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  HEADERS.forEach(function (h) {
    if (current.indexOf(h) === -1) {
      current.push(h);
      sheet.getRange(1, current.length).setValue(h);
    }
  });
  return current;
}

function doPost(e) {
  var out = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
      ContentService.MimeType.JSON,
    );
  };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (secret && body.secret !== secret) return out({ ok: false, error: 'unauthorized' });
    if (!Array.isArray(body.plays) || body.plays.length > 200) {
      return out({ ok: false, error: 'bad request' });
    }

    var sheet = SpreadsheetApp.getActiveSheet();
    var columns = ensureHeaders(sheet);
    var idColumn = columns.indexOf('id') + 1;

    var lastRow = sheet.getLastRow();
    var existing = {};
    if (lastRow > 1) {
      sheet
        .getRange(2, idColumn, lastRow - 1, 1)
        .getValues()
        .forEach(function (r) {
          existing[String(r[0])] = true;
        });
    }

    var accepted = [];
    var rows = [];
    body.plays.forEach(function (p) {
      var id = String(p.id || '');
      if (!id) return;
      accepted.push(id);
      if (existing[id]) return;
      existing[id] = true;
      rows.push(
        columns.map(function (h) {
          // Columns left over from an older version (e.g. initials) are not sent: leave them empty.
          if (HEADERS.indexOf(h) === -1) return '';
          var v = p[h];
          return typeof v === 'string' ? v.slice(0, 100) : v;
        }),
      );
    });
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, columns.length).setValues(rows);
    }
    return out({ ok: true, accepted: accepted });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
