'use strict';
const ipc = require('electron').ipcRenderer;

document.querySelector('div#close').addEventListener('click', close);

initCmdInput();

ipc.on('timedb-reply', renderCalendar);
ipc.on('cmd-validation', cmdValidation);

function updateTimedb() {
  ipc.send('timedb');
}
updateTimedb();

function formatTime(time) {
  return (time.getHours() < 10 ? "0" : "") + time.getHours()
      + (time.getMinutes() < 10 ? ":0" : ":") + time.getMinutes();
}

function getCmdInput() {return document.querySelector('input#cmd');}

function cmdValid(valid) {
  if (valid) {
    getCmdInput().classList.remove('invalid');
  } else {
    getCmdInput().classList.add('invalid');
  }
}

function modifyInputTime(value, minutesToAdd) {
  let timeRegex = /@(\d\d\d\d-[0-1]\d-[0-3]\d |)(\d|[0-2]\d):([0-5]\d)$/;
  let groups = value.match(timeRegex);
  if (!groups) return value;

  let newValue = value.substr(0, value.lastIndexOf('@') + 1);
  newValue += groups[1]; // add whatever date stuff we had before the timeRegex

  let time = new Date();
  time.setHours(parseInt(groups[2]));
  time.setMinutes(parseInt(groups[3]) + minutesToAdd);
  newValue += formatTime(time);
  return newValue;
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
      input.value = modifyInputTime(input.value, 1);
    } else if (event.keyCode == 40) { // arrow down
      input.value = modifyInputTime(input.value, -1);
    } else {
      inputTimer = window.setTimeout(updateFromInput, 1000);
    }
  });

  input.addEventListener('keypress', function(event) {
    let c = event.key || event.charCode || event.keyCode;
    if (String.fromCharCode(c) == '@') {
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
  if (saveAndClear) {
    if (ipc.sendSync('cmd-and-save', cmd)) {
      input.value = '';
      cmdValid(true);
      updateTimedb();
    } else {
      cmdValid(false);
    }
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

function addSummaryElement(div, time, issue, special) {
  let p = document.createElement('p');
  p.classList.add('summary');
  if (special) p.classList.add('summary-special');
  let hoursDecimal = time / 3600000.0;
  let hours = Math.floor(hoursDecimal);
  let minutes = Math.floor((hoursDecimal - hours) * 60);
  p.innerHTML = issue + " - " + hours + "h " + minutes + "m";
  div.appendChild(p);
}

function renderSummary(div, summary) {
  if (!div || !summary) return;

  if (summary["__total"]) {
    addSummaryElement(div, summary["__total"], "Total", true);
  }

  if (summary["__pause"]) {
    addSummaryElement(div, summary["__pause"], "Pause", true);
  }

  for (let issue in summary) {
    if (!issue.startsWith("__")) {
      addSummaryElement(div, summary[issue], issue, false);
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
  let prevDate;
  let currentDayDiv;
  let issueSummary;

  data.forEach(function(element) {
    let time = new Date(element.time);

    // handle day changes:
    if (!prevDate || prevDate.getDate() != time.getDate()) {
      // render summary of previous day
      renderSummary(currentDayDiv, issueSummary);
      previous = null;
      issueSummary = {};

      currentDayDiv = document.createElement('div');
      currentDayDiv.classList.add('day');
      let title = document.createElement('h2');
      title.innerHTML = time.getDate() + ". " + (time.getMonth() + 1) + ". " + time.getFullYear();  
      currentDayDiv.appendChild(title);
      days.push(currentDayDiv);
    }
    prevDate = time;

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
  renderSummary(currentDayDiv, issueSummary);

  let calendar = document.querySelector('#calendar');
  calendar.innerHTML = "";

  days.reverse().forEach(function(element) {
    calendar.appendChild(element);
  });
}

function cmdValidation(event, valid) {
  cmdValid(valid);
}

function close() {
  ipc.send('close', 'do-close');
}
