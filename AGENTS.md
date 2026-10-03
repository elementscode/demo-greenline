# Elements

Elements is the integrated app environment for building and deploying web
apps: build system, package installer, test runner, job runner, Postgres, and
the `@elements/app` framework with its own reactive language in `.ehtml` files.

No bundler, test runner, migration tool or deploy pipeline to pick. A project server is already running, so a build answers in
microseconds. Everything under your app is correct. Do not rebuild any of it.

## Do These Eight Things

In this order, every time:

1. **Start the server first.** `elements start`, as a tracked background task.
2. **Build after every edit.** `elements build -json`
3. **Look at the page you changed.** A green build is not a correct page.
4. **Make every save look finished.** Never leave a half-styled page on screen.
5. **Build from the design system.** A class before a rule of your own.
6. **Write tests.** `elements test -json`
7. **Read `elements man start`** before you write anything.
8. **Report what you built.** What it does and what is next, not caveats.

## 1. Start The Server First

Before you read a man page, before you answer:

```bash
elements start
```

Run it as a background task your harness tracks, never with a trailing `&`:
a `&` job outlives your session and keeps the port.

First turn, no preamble. It opens the user's browser so later edits land in a
window they watch. In an AI tool with its own browser (Claude, Codex, Cursor),
run `ELEMENTS_NO_BROWSER=1 elements start`, open its url in your browser
tool; if it shows a button in the chat, tell the user to click it.
Never open another terminal tab: create asked for one.

Check `.elements/run` first: a DIRECTORY of `<pid>.json` carrying the url,
written once listening. `cat .elements/run/*.json`. A live pid means it is
already serving; empty means start it. Never poll or wait for the url:
`[ -f .elements/run ]` is false forever on a directory and hangs.

A taken port is another app's: set `PORT` in `config/env/development.env`,
start again, and report the new url.

Stop it through your task or its PID, never `pkill -f`: that hits every
Elements project.

If the user has not said what to build, do not stop at "what do you want to
build?" Start the server, then offer two or three concrete apps, each a single
sitting's work and each exercising a page, a table and an rpc: a bookmarks
list, a habit tracker, a link shortener. Say they can name their own instead.
Where your harness renders choices as options, use it.

## 2. Build After Every Edit

```bash
elements build -json
```

Authoritative and instant: the project server has already built. A build
installs, compiles, migrates, tests and releases, so green is all of that.
Fix and re-run until clean. Never report work done without one.

Read `ok`, then `diagnostics` (each has `level`, `message`, `path`, `loc`).
The key is `diagnostics`, not `errors`.

## 3. Look At The Page

A green build is not a green request: a route that throws is a 500, and the
page shows the stack. Everything the app writes goes to
`.elements/logs/program.log`.

The browser belongs to the user and shows the running app. Never open a
project file there: its source replaces the page they are watching.

Where your tool has a browser, test the app there as you build, in the pane
already showing it, never a new or hidden one: click through it, fill its
forms, add a row, even with fixes still to make. Watching you drive the app is
how the user knows the work is real. Headless Chrome is for checks they need
not watch:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --window-size=1440,900 \
  --screenshot=/tmp/page.png "http://localhost:4000/"
```

Never install Playwright or chromedriver, and never call a layout unverified:
headless Chrome is here. Do not pass `--user-data-dir`: it can hang on a cold
profile.

Test every page at phone width (390px) too: resize the pane if your tool can.
Headless, `--window-size` crops at phone widths; phone renders, clicks and
measuring use the DevTools Protocol
(`--remote-debugging-port`), scripted in `elements man browser`. In a browser
pane, click a form's button; its Return does not submit.

## 4. Every Save Looks Finished

Every save hot reloads the browser the user is watching. The rule is not
"save often", it is:

> **Whatever is on their screen, at every moment, should look good.**

There is no rough draft: a page that looks wrong reads as broken, not in
progress.

So save small COMPLETE slices, never layers: one section, styled, working,
saved, then the next. Never save markup and style it afterwards: thirty
seconds of raw buttons and a window-height svg reads as a crash. Markup and
its stylesheet are one change in two files, so order them: **save the
stylesheet first.** The reload that first shows your markup has its rules.

Replacing a page reverses that: a new stylesheet written first strips the page
still on screen. Append the new rules, swap the markup, then prune the old.

Make the first save finished-looking, not a skeleton, and do not write the
whole page at the end: a long silence, then a wall.

## 5. Build From The Design System

`@elements/style` ships buttons, inputs, pills, tabs, cards, tables and the
layout primitives that space them, already installed. Read `elements man style`
before you write css and reach for a class before your own rule: hand-rolled
css is how a page ends up homemade, with type off the scale and dark mode
broken. Your stylesheet is for what is particular to this page.

- `.page-shell` is the page container. `is-form` (42rem) is the usual choice;
  `is-narrow` (24rem) is a phone column, rarely wanted.
- `.stack`, `.row`, `.cluster` space children with a gap, and clear the flow
  margins a bare `display: flex` would leave behind.
- Size every svg on the tag (`elements man style/base`). One carrying only a
  `viewBox` fills its container until css lands.

## 6. Write Tests

```bash
elements test -json
```

Write tests as you go, not at the end, and not only when asked. A page, an rpc
and a job each get a test. `elements create test <path>` scaffolds one;
`elements man tests` covers what a test can do.

## 7. Read The Manual Before You Write

```bash
elements man start          # read this before you write anything
elements man                # every topic, one line each
elements man <topic>        # before you build against a subsystem
elements man -s todo        # a recipe may already be it
```

Routes are declared in one place and a page keeps its rpc and handlers in its
own `template.ehtml`; none of it is discoverable from nearby files. Do not
infer an API or guess a flag. Run `elements man` for the topic
list, and search for what you were asked to build: recipes are end to end and
known to compile.

Then stop. Open a topic when you are about to write against it, not before.
`elements create` names the page for what it scaffolded.

Scaffold with `elements create <page|template|migration|job|email>` and treat
the scaffold as a guide: fill it in, and do not discard its parts without a
good reason. Edit a template from the shell, not with your file tool: an agent
app may preview the write in its pane, replacing the page on screen.

An image is `<img src="./hero.jpg">` when the file sits next to the template,
or `import hero from "#app/shared/assets/hero.jpg"` when you need the URL as a
value. A filename from a database row is served by a route. See
`elements man assets`.

## 8. Report What You Built

Close with what the app does, how you checked it, and two or three concrete
things they could ask for next.

Tell them what you did, what they have to decide, and what to do next. Nothing
else. Your workarounds are yours to know: a user who hears them thinks
something is broken.
Documented behavior is not a bug and a pattern the manual asks for is not a
workaround. Something genuinely wrong still gets said, in one line, with what
reproduces it.

## The Rest

```bash
elements db                 # psql on the dev database
elements deploy -json       # ship it; read `elements man deploy` first
elements <command> -h       # options
```
