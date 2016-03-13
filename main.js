'use strict';

const DEBUG = false;
function debug(line) {
  if (DEBUG) console.log(line);
}

const electron = require('electron');
const ipc = electron.ipcMain;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const timedb = require('./timedb.js');
const cmds = require('./commands.js');
const reporting = require('./reporting.js');

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
    height: 800
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
  debug('Main received: ' + cmd);
  event.sender.send('cmd-validation', cmds.parseCmd(cmd, null, false));
})

ipc.on('cmd-and-save', function(event, cmd) {
  debug('Received to save: ' + cmd);
  let cmdObject = {};
  let success = cmds.parseCmd(cmd, cmdObject, true);
  if (success && Object.keys(cmdObject).length !== 0) {
    timedb.saveNewEntry(cmdObject);
  }
  event.returnValue = success;
  // also trigger updates
  sendTimeDb(event);
  sendAliases(event);
})

ipc.on('timedb', sendTimeDb);

ipc.on('aliases', sendAliases);

ipc.on('report', function(event, data) {
  if (!data || !data.issue || !data.time) {
    debug('invalid report call with object ' + data);
    return;
  }
  debug('issue to report: ' + data.issue + ' ' + data.time);

  if (!reporting.report(data.issue, data.time)) {
    event.sender.send('request-report-url');
  }
})

ipc.on('set-report-url', function(event, data) {
  // TODO: add validation somewhere
  reporting.setReportUrl(data);
})

function sendTimeDb(event) {
  event.sender.send('timedb-reply', timedb.getTimeDb());
}

function sendAliases(event) {
  event.sender.send('aliases-reply', cmds.getAliases());
}
