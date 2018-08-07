'use strict';
const ipc = require('electron').ipcRenderer;
const dateFormat = require('dateformat');

let recentIssues = [];
let recentIssueIndex = -1;

document.querySelector('div#close').addEventListener('click', close);

initCmdInput();

ipc.on('timedb-reply', renderCalendar);
ipc.on('cmd-validation', cmdValidation);
ipc.on('aliases-reply', updateAliases);
ipc.on('request-report-url', function() {
  alert("Please set a report url using command 'R <url>'. "
      + "Character '#' will be replaced with the issue code, "
      + "'@sec' with the seconds spent and '@start' with the start time");
});

ipc.send('timedb');

function formatTime(time) {
  return (time.getHours() < 10 ? "0" : "") + time.getHours()
      + (time.getMinutes() < 10 ? ":0" : ":") + time.getMinutes();
}

function getCmdInput() {return document.querySelector('input#cmd');}

function setValidState(newCmd) {
  if (newCmd !== null) {
    getCmdInput().classList.remove('invalid');
    // if the returned cmd is something totally different as what we have
    // in the input field, and it used to be a string without spaces,
    // it's probably autoexpanded alias
    let currentValue = getCmdInput().value;
    if (currentValue.trim().indexOf(' ') < 0 &&
        currentValue.indexOf(newCmd) != 0 && newCmd.indexOf(currentValue) != 0) {
      getCmdInput().value = newCmd;
    }
  } else {
    getCmdInput().classList.add('invalid');
  }
}

function showHideHelp() {
  let help = document.querySelector('div#help');
  let hidden = help.classList.contains('hidden');
  if (hidden) {
    ipc.send('aliases');
  }
  help.classList.toggle('hidden');
}

function updateAliases(event, aliases) {
  let table = document.querySelector('table#aliases');
  table.innerHTML = '';
  for (let alias in aliases) {
    let row = document.createElement('tr');
    let aliasCol = document.createElement('td');
    aliasCol.classList.add('cmd-name');
    let cmdCol = document.createElement('td');
    cmdCol.classList.add('cmd-example');

    aliasCol.innerHTML = alias;
    cmdCol.innerHTML = aliases[alias];
    row.appendChild(aliasCol);
    row.appendChild(cmdCol);
    table.appendChild(row);
  }
}

function modifyInput(value, toAdd) {
  // case 1: modify time input
  let timeRegex = /@(\d\d\d\d-[0-1]\d-[0-3]\d |)(\d|[0-2]\d):([0-5]\d)$/;
  let groups = value.match(timeRegex);
  if (groups) {
    let newValue = value.substr(0, value.lastIndexOf('@') + 1);
    newValue += groups[1]; // add whatever date stuff we had before the timeRegex

    let time = new Date();
    time.setHours(parseInt(groups[2]));
    time.setMinutes(parseInt(groups[3]) + toAdd);
    newValue += formatTime(time);
    return newValue;
  }

  // nope, wasn't time.
  // case 2: modify issue
  let issueRegex = /#[^ ]*$/;
  groups = value.match(issueRegex);
  if (groups && recentIssues.length > 0) {
    if (recentIssueIndex < 0) {
      // always start with the most recent / oldest
      recentIssueIndex = toAdd > 0 ? 0 : recentIssues.length - 1;
    } else {
      recentIssueIndex = (recentIssueIndex + recentIssues.length + toAdd) % recentIssues.length;
    }
    let newValue = value.substr(0, value.lastIndexOf('#') + 1);
    newValue += recentIssues[recentIssueIndex];
    return newValue;
  }

  return value;
}

function initCmdInput() {
  let input = getCmdInput();
  var inputTimer = null;

  input.addEventListener('keydown', function(event) {
    if (inputTimer) {
      window.clearTimeout(inputTimer);
    }
    if (event.keyCode == 32) {
      // for spacebar, do it right away
      updateFromInput(false);
    } else if (event.keyCode == 13) {
      // enter, update and clear
      updateFromInput(true);
    } else if (event.keyCode == 38) { // arrow up
      input.value = modifyInput(input.value, 1);
    } else if (event.keyCode == 40) { // arrow down
      input.value = modifyInput(input.value, -1);
    } else {
      inputTimer = window.setTimeout(updateFromInput, 1000);
    }
  });

  input.addEventListener('keypress', function(event) {
    let c = event.key || event.charCode || event.keyCode;
    if ((c === '@' || String.fromCharCode(c) == '@') && !input.value.startsWith('R ')) {
      // add current time as a default
      input.value += '@' + formatTime(new Date());
      event.preventDefault();
    }
  });

  input.addEventListener('blur', function() {
    if (inputTimer) {
      window.clearTimeout(inputTimer);
    }
    updateFromInput(false);
  });
}

function updateFromInput(saveAndClear) {
  let input = getCmdInput()
  let cmd = input.value;
  if (cmd.trim() == 'H') {
    if (saveAndClear) {
      showHideHelp();
      input.value = '';
    }
    setValidState('H');
    return;
  }

  if (saveAndClear) {
    let resp = ipc.sendSync('cmd-and-save', cmd);
    if (resp !== null) {
      input.value = '';
    }
    setValidState(resp);
  } else {
    ipc.send('cmd', cmd);
  }
}


