'use strict';

const fs = require('fs');
const open = require('open');

const FILENAME = "report-url.txt";
let reportUrl = null;

function loadReportUrl() {
  try {
    reportUrl = fs.readFileSync(FILENAME, 'utf8');
  } catch(err) {
    // (hopefully) the file doesn't yet exist
  }
}

function saveReportUrl() {
  fs.writeFileSync(FILENAME, reportUrl);
}

exports.report = function(issue, time) {
  loadReportUrl();
  if (!reportUrl) {
    return false;
  }

  open(reportUrl.replace("#", encodeURIComponent(issue)).replace("@", encodeURIComponent(time)));
  return true;
}

exports.setReportUrl = function(url) {
  reportUrl = url;
  saveReportUrl();
}
