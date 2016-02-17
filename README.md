# Graphical Command Line User Interface timetracker

Something I wanted to make to track working hours. Uses a command line
system for fast input, but has a nice graphical presentation of the
results. Built using electron and node.js.

## Usage

The command line understands four basic commands:

* 'S' for starting a task
* 'A' for going away (e.g. lunch break)
* 'B' for coming back from a break
* 'O' for leaving for the day ("out")

Each command may be followed by a description and an issue code (e.g. for Jira issues) starting with '#'.

Each command *must* contain a time after '@' symbol.
The allowed formats are either `yyyy-mm-dd hh-mm` or, for the current day, `hh-mm`.
Once you type in the '@' character, current time is automatically filled in and can be increased or decreased with the arrow up/down keys.

An example command:
```
S Planning for a meeting #FOO-12345 @11:15
```

## Notes

This is not yet very well tested, and issues remain (such as being able to return from a break without starting one...).
I'll try to improve it whenever I have time. But in case of invalid entries (until the 'F' as in "fix" command is implemented)
it's easiest to edit the database file manually. Time timestamps are in human readable format for this very reason.
