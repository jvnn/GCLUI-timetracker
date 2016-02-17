'use strict';

const fs = require('fs');

const FILENAME = "timedb.json";
let timedb;

function loadDb() {
  try {
    let file = fs.readFileSync(FILENAME);
    timedb = JSON.parse(file);
  } catch(err) {
    // (hopefully) the file doesn't yet exist
    timedb = [];
  }

  // in case of testing, break class ... I mean uncomment below
  // timedb = [
  //   {time:"2016-02-08T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-09T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-10T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-11T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-12T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-13T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-14T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-15T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-15T08:15:00.000Z", type:"start", desc:"something", issue:"FOO-11111"},
  //   {time:"2016-02-15T10:00:00.000Z", type:"start", desc:"investigating", issue:"FOO-22222"},
  //   {time:"2016-02-15T10:45:00.000Z", type:"start", desc:"moar!", issue:"FOO-11111"},
  //   {time:"2016-02-15T11:15:00.000Z", type:"away"},
  //   {time:"2016-02-15T11:45:00.000Z", type:"start", desc:"guaah new stuff", issue:"FOO-33333"},
  //   {time:"2016-02-15T16:10:00.000Z", type:"out"},
  //   {time:"2016-02-16T08:00:00.000Z", type:"start", desc:"doing stuff"},
  //   {time:"2016-02-16T08:15:00.000Z", type:"start", desc:"something", issue:"FOO-41111"},
  //   {time:"2016-02-16T10:00:00.000Z", type:"start", desc:"investigating", issue:"FOO-42222"},
  //   {time:"2016-02-16T10:45:00.000Z", type:"start", desc:"moar!", issue:"FOO-11111"},
  //   {time:"2016-02-16T11:15:00.000Z", type:"away"},
  //   {time:"2016-02-16T11:55:00.000Z", type:"back"},
  //   {time:"2016-02-16T13:10:00.000Z", type:"start", desc:"guaah new stuff", issue:"FOO-43333"}
  // ];
}

function saveDb() {
  fs.writeFileSync(FILENAME, JSON.stringify(timedb));
}

exports.getTimeDb = function() {
  if (!timedb) loadDb();
  // only return the last week's worth of days
  let timeLimit = new Date();
  timeLimit.setHours(0);
  timeLimit.setMinutes(0);
  timeLimit.setSeconds(0);
  timeLimit.setMilliseconds(0);
  timeLimit.setDate(timeLimit.getDate() - 7);

  return timedb.filter(element => Date.parse(element.time) > timeLimit.getTime());
}

exports.saveNewEntry = function(cmdObject) {
  if (!timedb) loadDb();
  if (!timedb) return;

  timedb.push(cmdObject);
  saveDb();
}
