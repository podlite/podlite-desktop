/* global vmd:true */

const {
  ipcRenderer,
  remote,
} = require('electron');

// const sharedState = remote.require('../shared/shared-state');

const electron = {
  ipc: ipcRenderer,
  // sharedState,
};

// no var/let/const on purpose
vmd = Object.assign({
  test:remote.app.getPath('userData'),
  windowid : require('url').parse(global.location.href).query.match(/id=(\d)+/)[1],
  fs:require('fs'),
  path: require('path'),
  saveFile(content) {
    console.log('save file')
    electron.ipc.send('save-file', content);
  },

  openFile(filePath) {
    electron.ipc.send('open-file', filePath);
  },

  openFileDialog() {
    electron.ipc.send('open-file-dialog');
  },
  setWindowTitle( title ){
    electron.ipc.send('set-title', title);
  },
  on(eventName, listener) {
    if (!electron.ipc) { return; }
    electron.ipc.on(eventName, listener);
  },

  off(eventName, listener) {
    if (!electron.ipc) {
      return;
    }
    if (typeof listener !== 'function') {
      return;
    }
    electron.ipc.removeListener(eventName, listener);
  },

  onPrintAction(callback) {
    vmd.on('print', callback);
  },

  onFindAction(callback) {
    vmd.on('find', callback);
  },

  onHistoryBackAction(callback) {
    vmd.on('history-back', callback);
  },

  onHistoryForwardAction(callback) {
    vmd.on('history-forward', callback);
  },

  onZoomInAction(callback) {
    vmd.on('zoom-in', callback);
  },

  onZoomOutAction(callback) {
    vmd.on('zoom-out', callback);
  },

  onZoomResetAction(callback) {
    vmd.on('zoom-reset', callback);
  },

  onContent(callback) {
    vmd.on('md', callback);
  },
}, 
// electron.sharedState
);
