'use strict';

let timedb;

function loadDb() {
  // TODO: load from file
  timedb = [
    {time:"2016-02-15T08:00:00.000Z", type:"start", desc:"doing stuff"},
    {time:"2016-02-15T08:15:00.000Z", type:"start", desc:"something", issue:"FOO-11111"},
    {time:"2016-02-15T10:00:00.000Z", type:"start", desc:"investigating", issue:"FOO-22222"},
    {time:"2016-02-15T10:45:00.000Z", type:"start", desc:"moar!", issue:"FOO-11111"},
    {time:"2016-02-15T11:15:00.000Z", type:"away"},
    {time:"2016-02-15T11:55:00.000Z", type:"back"},
    {time:"2016-02-15T13:10:00.000Z", type:"start", desc:"guaah new stuff", issue:"FOO-33333"},
    {time:"2016-02-15T16:10:00.000Z", type:"out"},
    {time:"2016-02-16T08:00:00.000Z", type:"start", desc:"doing stuff"},
    {time:"2016-02-16T08:15:00.000Z", type:"start", desc:"something", issue:"FOO-41111"},
    {time:"2016-02-16T10:00:00.000Z", type:"start", desc:"investigating", issue:"FOO-42222"},
    {time:"2016-02-16T10:45:00.000Z", type:"start", desc:"moar!", issue:"FOO-41111"},
    {time:"2016-02-16T11:15:00.000Z", type:"away"},
    {time:"2016-02-16T11:55:00.000Z", type:"back"},
    {time:"2016-02-16T13:10:00.000Z", type:"start", desc:"guaah new stuff", issue:"FOO-43333"}
  ];
}

exports.getTimeDb = function() {
  if (!timedb) loadDb();
  return timedb;
}
