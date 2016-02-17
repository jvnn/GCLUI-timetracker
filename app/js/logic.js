'use strict';
const ipc = require('electron').ipcRenderer;

document.querySelector('div#close').addEventListener('click', close);

initCmdInput();

ipc.on('timedb-reply', renderCalendar);
ipc.on('cmd-validation', cmdValidation);

ipc.send('timedb', '');

function getCmdInput() {return document.querySelector('input#cmd');}
function cmdValid(valid) {
  if (valid) {
    getCmdInput().classList.remove('invalid');
  } else {
    getCmdInput().classList.add('invalid');
  }
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
    } else {
      inputTimer = window.setTimeout(updateFromInput, 1000);
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

function renderSummary(div, summary) {
  if (!div || !summary) return;
  for (let issue in summary) {
    let p = document.createElement('p');
    p.classList.add('summary');
    let hoursDecimal = summary[issue] / 3600000.0;
    let hours = Math.floor(hoursDecimal);
    let minutes = Math.floor((hoursDecimal - hours) * 60);
    p.innerHTML = issue + " - " + hours + "h " + minutes + "m";
    div.appendChild(p);
  }
}

function updateSummary(summary, element, endTime) {
  if (element && element.issue) {
    let oldTime = summary[element.issue];
    if (!oldTime) oldTime = 0;
    summary[element.issue] = oldTime + (endTime - Date.parse(element.time));
  }
}

function renderCalendar(event, data) {
  let days = [];
  let colorIndex = 0;
  let colorMap = {"__issueless": "#EACDC1"};
  let onPause = false;
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
      title.innerHTML = time.getDate() + ". " + time.getMonth() + ". " + time.getFullYear();
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
    } else if (!onPause){
      // new element closes the previous one, except for pause
      updateSummary(issueSummary, previous, Date.parse(element.time));
    }

    onPause = element.type == 'away';

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
    let text = (time.getHours() < 10 ? "0" : "") + time.getHours()
        + (time.getMinutes() < 10 ? ":0" : ":") + time.getMinutes();
    if (element.issue) {
      text += " " + element.issue;
    }
    if (element.desc) {
      text += (element.issue ? " - " : " ") + element.desc;
    }
    newDiv.innerHTML = text;

    currentDayDiv.appendChild(newDiv);
    if (!onPause) {
      previous = element;
    }
  });

  // summary for an incomplete day
  renderSummary(currentDayDiv, issueSummary);

  let calendar = document.querySelector('#calendar');
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