const TASK_COLORS = [
  "#ABFF73",
  "#FFFF84",
  "#A5FEE3",
  "#FFA4FF",
  "#CACAFF",
  "#FFBB7D",
  "#E6C5B9",
  "#FFBBDD"
];

function reportIssueTime(issue, timeSec, startTimeStr) {
  ipc.send('report', {"issue": issue, "timeSec": timeSec, "startTime": startTimeStr});
}

function addSummaryElement(div, time, issue, special, startTime) {
  let e = document.createElement('p');
  e.classList.add('summary');
  let hoursDecimal = time / 3600000.0;
  let hours = Math.floor(hoursDecimal);
  let minutes = Math.floor((hoursDecimal - hours) * 60);
  let timeString = hours + "h " + minutes + "m";
  e.innerHTML = issue + " - " + timeString;

  if (special) {
    e.classList.add('summary-special');
  } else {
    let startTimeStr = dateFormat(startTime, "yyyymmddHHMM");
    e.addEventListener('click', function() {reportIssueTime(issue, Math.round(time / 1000), startTimeStr);});
  }

  div.appendChild(e);
}

function renderSummary(div, summary, dayStartTime) {
  if (!div || !summary) return;

  if (summary["__total"]) {
    addSummaryElement(div, summary["__total"], "Total", true);
  }

  if (summary["__pause"]) {
    addSummaryElement(div, summary["__pause"], "Pause", true);
  }

  for (let issue in summary) {
    if (!issue.startsWith("__")) {
      addSummaryElement(div, summary[issue], issue, false, dayStartTime);
    }
  }
}

function updateSummary(summary, startTimeStr, key, endTime) {
  if (startTimeStr && key) {
    let oldTime = summary[key];
    if (!oldTime) oldTime = 0;
    summary[key] = oldTime + (endTime - Date.parse(startTimeStr));
  }
}

function renderCalendar(event, data) {
  let days = [];
  let colorIndex = 0;
  let colorMap = {"__issueless": "#EACDC1"};
  let pauseStartTime = null;
  let previous;
  let dayStartTime;
  let currentDayDiv;
  let issueSummary;

  data.forEach(function(element) {
    let time = new Date(element.time);

    // handle day changes:
    if (!dayStartTime || dayStartTime.getDate() != time.getDate()) {
      // render summary of previous day
      renderSummary(currentDayDiv, issueSummary, dayStartTime);
      previous = null;
      issueSummary = {};
      dayStartTime = time;

      currentDayDiv = document.createElement('div');
      currentDayDiv.classList.add('day');
      let title = document.createElement('h2');
      title.innerHTML = time.getDate() + ". " + (time.getMonth() + 1) + ". " + time.getFullYear();
      currentDayDiv.appendChild(title);
      days.push(currentDayDiv);
    }

    let newDiv = document.createElement('div');
    newDiv.classList.add('task');

    if (element.type == 'back') {
      // back from pause, restore previous element (except for timestamp)
      let tmp = element.time;
      element = previous;
      element.time = tmp;
      time = new Date(element.time);
      updateSummary(issueSummary, pauseStartTime, "__pause", Date.parse(tmp));
    } else if (pauseStartTime) {
      // starting something new after a pause
      updateSummary(issueSummary, pauseStartTime, "__pause", Date.parse(element.time));
    } else if (previous) {
      // new element closes the previous (non-pause) one
      updateSummary(issueSummary, previous.time, previous.issue, Date.parse(element.time));
      updateSummary(issueSummary, previous.time, "__total", Date.parse(element.time));
    }

    pauseStartTime = element.type == 'away' ? element.time : null;

    // set styles:
    switch (element.type) {
      case 'start':
        let color = colorMap["__issueless"];
        if (element.issue) {
          color = colorMap[element.issue];
          if (!color) {
            color = TASK_COLORS[colorIndex];
            colorIndex = (colorIndex + 1) % TASK_COLORS.length;
            colorMap[element.issue] = color;
          }
        }
        element.divBackgroundColor = color;
        newDiv.style.backgroundColor = color;
        break;

      case 'away':
        newDiv.classList.add('pause');
        break;
      case 'back':
        newDiv.style.backgroundColor = element.divBackgroundColor;
        break;
      case 'out':
        newDiv.classList.add('out');
        break;
    }

    // create task text:
    let text = formatTime(time);
    if (element.issue) {
      text += " " + element.issue;
    }
    if (element.desc) {
      text += (element.issue ? " - " : " ") + element.desc;
    }
    newDiv.innerHTML = text;

    currentDayDiv.appendChild(newDiv);
    if (!pauseStartTime) {
      previous = element;
    }
  });

  // summary for an incomplete day
  renderSummary(currentDayDiv, issueSummary, dayStartTime);

  let calendar = document.querySelector('#calendar');
  calendar.innerHTML = "";

  days.reverse().forEach(function(element) {
    calendar.appendChild(element);
  });

  recentIssues = [];
  recentIssueIndex = -1;
  data.forEach(element => {if (element.issue) recentIssues.push(element.issue)});
  recentIssues = recentIssues.reverse().reduce(function(unique, value) {
    if (unique.indexOf(value) < 0) {
      unique.push(value);
    }
    return unique;
  }, []);
}

function cmdValidation(event, newCmd) {
  setValidState(newCmd);
}

function close() {
  ipc.send('close', 'do-close');
}
