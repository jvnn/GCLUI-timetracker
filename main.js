'use strict';

const DEBUG = true;
function debug(line) {
  if (DEBUG) console.log(line);
}

const electron = require('electron');
const ipc = electron.ipcMain;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const timedb = require('./timedb.js');
const cmds = require('./commands.js');

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
    height: DEBUG ? 800 : 600
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
  if (success) {
    timedb.saveNewEntry(cmdObject);
  }
  event.returnValue = success;
})

ipc.on('timedb', function(event, arg) {
  event.sender.send('timedb-reply', timedb.getTimeDb());
})
