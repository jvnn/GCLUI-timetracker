'use strict';

const fs = require('fs');
const reporting = require('./reporting.js');

const FILENAME = "aliases.json";
let aliases;

function loadAliases() {
  if (aliases) return;
  try {
    let file = fs.readFileSync(FILENAME);
    aliases = JSON.parse(file);
  } catch(err) {
    // (hopefully) the file doesn't yet exist
    aliases = {};
  }
}

function saveAliases() {
  fs.writeFileSync(FILENAME, JSON.stringify(aliases));
}

function saveAlias(cmdObject) {
  if (cmdObject.cmd.length == 0) {
    delete aliases[cmdObject.alias];
  } else {
    aliases[cmdObject.alias] = cmdObject.cmd;
  }
  saveAliases();
}

function parseDefine(cmd, cmdObject, fullRequired) {
  if (cmd[0] != 'D') return null;
  if (cmd.length == 1) return fullRequired ? null : cmd;
  if (cmd[1] != ' ') return null;
  if (cmd.length == 2) return fullRequired ? null : cmd;

  let aliasEnd = cmd.indexOf(' ', 2);
  if (aliasEnd < 0) return fullRequired ? null : cmd;

  cmdObject.alias = cmd.substr(2, aliasEnd - 2).trim();
  // aliases must be longer than 1 char to avoid mixing with commands
  if (cmdObject.alias.length < 2) return null;

  cmdObject.cmd = cmd.substr(aliasEnd).trim();
  return cmd;
}

function parseReportUrl(cmd, cmdObject, fullRequired) {
  if (cmd[0] != 'R') return null;
  if (cmd.length == 1) return fullRequired ? null : cmd;
  if (cmd[1] != ' ') return null;
  if (cmd.length == 2) return fullRequired ? null : cmd;

  if (cmd.trim().indexOf(' ', 2) > 0) return null;

  cmdObject.url = cmd.substr(2).trim();
  if (!cmdObject.url.startsWith("http")) return null;
  if (cmdObject.url.indexOf('#') < 0 || cmdObject.url.indexOf('@') < 0) return null;

  return cmd;
}

function parseTimeCmd(cmd, cmdObject, fullRequired) {
  switch (cmd[0]) {
    case 'S': cmdObject.type = 'start'; break;
    case 'A': cmdObject.type = 'away'; break;
    case 'B': cmdObject.type = 'back'; break;
    case 'O': cmdObject.type = 'out'; break;
    default: return null;
  }

  if (cmd.length == 1) return fullRequired ? null : cmd;
  if (cmd[1] != ' ') return null;
  if (cmd.length == 2) return fullRequired ? null : cmd;

  let issueIdx = cmd.indexOf('#', 2);
  let timeIdx = cmd.indexOf('@', 2);

  if (timeIdx < 0) return fullRequired ? null : cmd;
  if (issueIdx > timeIdx) return null;

  if (issueIdx > 2 || timeIdx > 2) {
    cmdObject.desc = cmd.substr(2, issueIdx < 0 ? timeIdx - 2 : issueIdx - 2).trim();
  }
  if (issueIdx > 0) {
    cmdObject.issue = cmd.substr(issueIdx + 1, timeIdx - issueIdx - 1).trim();
  }
  let timeString = cmd.substr(timeIdx + 1).trim();

  let timeRegex = /^(\d|[0-2]\d):([0-5]\d)$/;
  let dateRegex = /^(\d\d\d\d)-([0-1]\d)-([0-3]\d) (\d|[0-2]\d):([0-5]\d)$/;
  let date = new Date();
  // we work with minute accuracy
  date.setSeconds(0);
  date.setMilliseconds(0);

  if (timeRegex.test(timeString)) {
    // time from today
    let groups = timeString.match(timeRegex);
    let hours = parseInt(groups[1]);
    let minutes = parseInt(groups[2]);
    if (hours > 23) return null;
    date.setHours(hours);
    date.setMinutes(minutes);

  } else {
    let groups = timeString.match(dateRegex);
    if (!groups) return null;

    let year = parseInt(groups[1]);
    let month = parseInt(groups[2]);
    let day = parseInt(groups[3]);
    let hours = parseInt(groups[4]);
    let minutes = parseInt(groups[5]);
    if (month == 0 || month > 12 || day == 0 || day > 31 || hours > 23) return null;

    date = new Date(year, month, day, hours, minutes);
  }

  cmdObject.time = date.toISOString();
  return cmd;
}

exports.parseCmd = function(cmd, cmdObject, fullRequired) {
  loadAliases();

  if (!cmdObject) cmdObject = {};
  if (!cmd || cmd.length == 0) return cmd;

  if (cmd.trim().indexOf(' ') < 0 && aliases.hasOwnProperty(cmd)) {
    if (!fullRequired) {
      return aliases[cmd];
    }
    cmd = aliases[cmd];
  }

  if (parseDefine(cmd, cmdObject, fullRequired)) {
    if (fullRequired) {
      saveAlias(cmdObject);
    }
    return cmd;
  }

  if (parseReportUrl(cmd, cmdObject, fullRequired)) {
    if (fullRequired) {
      reporting.setReportUrl(cmdObject.url);
    }
    return cmd;
  }

  return parseTimeCmd(cmd, cmdObject, fullRequired);
}

exports.getAliases = function() {
  loadAliases();
  return Object.assign({}, aliases);
}
