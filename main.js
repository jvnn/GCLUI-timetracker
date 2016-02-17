'use strict';

const DEBUG = true;

const electron = require('electron');
const ipc = electron.ipcMain;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const timedb = require('./timedb.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    frame: false,
    width: 1200,
    height: DEBUG ? 800 : 400
  });

  mainWindow.loadURL(`file://${__dirname}/app/index.html`);

  if (DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

ipc.on('close', function() {
  app.quit();
});

ipc.on('cmd', function(event, cmd) {
  console.log('Main received: ' + cmd);
  event.sender.send('cmd-validation', parseCmd(cmd, null, false));
})

ipc.on('cmd-and-save', function(event, cmd) {
  console.log('Received to save: ' + cmd);
  event.returnValue = parseCmd(cmd, null, true);
})

ipc.on('timedb', function(event, arg) {
  event.sender.send('timedb-reply', timedb.getTimeDb());
})

function parseCmd(cmd, cmdObject, fullRequired) {
  if (!cmdObject) cmdObject = {};

  if (!cmd || cmd.length == 0) return true;

  switch (cmd[0]) {
    case 'S': cmdObject.type = 'start'; break;
    case 'A': cmdObject.type = 'away'; break;
    case 'B': cmdObject.type = 'back'; break;
    case 'O': cmdObject.type = 'out'; break;
    default: return false;
  }

  if (cmd.length == 1) return true;
  if (cmd[1] != ' ') return false;
  if (cmd.length == 2) return true;

  let issueIdx = cmd.indexOf('#', 2);
  let timeIdx = cmd.indexOf('@', 2);

  if (timeIdx < 0) return !fullRequired;
  if (issueIdx > timeIdx) return false;

  if (issueIdx > 2 || timeIdx > 2) {
    cmdObject.desc = cmd.substr(2, issueIdx < 0 ? timeIdx - 2 : issueIdx - 2);
  }
  if (issueIdx > 0) {
    cmdObject.issue = cmd.substr(issueIdx + 1, timeIdx - issueIdx);
  }
  let timeString = cmd.substr(timeIdx + 1);

  let timeRegex = /^(\d|[0-2]\d):([0-5]\d)$/;
  let dateRegex = /^(\d\d\d\d)-([0-1]\d)-([0-3]\d) (\d|[0-2]\d):([0-5]\d)$/;
  let date = new Date();

  if (timeRegex.test(timeString)) {
    // time from today
    let groups = timeString.match(timeRegex);
    let hours = parseInt(groups[1]);
    let minutes = parseInt(groups[2]);
    if (hours > 23) return false;
    date.setHours(hours);
    date.setMinutes(minutes);

  } else {
    let groups = timeString.match(dateRegex);
    if (!groups) return false;

    let year = parseInt(groups[1]);
    let month = parseInt(groups[2]);
    let day = parseInt(groups[3]);
    let hours = parseInt(groups[4]);
    let minutes = parseInt(groups[5]);
    if (month == 0 || month > 12 || day == 0 || day > 31 || hours > 23) return false;

    date = new Date(year, month, day, hours, minutes);
  }

  cmdObject.time = date.toISOString();
  return true;
}
