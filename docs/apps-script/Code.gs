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
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    var lastRow = sheet.getLastRow();
    var existing = {};
    if (lastRow > 1) {
      sheet
        .getRange(2, 1, lastRow - 1, 1)
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
        HEADERS.map(function (h) {
          var v = p[h];
          return typeof v === 'string' ? v.slice(0, 100) : v;
        }),
      );
    });
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }
    return out({ ok: true, accepted: accepted });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
