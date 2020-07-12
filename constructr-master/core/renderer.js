/**
 * Copyright (c) 2016 Structured Data, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

"use strict";

/* global process */
/* global global */
/* global __dirname */
/* global CodeMirror */

const fs = require("fs");
const net = require("net");
const path = require("path");
const exec = require('child_process').exec;
const untildify = require("untildify");
const PubSub = require("pubsub-js");
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;
const dialog = remote.dialog;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

const Shell = require("cmjs-shell");
//const Shell = require( "../../cmjs-shell/shell.js");

const ExtendR = require("./extendR.js");
const PackageManager = require("./package-manager.js");
const FileCache = require("./file-cache.js");
const Settings = require("./settings.js");
const MenuTemplate = require("./menus.js");
const HistorySearch = require("./search-history.js");

const R = new ExtendR();
const Utils = require("./utils.js").init(R);

const PREFERRED_IPC = "pipe";
const RDATA = ".constructr-shell.rdata";

const RESIZE_TIMEOUT = 50;
const SCW_TIMEOUT = 500;
const SPINNER_TIMEOUT = 250;
const HISTORY_MAX = 1000;

const LEARN_MORE_URL = 'https://constructr-project.com/shell';

/**
 * FIXME: this needs an explanation
 */
if (process.platform === "darwin") {
  process.env.PATH = process.env.PATH + ":/usr/local/bin";
}

/**
 * constants array can be updated by packages; but we never want it to 
 * return undefined, as that might have some side-effects in message passing.
 * 
 * update: can't redefine constants.  again this is just to prevent accidents.
 */
const Constants = new Proxy({

		SHELL_MESSAGE: "shell-message",
		SHELL_INSERT_NODE: "shell-insert-node",
		SHELL_FOCUS: "shell-focus",
		SHELL_BLOCK: "shell-block",
		SHELL_UNBLOCK: "shell-unblock",
		SHELL_UPDATE_THEME: "shell-update-theme",

		SETTINGS_CHANGE: "settings-change"

}, {
    set: function (target, property, value, receiver) {
      if (target.hasOwnProperty(property)) throw ("can't redefine constant: " + property);
      target[property] = value;
      return true;
    },
    get: function (target, property, receiver) {

      // note: this breaks iteration? perhaps should be 
      // if( target[property] )

      if (target.hasOwnProperty(property)) return target[property];
      throw ("undefined constant: " + property);
    }
  });


const Messages = require("./messages.js").load(path.join(__dirname, "data", "messages.json"));
const Packages = PackageManager.packages; // alias

let init_complete = false;
const locals_registry = {};
const watches_registry = {};

let shell;
let function_tips = true; // options can disable

const versions = {};
function check_version(dir) {
  fs.readFile(path.join(dir, "package.json"), { encoding: "utf8" }, (err, data) => {
    if (data) {
      var obj = JSON.parse(data);
      if (obj && obj.name && obj.version) {
        versions[obj.name] = obj.version;
      }
    }
  });
};
check_version(__dirname);
check_version(path.join(__dirname, "..", "node_modules", "controlr")); // dev
check_version(path.join(__dirname, "node_modules", "controlr"));


/**
 * the idea is that on the first scroll event, we shift over the spinner and
 * then we can remove the listener.  this should only fire once, unless the 
 * console is cleared; in that event we'll need to add the listener back, which 
 * you do by calling this function.  the biggest problem is that it's very 
 * CM-specific, which we are trying to avoid.
 *
 * incidentally, it works because CM uses a fake scrollbar -- there's a 1-pixel
 * div that extends to the theoretical height of the document, which persuades
 * the browser to show a scrollbar. CM actually handles scrolling internally and
 * only paints a portion of the document.
 * 
 * another problem: the horizontal scrollbar.  we need to shift up if the hsb is 
 * visible.  the problem with this one is that it can come and go if the window
 * changes size as well as when some long content comes in.
 * 
 * I think the solution is to call it on resize (actually probably true for both,
 * since you can stretch out a window vertically too, although that's rarer).
 * 
 * Another problem with the horizontal scrollbar: the scroll event doesn't fire
 * if a long line is printed, triggering the scrollbar, but the caret stays no
 * the left-hand size.  we can trap that with vscroll, but it seems wasteful.  
 * 
 * I'm not sure there's a better way to do it.
 * 
 * UPDATE: attaching to the "viewport change" event from CM.
 */
var update_spinner = function () {

  // cache nodes
  if (!global.spinner_cache) {
    global.spinner_cache = {
      v: document.querySelector(".CodeMirror-vscrollbar"),
      h: document.querySelector(".CodeMirror-hscrollbar"),
      overlay: document.querySelector(".overlay-bottom-right"),
      offset_y_installed: true // for side-effect
    };
  }

  var adjust_v = function () {

    // we call this here in the event that the function fires twice before 
    // removing the listner; e.g. you clear the console before it ever starts
    // scrolling.  it has no effect if we haven't added yet.
    spinner_cache.v.removeEventListener("scroll", adjust_v);

    if (spinner_cache.v.clientWidth) {
      spinner_cache.overlay.classList.add("scrollbar-offset-x");
    }
    else {
      spinner_cache.overlay.classList.remove("scrollbar-offset-x");
      spinner_cache.v.addEventListener("scroll", adjust_v);
    }
  };

  var adjust_h = function () {

    let token = 0;

    if (spinner_cache.h.clientWidth) {
      spinner_cache.overlay.classList.add("scrollbar-offset-y");
      spinner_cache.offset_y_installed = true;
      if (token) PubSub.unsubscribe(token);
      token = 0;
    }
    else {
      if (spinner_cache.offset_y_installed) {
        spinner_cache.overlay.classList.remove("scrollbar-offset-y");
        spinner_cache.offset_y_installed = false;
        token = PubSub.subscribe('viewport-change', adjust_h);
      }
    }

  };

  adjust_v();
  adjust_h();

};

var context_help = function () {

  var s = shell.get_selections();
  if (s && s.length && s[0].length) {
    R.exec("help('" + s[0].replace(/'/g, "") + "')");
    return;
  }
  var p = shell.get_caret_line();

  if (p.pos <= 0) {
    p.text = p.text.trim().replace(/^(\S+?)\s.*$/, "$1").trim();
  }
  else {
    var pattern = "^(.{" + p.pos + "}\\S+).*$";
    p.text = p.text.replace(new RegExp(pattern), "$1").trim().replace(/^.*\s/, "");
  }
  if (p.text.trim().length === 0) R.exec("help()");
  else R.exec("help('" + p.text.trim().replace(/['"]/g, "") + "')");

};

var function_key_callback = function (key) {
  switch (key) {
    case 'esc':
      if (R.busy()) R.send_break();
      else shell.cancel();
      break;
    case 'f3':
      context_help();
      break;
  }
};

var tip_function = function (text, pos) {

  if (!function_tips) return;
  var cmd = `.js.client.autocomplete( '${text}', ${pos})`;
  R.internal(cmd, "autocomplete").then(function (obj) {

    if (obj.response && obj.response['function.signature']) {
      shell.show_function_tip(obj.response['function.signature']);
    }
    else shell.hide_function_tip();

  }).catch(function (e) {

    // generally speaking we can ignore this, although
    // we probably need some filter... for now we will ignore

    // FIXME: debug?

  });
};

var hint_function = function (text, pos, callback) {

  // escape both single and double quotes
  text = text.replace(/"/g, "\\\"");
  text = text.replace(/'/g, "\\'");

  var cmd = `.js.client.autocomplete( '${text}', ${pos})`;

  R.internal(cmd).then(function (obj) {
    if (obj.response && obj.response.comps && obj.response.comps !== "NA") {
      var list = obj.response.comps;
      if (typeof list === "string") list = [list];
      callback(list, obj.response.start, obj.response.end);
    }
    else callback();
  }).catch(function (obj) { callback(); });

}

/**
 * FIXME: allow function override 
 */
var get_locals = function () {
  R.exec(".js.client.locals(environment())", "locals");
};

/**
 * FIXME: should this use internal? (...)
 */
var get_watches = function () {
  R.exec(".js.client.watches()", "watches");
};

/**
 * we are now handling "sync" requests via promise, to support
 * some longer-running operations (downloads).  
 */
var sync_request_func_p = function (req) {

  // run hooks first.  if any hook returns a value (should 
  // be a promise), return that.  essentially first one 
  // wins, although we will still call all hooks so there's
  // potential for side effects.

  var result = Hooks.exec("sync-request-p", req);
  for (var i = 0; i < result.length; i++) {
    if (result[i]) return result[i];
  }

  var cmd = req.command ? req.command : req.$data ? req.$data.command : null;

  if (cmd) {
    switch (cmd) {
      case "history":
        return Promise.resolve(shell.get_history().join("\n"));
    }
  }

  console.warn("Unhandled sync request", req);
  return Promise.resolve();
}

var exec_function = function (original_cmd, callback) {

  // UPDATE for new exec structure: pass everthing, and
  // send the result "prompt" to the caller.

  // NOTE: now that console messages are passed via the
  // pubsub system, I think there's a case where this 
  // gets out of order: the return function inserts 
  // a prompt (possibly) before some message is printed.

  // we should be able to fix that by routing the return
  // value through pubsub as well, so the prompt gets 
  // inserted in proper order always

  R.exec(original_cmd).then(function (rslt) {

    if (rslt.data && rslt.data.srcref && Object.keys(rslt.data.srcref).length) {
      rslt.data.prompt_class = "shell-prompt-debug";
    }
    if (rslt.data && !rslt.data.continuation) {
      if (Object.keys(locals_registry).length) get_locals();
      if (Object.keys(watches_registry).length) get_watches();
      Hooks.exec("update");
    }

    PubSub.publish("exec_complete", [callback, rslt.data, original_cmd]);

  }).catch(function (rslt) {
    console.warn("exec_function rejected", rslt);
    PubSub.publish("exec_complete", [callback, rslt, original_cmd]);
  });

};

var show_details = function (elt) {

  var panel = document.getElementById("details-panel");
  if (!panel) {

    var on_watch = function (msg, watch) {

      // allow something to stay in the box even if we switch
      // from locals->watches or vice versa; these flags will
      // force watch/locals to get called, and we won't erase
      // on not found

      if (locals_registry.detail) return;

      for (var i = 0; i < watch.length; i++) {
        if (watch[i].key === panel.active_field) {
          panel.header = `Detail: ${watch[i].name} (${watch[i].func})`;
          panel.setContent(watch[i].fulltext);
          return;
        }
      }
      panel.header = "Detail";
      panel.setContent("");
    };

    var on_locals = function (msg, locals) {

      // see above

      // FIXME: patching for new locals structure, fix properly

      if (watches_registry.detail) return;

      if (locals && locals.$data && locals.$data.fields
        && locals.$data.fields.$data) {
        var contents = locals.$data.fields.$data[panel.active_field];
        contents = contents.$data.value ? contents.$data.value : undefined;

        // did it disappear?
        if (typeof (contents) === "undefined") {
          panel.header = "Detail";
        }
        // or reappear, if we are coming out of debug?
        else {
          panel.header = "Detail: " + panel.active_field;
        }

        if (!contents) contents = "";
        if (typeof contents !== "string") contents = contents.join("\n");
        panel.setContent(contents);


      }

    };

    // console.info( "Create details" );

    panel = document.createElement("object-details-panel");
    panel.setAttribute("data-preserve", true);
    Object.assign(panel, {
      className: "panel",
      id: "details-panel",
      format_value: function (value, node) {
        CodeMirror.runMode(value, "r", node);
        node.classList.add("cm-s-" + Settings.theme);
      },
      onHide: function () {
        delete (locals_registry.detail);
        delete (watches_registry.detail);
      },
      onUnload: function () {
        delete (locals_registry.detail);
        delete (watches_registry.detail);
      },
      onShow: function () {
        delete (locals_registry.detail);
        delete (watches_registry.detail);
        if (locals_registry.locals) locals_registry.detail = 1;
        if (watches_registry.watch) watches_registry.detail = 1;
      }
    });

    panel.addEventListener("close", function (e) {
      PubSub.publish(Constants.SIDE_PANEL_REMOVE, panel);
    });

    details_context_menu.$target = panel;
    panel.addEventListener("contextmenu", function (e) {
      details_context_menu.popup(remote.getCurrentWindow());
    });

    panel.$.selected_value.addEventListener("keydown", function (e) {
      if (e.keyCode === 65 && e.ctrlKey) {
        e.stopPropagation();
        e.preventDefault();
        panel.selectAll();
      }
    });

    // Bus.on( 'locals', on_locals );
    // Bus.on( 'watch', on_watch );

    PubSub.subscribe('locals', on_locals);
    PubSub.subscribe('watch', on_watch);

  }

  if (panel._onShow) panel._onShow();
  panel.header = "Detail";

  if (!elt.name || elt.name === "") {
    panel.active_field = null;
    panel.setContent("");
  }
  else {
    panel.header += (": " + elt.name);
    if (elt.func) panel.header += (` (${elt.func})`);
    panel.active_field = elt.key ? elt.key : elt.name;
    panel.setContent(elt.fulltext);
  }

  let pos = Settings["details.panel.position"];
  if (!pos || (typeof pos !== "object")) pos = { row: 3, column: 0 };

  PubSub.publish(Constants.SIDE_PANEL_ATTACH, {
    node: panel,
    position: pos
  });

};

var remove_watch = function (index) {
  R.do_call( "js.client.remove.watch", index+1, "exec" ).then( function(){
    get_watches();
  });
}

var add_watch = function (field, func, envir, show) {

  var field = field ? field.trim() : "";
  if (field === "") return; // throw

  var func = func ? func.trim() : "";
  var envir = envir ? envir.trim() : "";

  var cmd = "js.client.add.watch(" + field;
  if (func !== "") cmd += ", " + func;
  if (envir !== "") cmd += ", " + envir;
  cmd += ")";

  // console.info( cmd );
  R.exec(cmd).then(function () {

    // the method will send a callback.
    // FIXME: make that an option in the R call

    //if( show ) open_watch();
    //else get_watches();

    if( show ) get_watches();

  });

}

var open_watch = function () {

  var panel = document.getElementById("watches-panel");
  if (!panel) {

    panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("id", "watches-panel");
    panel.header = document.createElement("panel-header");
    panel.header.title = Messages.WATCHES;

    let closelistener = function () {
      panel.header.removeEventListener("close", closelistener);
      panel.header.removeEventListener("click", click);
      panel.header.removeEventListener("contextmenu", context);
      PubSub.publish(Constants.SIDE_PANEL_REMOVE, panel);
    };

    panel.header.addEventListener("close", closelistener);
    panel.appendChild(panel.header);

    let watches;

    let click = function (e) {
      e.stopPropagation();
      e.preventDefault();
      let row = e.target.row;
      if (typeof row === "undefined") return;
      if (e.target.className.match(/header/)) return;

      watches[row].handled = false;
      let rslt = Hooks.exec("watches_click", watches[row]);

      if (rslt && rslt.some(function (x) {
        return x;
      })) return;

      show_details(watches[row]);
    };

    let doubleclick = function (e) {

      e.stopPropagation();
      e.preventDefault();

      if (!e.target.className.match(/header/)) return;
      let col = e.target.col;
      if (typeof col === "undefined") return;

      let ascending = false;
      if (panel.node.sortColumn === col) ascending = !panel.node.sortAscending;

      panel.node.sort(col, ascending);

    };

    panel.addEventListener("click", click);
    panel.addEventListener("dblclick", doubleclick);

    panel.addEventListener("keydown", function (e) {
      if (e.keyCode === 46) { // delete

        e.stopPropagation();
        e.preventDefault();

        let sel = panel.node.get_selection();
        let row = sel.start.r;
        if (row < 0) return;

        remove_watch(row);

      }
    });

    let context = function (e) {
      e.stopPropagation();
      e.preventDefault();

      let sel = panel.node.get_selection();
      let row = sel.start.r;
      if (typeof row === "undefined") return;

      watches[row].index = row;

      let menu = Menu.buildFromTemplate([
        { label: Messages.WATCH + ": " + watches[row].name + " (" + watches[row].func + ")", enabled: false },
        { type: "separator" },
        {
          label: Messages.DETAILS,
          click: function () {
            show_details(watches[row]);
          }
        },
        {
          label: Messages.REMOVE_WATCH, click: function (e) {
            remove_watch(row);
          }
        }
      ]);

      menu.target = watches[row];
      Hooks.exec("watches_context_menu", menu);
      menu.popup(remote.getCurrentWindow());
    };

    panel.addEventListener("contextmenu", context);

    panel.node = document.createElement("display-grid");
    panel.node.selectCells = false;
    panel.node.selectRows = true;
    panel.appendChild(panel.node);

    let token;

    panel.onHide = function () { delete (watches_registry.watch); };
    panel.onShow = function () { watches_registry.watch = 1; };
    panel.onUnload = function () {
    		PubSub.unsubscribe(token);
      delete (watches_registry.watch);
    };

    let on_watch = function (msg, watch) {

      let names = [];
      let values = [];
      let classes = [];
      let sizes = [];

      watches = watch;
      watch.forEach(function (w) {
        names.push(w.name);
        let text = w.value;
        if (text.length > 64) text = text.substring(0, 61) + "...";
        values.push(text);
        sizes.push(w.size);
        classes.push(w.rclass || "");
      });

      let headers = watch.length ? [Messages.FIELD, Messages.CLASS, Messages.SIZE, Messages.VALUE] : false;

      panel.node.update({
        fixed: true,
        data: [names, classes, sizes, values],
        column_classes: ["string", "string", "string", "left"],
        column_headers: headers
      }, true, true);

    };

    token = PubSub.subscribe("watch", on_watch);


  }

  let pos = Settings["watch.panel.position"];
  if (!pos || (typeof pos !== "object")) pos = { row: 2, column: 0 };

  PubSub.publish(Constants.SIDE_PANEL_ATTACH, {
    position: pos, node: panel
  });

  get_watches();

}

let html_file = "";
var save_shell = function () {

  var p = dialog.showSaveDialog({
    title: "Save Shell Contents",
    defaultPath: html_file || "shell.html",
    filters: [
      { name: 'HTML', extensions: ['html'] },
      { name: "All files", extensions: ['*'] }
    ]
  });

  // this does not fire change event, so call 
  if (p && p.length) {

    html_file = p;

    let embedded_style = "";
    let theme = Settings.theme || "default";

    // let ss = document.head.querySelectorAll( "link[rel='stylesheet']:not([data-export])");
    let stylesheets = [Utils.patch_asar_path(path.join("data", "codemirror-minimal.css"))];
    let themestylesheet = document.head.querySelector("link[rel='stylesheet'][data-target='theme']");
    if (themestylesheet) {
      if (themestylesheet.href.startsWith("file://")) {
        if (process.platform === "win32") {
          stylesheets.push(themestylesheet.href.substring(8));
        }
        else stylesheets.push(themestylesheet.href.substring(7));
      }
    }

    for (let i = 0; i < stylesheets.length; i++) {
      let href = stylesheets[i];
      let contents = fs.readFileSync(stylesheets[i], { encoding: "utf-8" });
      embedded_style += `\n/* ==== ${stylesheets[i]} ==== */\n\n`;
      embedded_style += contents + "\n";
    }

    let s = document.head.querySelector("style[data-id='user']");
    if (s) {
      embedded_style += `\n/* ==== user stylesheet ==== */\n\n`;
      embedded_style += s.innerText + "\n";
    }

    let x = shell.getOption("viewportMargin");
    shell.setOption("viewportMargin", Infinity);
    shell.refresh();
    let code = document.querySelector("#shell-container .CodeMirror-code");
    let html = code.innerHTML;
    let platformClass = document.body.className;

    let head =
      `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <style>
${embedded_style}
        </style>
    </head>
    <body>
        <div class='${platformClass}'>
            <div class='CodeMirror'><div class='cm-s-${theme}'>
`;

    let foot = `\n</div>\n</div></div>\n</body>\n</html>\n`;

    let m = html.match(/<canvas.*?<\/canvas>/g);
    if (m) {
      for (let i = 0; i < m.length; i++) {
        let id = null, dataurl = null, style = "", cls = "";
        let n = m[i].match(/id="(.*?)"/);
        if (n) id = n[1];
        n = m[0].match(/style=".*?"/);
        if (n) style = n[0];
        n = m[0].match(/class=".*?"/);
        if (n) cls = n[0];
        if (id) {
          let canvas = code.querySelector("#" + id);
          if (canvas) {
            let dataURL = canvas.toDataURL('image/png');
            let img = `<img src="${dataURL}" ${style} ${cls}/>\n`;
            html = html.replace(m[i], img);
          }
        }
      }
      // console.info( m );
    }

    shell.setOption("viewportMargin", x);

    // shell.refresh();
    fs.writeFile(p, head + html + foot, { encoding: "utf8" }, function (err) {
      if (err) {
        // PubSub.publish( Constants.SHELL_MESSAGE, [ Messages.R_HOME_NOT_FOUND, "shell-system-information", true ]);
      }
    });
  }

};

// this is preserved over multiple calls (ideally)
let history_file = "history.R";
var save_history = function () {
  var p = dialog.showSaveDialog({
    title: "Save History",
    defaultPath: history_file,
    filters: [
      { name: 'R source', extensions: ['R', 'r', 'rsrc'] },
      { name: "All files", extensions: ['*'] }
    ]
  })
  // this does not fire change event, so call 
  if (p && p.length) {

    let history = shell.get_history();
    let header = `\n# Shell history saved ${new Date().toString()}\n\n`;

    fs.writeFile(p, header + history.join("\n"), { encoding: "utf8" }, function (err) {
      if (err) {
        // PubSub.publish( Constants.SHELL_MESSAGE, [ Messages.R_HOME_NOT_FOUND, "shell-system-information", true ]);
      }
    });

  }
}

var open_history_panel = function () {

  var panel = document.getElementById("history-panel");
  if (!panel) {
    panel = document.createElement("history-panel");

    let token = null;
    let token2 = null;
    let loaded = false;
    let query;
    let removedLines = 0;

    let markerAnnotations = [];

    let update_history = function (ch, args) {

      let cmd = args[2].join('\n').trim();
      if (!cmd.length) return;

      let count = cm.getDoc().lineCount();
      if (count == 1 && ("" === cm.getDoc().getLine(0))) { count = 0; }
      let append = count ? "\n" + cmd : cmd;

      let ln = cm.lastLine();
      let text = cm.getLine(ln);
      let si = cm.getScrollInfo();
      let atbottom = ((si.clientHeight + si.top) === si.height);

      cm.replaceRange(append, { line: ln, ch: text.length });
      if (atbottom) cm.scrollIntoView({ line: ln + 1, ch: 0 });

      if (count >= HISTORY_MAX) {

        // remove the first line
        cm.replaceRange("", { line: 0, ch: 0 }, { line: 1, ch: 0 });

        // preserve line numbers, session only
        removedLines++;
        cm.setOption("firstLineNumber", 1 + removedLines);

        // markers and classes move up, but annotations don't -- correct
        if (!markerAnnotations.length) return;

        let annotations_tmp = [];
        markerAnnotations.forEach(function (a) {
          if (a.from.line > 0) {
            let line = a.from.line - 1;
            annotations_tmp.push({
              from: { ch: 0, line: line },
              to: { ch: 1, line: line }
            });
          }
        });

        markerAnnotations = annotations_tmp;
        annotation.update(markerAnnotations);

      }


    };

    let cm = CodeMirror(function (elt) { panel.appendChild(elt); }, {
      //inputStyle: "contenteditable",
      readOnly: true,
      cursorBlinkRate: 0,
      lineNumbers: true,
      gutters: ['history-gutter'],
      mode: "r"
    });

    if (Settings.theme) cm.setOption("theme", Settings.theme);

    let clearHistory = function (reset) {
      if (reset) shell.clearHistory();
      removedLines = 0;
      cm.setValue("");
      // cm.setOption( "firstLineNumber", 1 );
      markerAnnotations = [];
      annotation.update(markerAnnotations);
    };

    Object.assign(panel, {
      visible: false,
      header: "History",
      className: "panel",
      id: "history-panel",
      format_value: function (value, node) {
        CodeMirror.runMode(value, "r", node);
        node.classList.add("cm-s-" + Settings.theme);
      },
      onHide: function () {
        this.visible = false;
      },
      onShow: function () {

        this.visible = true;
        if (!token) token = PubSub.subscribe("exec_complete", update_history);
        if (!token2) token2 = PubSub.subscribe(Constants.SHELL_UPDATE_THEME, function (ch, args) {
          cm.setOption("theme", args);
        });
        if (!loaded) {
          setTimeout(function () {
            loaded = true;
            let history = shell.get_history();
            if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX);
            cm.setValue(history.join("\n"));
            if (history.length) cm.scrollIntoView({ line: history.length - 1, ch: 0 });
          }, 1);
        }
        else {
          setTimeout(function () {
            cm.refresh();
          }, 1);
        }
      },
      onUnload: function () {
        console.info("unload");
        this.visible = false;
        if (token) PubSub.unsubscribe(token);
        if (token2) PubSub.unsubscribe(token2);
        token = null;
        token2 = null;
      }
    });
    panel.setAttribute("data-preserve", true);
    panel.addEventListener("close", function () {
      PubSub.publish(Constants.SIDE_PANEL_REMOVE, panel);
    });

    panel.addEventListener("contextmenu", function (e) {

      let doc = cm.getDoc();
      let pos = doc.getCursor();

      let ss = doc.somethingSelected();
      let markoption, execoption;

      if (ss) {

        // kind of hard to figure out... see if there are 
        // any marks in the selection?

        let selections = [];
        let selection_has_marks = false;
        doc.listSelections().forEach(function (sel) {
          let a = Math.min(sel.anchor.line, sel.head.line);
          let b = Math.max(sel.anchor.line, sel.head.line);
          for (let i = a; i <= b; i++) {
            let info = cm.lineInfo(i);
            let marked = (!!info.gutterMarkers);
            selection_has_marks = selection_has_marks || marked;
            selections.push(i);
          }
        });
        selections.sort();
        console.info(selections);

        markoption = {
          label: selection_has_marks ? 'Clear Markers in Selection' : 'Mark Selection',
          click: function (e) {
            selections.forEach(function (line) {
              setMarker(line, !selection_has_marks, true);
            });
            markerAnnotations.sort(function (a, b) { return a.from.line - b.from.line; });
            annotation.update(markerAnnotations);
          }
        };
        execoption = {
          label: 'Execute Selection',
          click: function (e) {
          }
        };
      }
      else {

        // add/remove single-line marker

        let info = cm.lineInfo(pos.line);
        let marked = (!!info.gutterMarkers);
        markoption = {
          label: marked ? 'Remove Marker' : 'Mark Line',
          click: function (e) {
            setMarker(pos.line, !marked);
          }
        };
        execoption = {
          label: 'Execute Line',
          click: function (e) {
          }
        };
      }

      let template = [
        { label: 'Copy', role: 'copy' },
        {
          label: 'Select All', click: function (e) {
            setImmediate(function () {
              cm.execCommand("selectAll");
            });
          }
        },
        { type: 'separator' },

        markoption,
        // TODO // execoption,

        { type: 'separator' },
        {
          label: 'Save History...', click: function () {
            save_history();
          }
        },
        {
          label: 'Clear History', click: function (e) {
            setImmediate(function () {
              clearHistory();
            });
          }
        },
        {
          label: 'Reset History', click: function (e) {
            setImmediate(function () {
              clearHistory(true);
            });
          }
        }
      ];

      let menu = Menu.buildFromTemplate(template);
      menu.popup(remote.getCurrentWindow());

    });

    panel.addEventListener("filter-change", function (e) {
      query = e.detail;
      if (query.length) cm.search(query);
      else cm.clearSearch();
    });

    panel.addEventListener("find-next", function (e) {
      if (query) cm.next(e.detail === -1);
    });

    HistorySearch.apply(cm);

    let annotation = cm.annotateScrollbar("history-scrollbar-annotation");

    let setMarker = function (line, marker, tollUpdates) {
      if (!marker) {
        cm.setGutterMarker(line, "history-gutter", null);
        cm.getDoc().removeLineClass(line, "background", "history-marker-background");
        markerAnnotations = markerAnnotations.filter(function (ma) {
          return ma.from.line !== line;
        });
      }
      else {
        let x = document.createElement("div");
        x.className = "history-gutter-marker";
        cm.setGutterMarker(line, "history-gutter", x);
        cm.getDoc().addLineClass(line, "background", "history-marker-background");
        markerAnnotations.push({
          from: { line: line, ch: 0 }, to: { line: line, ch: 1 }
        });
      }
      if (!tollUpdates) {
        markerAnnotations.sort(function (a, b) { return a.from.line - b.from.line; });
        annotation.update(markerAnnotations);
      }
    };

    cm.on("gutterClick", function (instance, line, gutter, e) {
      let info = instance.lineInfo(line);
      let marked = (!!info.gutterMarkers);
      setMarker(line, !marked);
    });

    panel.$.content_area.addEventListener("keydown", function (e) {
      if (e.keyCode === 70 && e.ctrlKey) {
        e.stopPropagation();
        e.preventDefault();
        console.info("Ctrl+F");
        panel.$.query.focus();
      }
      else if (e.keyCode === 27) {
        panel.$.query.value = "";
        cm.clearSearch();
      }
    });

  }

  let pos = Settings["history.panel.position"];
  if (!pos || (typeof pos !== "object")) pos = { row: 5, column: 0 };

  PubSub.publish(Constants.SIDE_PANEL_ATTACH, {
    position: pos, node: panel
  });

}

var open_locals = function () {

  var panel = document.getElementById("locals-panel");
  if (!panel) {

    panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("id", "locals-panel");
    panel.header = document.createElement("panel-header");
    panel.header.title = Messages.LOCALS;

    var closelistener = function () {
      panel.header.removeEventListener("close", closelistener);
      panel.header.removeEventListener("click", click);
      panel.header.removeEventListener("contextmenu", context);
      PubSub.publish(Constants.SIDE_PANEL_REMOVE, panel);
    };

    panel.header.addEventListener("close", closelistener);
    panel.appendChild(panel.header);

    let keys, data;
    let indexes = null;

    let click = function (e) {

      e.stopPropagation();
      e.preventDefault();

      let row = e.target.row;
      if (typeof row === "undefined") return;

      // not on headers (doubleclick -> sort)
      if (e.target.className.match(/header/)) return;

      if (indexes) {
        console.info(row, "->", indexes[row]);
        row = indexes[row];
      }

      let key = keys[row];
      let val = data[key];
      let cls = val.$data['class'];
		    let text = val.$data.value;
      if (!Array.isArray(text)) text = [text];

      let opts = {
        name: key,
        rclass: cls,
        key: key,
        fulltext: text.join("\n"),
        data: val
      };

      let rslt = Hooks.exec("locals_click", opts);
      if (rslt && rslt.some(function (x) {
        return x;
      })) return;

      show_details(opts);

    };

    let doubleclick = function (e) {

      e.stopPropagation();
      e.preventDefault();

      if (!e.target.className.match(/header/)) return;
      let col = e.target.col;
      if (typeof col === "undefined") return;

      let ascending = false;
      if (panel.node.sortColumn === col) ascending = !panel.node.sortAscending;

      panel.node.sort(col, ascending);

    };

    panel.addEventListener("click", click);
    panel.addEventListener("dblclick", doubleclick);

    let context = function (e) {
      e.stopPropagation();
      e.preventDefault();
      let row = e.target.row;
      if (typeof row === "undefined") return;

      let key = keys[row];
      let val = data[key];
      let cls = val.$data['class'];
      let text = val.$data.value;
      if (!Array.isArray(text)) text = [text];

      let menu = Menu.buildFromTemplate([
        { label: Messages.FIELD + ": " + key, enabled: false },
        { type: "separator" },
        {
          label: Messages.DETAILS, click: function () {
            show_details({
              name: key, key: key,
              fulltext: text.join("\n")
            });
          }
        },
        {
          label: Messages.ADD_WATCH, click: function () {
            add_watch(key, undefined, undefined, true);
          }
        }
      ]);

      menu.target = { name: key, rclass: cls, data: val };
      Hooks.exec("locals_context_menu", menu);
      menu.popup(remote.getCurrentWindow());
    };

    panel.addEventListener("contextmenu", context);

    panel.node = document.createElement("display-grid");
    panel.node.selectCells = false;
    panel.node.selectRows = true;
    panel.appendChild(panel.node);

    let token;

    panel.onHide = function () { delete (locals_registry.locals); };
    panel.onShow = function () { locals_registry.locals = 1; };
    panel.onUnload = function () {
      panel.removeEventListener("click", click);
      panel.removeEventListener("dblclick", doubleclick);
      panel.removeEventListener("contextmenu", context);

      PubSub.unsubscribe(token);
      delete (locals_registry.locals);
    };

    let on_locals = function (msg, locals) {

      // FIXME: don't send in empty data; OR, handle empty data in a more useful way.

      locals = locals || { $data: { fields: {}, envir: "(unknown)" } };

      panel.header.title = "Locals " + locals.$data.envir;

      keys = locals.$data.fields && locals.$data.fields.$names ? locals.$data.fields.$names : [];
      data = locals.$data.fields && locals.$data.fields.$data ? locals.$data.fields.$data : {};

      let table_data = [keys, Array(keys.length), Array(keys.length), Array(keys.length)];

      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let val = data[key];
        table_data[1][i] = val.$data.class;
        table_data[2][i] = val.$data.size.toString();

        let text = val.$data.value;
        if (Array.isArray(text)) text = text[0];
        if (text.length > 64) text = text.substring(0, 61) + "...";
        table_data[3][i] = text;
      };

      panel.node.update({
        fixed: true,
        data: table_data,
        column_classes: ["string", "string", "string", "left"],
        column_headers: [Messages.FIELD, Messages.CLASS, Messages.SIZE, Messages.VALUE]
      })

    };

    token = PubSub.subscribe("locals", on_locals);

  }

  let pos = Settings["locals.panel.position"];
  if (!pos || (typeof pos !== "object")) pos = { row: 2, column: 0 };

  PubSub.publish(Constants.SIDE_PANEL_ATTACH, {
    position: pos, node: panel
  });

  get_locals();

};


var open_test_area = function () {

  // handy for dev.  create node: 

  let node = document.createElement("display-grid");
  node.resizeColumns = true;

  // set opts

  let rs = function () {
    node.refresh();
  };

  let token = 0;

  let opts = {
    node: node,
    position: 3,
    title: "Test block",
    onHide: function () {
      if (token) PubSub.unsubscribe(token);
      token = 0;
    },
    onShow: function () {
      token = PubSub.subscribe("resize", rs);
    },
    onUnload: function () {
      if (token) PubSub.unsubscribe(token);
      token = 0;
    }
  };

  // fake data
  let data = [];
  let column_headers = [];

  let nrow = 50;
  let ncol = 3;

  let row_headers = new Array(nrow);

  for (let i = 0; i < nrow; i++) row_headers[i] = (i + 1);

  column_headers.push("Fruit Type");
  let arr = new Array(nrow);
  for (let j = 0; j < nrow; j++) arr[j] = j;

  arr = new Array(nrow);
  var factor = ["banana", "tangerine", "volkswagen", "mario goetze", "never", "Quorn"];
  for (let j = 0; j < nrow; j++) arr[j] =
    factor[Math.floor(Math.random() * factor.length)];
  data.push(arr);

  for (let i = 0; i < ncol - 1; i++) {
    arr = new Array(nrow);
    if (i && (i % 2 === 0)) {
      column_headers.push("SPOON");
      for (let j = 0; j < nrow; j++) arr[j] = "spoon";
      arr[Math.round(arr.length / 2)] = "extraspoon";
    }
    else {
      column_headers.push("V" + (i + 1));
      for (let j = 0; j < nrow; j++) arr[j] = Math.round(Math.random() * 10000) / 100;
    }
    data.push(arr);
  }

  for (let i = 0; i < data.length; i++) {
    data[i][0] = `COL ${i + 1}/${data.length}`;
  }

  for (let i = 0; i < data[0].length; i++) {
    data[2][i] = "I AM A LONG STRING.  LONGER, EVEN.  LONG!"
  }

  window.setTimeout(function () {
    node.update({
      fixed: true,
      data: data,
      row_headers: false, // row_headers,
      column_headers: column_headers
    });
  }, 100);

  // show

  PubSub.publish(Constants.STACKED_PANE_INSERT, opts);
};


function toggle_shell_preferences() {
  open_shell_preferences(true);
};

/**
 * preferences is constructed here, rather than declaratively.  
 * why? it should support plugins added at runtime (TODO).
 */
var open_shell_preferences = function (toggle) {

  let panel = null;

  // this is not preserved, so if the element exists, it's shown.
  if (toggle) {
    panel = document.querySelector("shell-preferences");
    if (panel) {
      PubSub.publish(Constants.SIDE_PANEL_POP, panel);
      return;
    }
  }

  panel = document.createElement("shell-preferences");
  panel.className = "panel";
  panel.addEventListener('close', function () { PubSub.publish(Constants.SIDE_PANEL_POP, panel); });
  panel.$.cancel.addEventListener('click', function () { PubSub.publish(Constants.SIDE_PANEL_POP, panel); });

  // general
  var group = document.createElement("preferences-group");
  panel.appendChild(group);

  var basic_options =
    [
      {
        label: "Wrap long lines",
        setting: "line.wrapping"
      },
      {
        label: "Save / restore environment",
        setting: "save.restore"
      },
      {
        label: "Function tips",
        setting: "disable.function.tips",
        invert: true
      }
    ];

  // get the rest of the basic options from packages
  Object.keys(PackageManager.spec).forEach(function (key) {
    var spec = PackageManager.spec[key];
    if (spec.preferences) {
      Object.keys(spec.preferences).forEach(function (pref) {
        var obj = spec.preferences[pref];
        basic_options.push({
          label: obj.label,
          setting: pref,
          invert: !!obj.invert
        });
      });
    }
  });

  // now render
  basic_options.forEach(function (obj) {
    obj.className = "list-entry";
    obj.Settings = Settings;
    group.appendChild(new PreferencesOption(obj));
  });

  // startup options
  group = document.createElement("preferences-group");
  group.header = "Startup";
  panel.appendChild(group);

  var startup = new PreferencesInput({
    file: true,
    placeholder: "R startup file",
    setting: "startup.file",
    className: "list-entry",
    Settings: Settings
  });

  startup.addEventListener('browse', function () {
    var p = dialog.showOpenDialog({
      title: "R Startup File",
      defaultPath: startup.value,
      filters: [
        { name: 'R source', extensions: ['R', 'r', 'rsrc'] },
        { name: "All files", extensions: ['*'] }],
      properties: ['openFile']
    })
    // this does not fire change event, so call 
    if (p && p.length) startup.set_value(p[0]);
  });
  group.appendChild(startup);

  // user stylesheet
  group = document.createElement("preferences-group");
  group.header = "User Stylesheet";
  panel.appendChild(group);

  var userstylesheet = new PreferencesInput({
    file: true,
    placeholder: "User stylesheet",
    setting: "user.stylesheet",
    className: "list-entry",
    Settings: Settings
  });

  userstylesheet.addEventListener('browse', function () {
    var p = dialog.showOpenDialog({
      title: "User Stylesheet",
      defaultPath: userstylesheet.value,
      filters: [
        { name: 'CSS stylesheets', extensions: ['css'] },
        { name: "All files", extensions: ['*'] }],
      properties: ['openFile']
    })
    // this does not fire change event, so call 
    if (p && p.length) userstylesheet.set_value(p[0]);
  });
  group.appendChild(userstylesheet);

  // next, groups from packages
  Object.keys(PackageManager.spec).forEach(function (key) {
    var spec = PackageManager.spec[key];
    if (spec.preferenceGroups) {
      Object.keys(spec.preferenceGroups).forEach(function (groupname) {
        var pgroup = spec.preferenceGroups[groupname];
        group = document.createElement("preferences-group");
        group.header = groupname;
        panel.appendChild(group);
        Object.keys(pgroup).forEach(function (subkey) {
          var subpref = pgroup[subkey];
          switch (subpref.type) {

            case "input":
              let inputfield = new PreferencesInput({
                file: false,
                placeholder: subpref.placeholder || "",
                setting: subkey,
                className: "list-entry",
                Settings: Settings
              });
              if (subpref.file) {
                // ...
              }
              group.appendChild(inputfield);
              break;

            case "size":
              var size = Settings[subkey] || subpref.default;
              var sizer = document.createElement("preferences-size");

              sizer.width = size.width;
              sizer.height = size.height;
              sizer.min = subpref.min.width || 50;
              sizer.classList.add("list-entry");
              group.appendChild(sizer);
              sizer.addEventListener("change", function (e) {
                //console.info( e.detail );
                Settings[subkey] = e.detail;
              });
              break;

            case "choice":

              // FIXME: make this a class

              var choices = subpref.options || [];
              if (typeof choices === "string") {
                choices = spec.module[choices].call(this);
              }
              var selector = document.createElement("preferences-choice");
              var selected = Settings[subkey] || subpref.default;
              var index = 0;

              selector.choices = choices.map(function (choice, i) {
                if (choice === selected) index = i;
                return { label: choice };
              });
              selector.selected = index;
              selector.addEventListener('change', function (e) {
                Settings[subkey] = e.detail.label;
              });
              group.appendChild(selector);
              break;
          }
        });
      });
    }
  });

  PubSub.publish(Constants.SIDE_PANEL_PUSH, { node: panel });

};

var last_scw = -1;
var scw_timeout = 0;
var set_console_width = function () {

  if (!init_complete) return;

  if (scw_timeout) clearTimeout(scw_timeout);
  scw_timeout = setTimeout(function () {
    shell.refresh();
    update_spinner();
    var chars = Math.max(20, shell.get_width_in_chars());
    if (chars !== last_scw) {
      last_scw = chars;
      R.set_console_width(chars);
    }
  }, SCW_TIMEOUT);

};

/**
 * find R_HOME and return it. precedence:
 * 
 *  (1) command-line argument 
 *  (2) environment variable 
 *  (3) local (in app/)
 *  (4) Rscript on PATH
 * 
 * resolves to the value of R_HOME, or undefined. 
 * UPDATE: resolves to an object 
 * {
 *  rhome: /path/to/r/home
 *  located: [ "command-line", "environment", "local", "rscript" ]
 * }
 */
var ensure_r_home = function () {

  // for the purposes of this function, we either 
  // return a variable or not, but we never reject.

  // ?: why?

  return new Promise(function (resolve, reject) {

    // 1: check command line
    remote.getCurrentWindow().main_process_args.forEach(function (arg) {
      var m = arg.match(/--r-home=(.*?)$/);
      if (m) {
        var p = path.resolve(untildify(m[1]));
        resolve({ rhome: p, located: "command-line" });
        return;
      }
    });

    // 2: env var
    if (process.env.R_HOME) {
      resolve({ rhome: process.env.R_HOME, located: "envrionment" });
      return;
    }

    // 3: check local
    var paths = fs.readdirSync(Utils.patch_asar_path(__dirname));
    if (paths.some(function (p) {
      if (p.match(/^R-[\d\.]+$/)) {
        resolve({ rhome: path.join(__dirname, p), located: "local" });
        return true;
      }
      return false;
    })) {
      return; // we already resolved
    }

    // 4: try system if Rscript is executable 
    try {
      // NOTE: windows requires double-quote for -e
      exec(`Rscript -e "cat(R.home());"`, function (err, stdout, stderr) {
        if (!err && stdout) {
          if (stdout.length) resolve({ rhome: stdout, located: "rscript" });
        }
        else resolve();
        return;
      });
    }
    catch (e) { resolve(); }

  });
}


var init_r = function (opts = {}) {

  let rhome = opts.rhome;
  let located = opts.located;

  if (!rhome) {
    PubSub.publish(Constants.SHELL_MESSAGE, [Messages.R_HOME_NOT_FOUND, "shell-system-information", true]);
    return Promise.resolve();
  }

  console.info(`starting; R_HOME=${rhome} (${located})`);
  rhome = Utils.patch_asar_path(rhome);

  // there's a hook to allow for the browser panel, but default
  // to electron's openExternal method (so it will work if you 
  // toss the browser package)	

  R.on('browser', function (data) {
    var url = (data.$data ? data.$data.url : data.url);
    var rslt = Hooks.exec("browser", url);
    if (!rslt.some(function (r) { return r; })) electron.shell.openExternal(url);
  });

  // print to the shell.  note that using pubsub here changes the order
  // of execution, to the detriment of our text scheme.  we should support
  // this but we'll need to modify the shell code.

  R.on('console', function (msg, flag) {
    PubSub.publish(Constants.SHELL_MESSAGE, [msg, flag ? "shell-error" : "shell-text"]);
  });

  // streams from child (see note in controlR)

  R.on('r.stdout', function (msg) {
    PubSub.publish(Constants.SHELL_MESSAGE, [msg.toString(), "shell-piped-stream", true]); // FIXME: class?
  });
  R.on('r.stderr', function (msg) {
    PubSub.publish(Constants.SHELL_MESSAGE, [msg.toString(), "shell-piped-stream", true]); // FIXME: err class
  });

  // prefs
  R.on('preferences', function (msg) {
    if (msg.$data && msg.$data.KEY) {
      let val = msg.$data.VALUE;

      // NOTE: null is an object
      if (val && typeof val === "object") {
        if (!Array.isArray(val)) {
          val = val.$data;
          if (val.$type === "list") {
            val = val.$data;
          }
        }
      }
      Settings[msg.$data.KEY] = val;
    }
  });

  // FIXME: format locals like watch, below -- this makes sense

  R.on('locals', function (msg) {
    PubSub.publish("locals", msg);
  });

  // R sends notification when a watch is set so we can open the panel
  R.on('add-watch', function () {
    open_watch();
  });

  R.on('watches', function (msg) {

    // we're going to unpack (simplify) this event here so multiple
    // listeners don't have to do the same thing

    let watches = [];
    if (msg.$data && msg.$data.fields && msg.$data.fields.$data && msg.$data.fields.$data.length) {
      watches = msg.$data.fields.$data.map(function (elt, index) {

        let name = elt.$data.label;
        let func = elt.$data.func;

        // key is a (reasonably) unique identifier we can use to 
        // repaint the details window.  avoids problems with indexing.

        let key = name + "::" + elt.$data.envir + "::" + elt.$data.func;

        // value can be anything.  we'd prefer strings, generally, but
        // that's not guaranteed.  we should perhaps allow custom processing here?

        let val = elt.$data.value;
        let err = elt.$data.err;
        let text = "";
        let line;

        if (err) {
          line = text = err;
        }
        else {
          if (!Array.isArray(val)) val = [val];
          val.forEach(function (line) {
            if (typeof line === "object") line = JSON.stringify(line);
            text += line.toString().replace(/[\r\n]+$/, "") + "\n";
          })
          line = text.split("\n")[0];
        }

        return {
          rclass: elt.$data['class'],
          size: elt.$data['size'],
          index: index,
          name: name,
          key: key,
          value: line,
          func: func,
          fulltext: text,
          histogram: elt.$data.histogram || undefined
        };
      });
    }

    //Bus.emit( "watch", watches );
    PubSub.publish("watch", watches);

  });

  // busy status.  show a spinner if the operation is taking longer than (X)ms.  
  R.on('state-change', function (state) {
    var elt = document.querySelector(".status-icon");
    if (state) {
      if (global.status_timeout) {
        clearTimeout(global.status_timeout);
      }
      global.status_timeout = setTimeout(function () {
        elt.classList.add("busy");
        global.status_timeout = 0;
      }, SPINNER_TIMEOUT);
    }
    else {
      if (global.status_timeout) {
        clearTimeout(global.status_timeout);
        global.status_timeout = 0;
      }
      elt.classList.remove("busy");
    }
  });

  // system commands. FIXME: hook
  R.on('system', function (msg) {
    var cmd = msg.$data ? msg.$data.cmd : undefined;
    switch (cmd) {
      case "quit":
        quit();
        break;
      default:
        console.info("Unhandled system packet", msg);
    }
  });

  // now do the actual init

  let prompt = null;

  // FIXME: all the options we set here could be done in the startup file;
  // OR, conversely, we could read the startup file and pass that in as 
  // commands (i.e. not sourcing at all).  that would support dynamic options
  // (default mirror, graphics size) as well, and simplify the structure.

  // flag: whether library is loaded properly, controls loading of the startup file
  let libloaded = false;

  return new Promise(function (resolve, reject) {

    // this would originally be relative to node_modules/controlr/js.  
    // set explicitly and patch for asar.  

    let basedir = Utils.patch_asar_path(path.join(__dirname, "node_modules", "controlr", "js"));

    // this is a patch for running in dev, with the 2-level app structure
    let fstat = fs.existsSync(basedir);
    if (!fstat) basedir = Utils.patch_asar_path(path.join(__dirname, "..", "node_modules", "controlr", "js"));

    // we may use this more than once...

    let libpath = Utils.patch_asar_path(path.join(__dirname, "library"));
    let libpaths = `c( .libPaths(), "${Utils.escape_backslashes(libpath, 2)}" )`;

    R.init({
      debug: true,
      basedir: basedir,
      rhome: rhome,
      permissive: true,
      'sync-request-promise': sync_request_func_p,
      connection_type: PREFERRED_IPC
    }).then(function (rsp) {

      // init complete -- should be a prompt (but wait until init is complete to display it?)
      if (rsp.data && rsp.data.prompt) prompt = rsp.data.prompt;

      // explicitly load library from explicit path.  
      // FIXME: what if you want to override? is there a way?
      // A: here's what we can do: pass a vector including the values 
      // of libpath with the app lib at the end -- that way sticking 
      // the library somewhere else will override.

      // see above for libpaths

      return R.internal(`library( "jsClientLib", lib.loc=${libpaths}, logical.return=T )`);

    }).then(function (rslt) {

      libloaded = !!rslt.response;
      if (libloaded) {
        return R.internal(`installed.packages(lib.loc=${libpaths})['jsClientLib',]`);
      }
      else {
        PubSub.publish(Constants.SHELL_MESSAGE, [Messages.MISSING_JSCLIENTLIB, "shell-system-information"]);
        return Promise.resolve(null);
      }

    }).then(function (rslt) {

      if (rslt && rslt.response) {
        versions.jsClientLib = rslt.response.Version;
      }

      // there's a case on windows where we are bundling R, but the way
      // the installer works additional libraries will get wiped on re-install.
      // we want to set a specific libdir that will last longer.  

      // we should do this only if R is local -- set flag?

      if (process.platform === "win32" && located === "local") {
        return R.internal(`dir.create( file.path( Sys.getenv( "APPDATA" ), "constructr-libs" ), showWarnings=F ); `
          + `.libPaths( file.path( Sys.getenv( "APPDATA" ), "constructr-libs" ));`);
      }
      else return Promise.resolve();

    }).then(function () {

      // load startup file
      if (libloaded) {
        console.info("Loading startup file");
        let startup_path = Utils.patch_asar_path(path.join(__dirname, "startup.R"));
        return R.internal(`source('${Utils.escape_backslashes(startup_path, 2)}')`);
      }
      else return Promise.resolve();

    }).then(function () {

      if (libloaded) {

        console.info("Setting options");

        // NOTE: this happens twice? FIXME

        // copy settings to R
        let cmds = Object.keys(Settings).map(function (key) {

          let type = typeof Settings[key];
          let val = Settings[key];

          if (Array.isArray(Settings[key])) {
            let json = JSON.stringify(val);
            val = "c(" + json.substr(1, json.length - 2) + ")";
          }
          else if (type === "object") { // FIXME: need a recursive method here
            if (null == val) {
              val = "NULL";
            }
            else {
              let elts = Object.keys(val).map(function (k2) {
                let v2 = val[k2];
                if (typeof v2 === "string")
                  return `${k2}='${val[k2]}'`;
                return `${k2}=${val[k2]}`;
              });
              val = `list(${elts.join(", ")})`;
            }
          }
          else if (type === "string") {
            val = `"${Utils.escape_backslashes(Settings[key], 2)}"`;
          }
          else if (type === "boolean") {
            val = Settings[key] ? "T" : "F";
          }
          else {
            // ...
          }
          return `assign( "${key}", ${val}, envir=.js.client.options.env )`;
        });

        return R.internal(cmds.join("\n"));

      }
      else return Promise.resolve();

    }).then(function () {

      // set shutdown handler so we close cleanly
      window.addEventListener("beforeunload", function (event) {

        // we do this in two steps.  the first pass always fails,
        // and then (out of context) calls save and shutdown.
        // the second pass always succeeds, although we should 
        // add some error reporting in the event of error. 

        // UPDATE: which works fine, except that it also gets called
        // on reload; in which case our calling close doesn't have
        // the desired result.  we need to figure out how we got here...

        // reload is not important except for dev.  we can just use a 
        // dev flag to enable it.

        // the reverse way to handle it is to explicitly capture quit
        // events; there's a limited set of paths to quit, so we can
        // trap them (or most of them, anyway).

        // ... and, using option 2.

        // this is a reload.  note that this may not properly shut 
        // down child processes on linux (also, FIXME).

        if (!global.__quit) {
          R.shutdown();
          return;
        }

        if (window.__unloadpending) {
          return;
        }

        window.__unloadpending = true;
        event.returnValue = false;

        setImmediate(function () {
          if (!!Settings["save.restore"]) {
            var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
            var data = Utils.escape_backslashes(path.join(home, RDATA), 2);
            var cmd = `invisible( save.image('${data}'))`;
            console.info(cmd);
            R.exec(cmd).then(function () {
              console.info("saved; calling shutdown");
              return R.shutdown();
            }).then(function () {
              remote.getCurrentWindow().close();
              if (process.platform == 'darwin') {
                ipcRenderer.send('system', 'quit');
              }
            }).catch(function (e) {
              alert("Shutdown error [1]: " + e);
              console.info(e);
              remote.getCurrentWindow().close();
              if (process.platform == 'darwin') {
                ipcRenderer.send('system', 'quit');
              }
            });
            event.returnValue = false;
          }
          else {
            R.shutdown().then(function () {
              remote.getCurrentWindow().close();
              if (process.platform == 'darwin') {
                ipcRenderer.send('system', 'quit');
              }
            }).catch(function (e) {
              alert("Shutdown error [2]: " + e);
              console.info(e);
              remote.getCurrentWindow().close();
              if (process.platform == 'darwin') {
                ipcRenderer.send('system', 'quit');
              }
            });
            event.returnValue = false;
          }
        });
      });

      // set any options from our Settings (FIXME: before or after sourcing startup?)
      // CRAN mirror requires some special handling

      var default_mirror = Settings["default.mirror"];
      if (default_mirror) {
        return R.set_cran_mirror(default_mirror);
      }
      else return Promise.resolve();

    }).then(function () {
      if (!!Settings["save.restore"]) {
        var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        var data = Utils.escape_backslashes(path.join(home, RDATA), 2);
        var cmd = `invisible( if(file.exists('${data}')){ load( '${data}' )})`;
        return R.exec(cmd);
      }
      else return Promise.resolve();

    }).then(function () {

      // get R version, just for informational purposes
      return R.internal(`R.Version()$version.string`);

    }).then(function (rsp) {

      versions.R = rsp.response;

      init_complete = true;
      set_console_width();

      document.querySelector("#shell-layout").addEventListener("resize", function () {
        set_console_width();
        shell.refresh();
        update_spinner();
      });

      // if( prompt ) shell.prompt( prompt );
      resolve({ success: true, prompt: prompt });

    }).catch(function (e) {

      console.info(e);
      PubSub.publish(Constants.SHELL_MESSAGE, e.message || e.response || e.toString());
      resolve(false); // NOTE: NOT REJECTING

    });

  });

};

function update_user_stylesheet() {

  // assuming this is called on change, we want to remove it

  let style = document.querySelector("style[data-id=user]");
  if (style) style.parentElement.removeChild(style);

  let ss = Settings['user.stylesheet'];
  if (ss) {
    Packages['file-watcher'].watch_internal({
      path: ss,
      change: function () {
        Packages['file-watcher'].unwatch_internal({ path: ss });
        update_user_stylesheet();
      }
    })
    return new Promise(function (resolve, reject) {
      fs.readFile(ss, { encoding: "utf8" }, function (err, contents) {
        if (err) console.error(err);
        else {
          style = document.createElement("style");
          style.setAttribute("type", "text/css");
          style.setAttribute("data-id", "user");
          style.textContent = contents;
          document.head.appendChild(style);
        }
        resolve();
      });
    });
  }
  else return Promise.resolve();

}

document.addEventListener("DOMContentLoaded", function (event) {

  // shell
  shell = new Shell(CodeMirror, {
    // inputStyle: "contenteditable",
    // debug: true,
    container: "#shell-container",
    cursorBlinkRate: 0,
    mode: "r",
    hint_function: hint_function,
    tip_function: tip_function,
    exec_function: exec_function,
    function_key_callback: function_key_callback,
    suppress_initial_prompt: true,
    viewport_change: function () {
      PubSub.publish("viewport-change");
    }
  });
  if (Settings["line.wrapping"]) shell.setOption("lineWrapping", true);

  shell.setOption("matchBrackets", true);

  // window.shell = shell;

  // most interaction with the shell is indirect, via messaging
  // this lets us isolate the shell reasonably well. (this is true
  // for packages, but core still has a lot of direct calls).

  PubSub.subscribe(Constants.SHELL_MESSAGE, function (channel, args) {
    if (!Array.isArray(args)) args = [args];
    shell.response.apply(this, args);
  });

  PubSub.subscribe(Constants.SHELL_INSERT_NODE, function (channel, args) {
    if (!Array.isArray(args)) args = [args];
    shell.insert_node.apply(this, args);
  });

  PubSub.subscribe(Constants.SHELL_FOCUS, function (channel, args) {
    shell.focus();
  });

  PubSub.subscribe(Constants.SHELL_BLOCK, function (channel, args) {
    shell.block();
  });

  PubSub.subscribe(Constants.SHELL_UNBLOCK, function (channel, args) {
    shell.unblock.apply(this, args);
  });

  PubSub.subscribe(Constants.SHELL_UPDATE_THEME, function (channel, args) {
    shell.setOption("theme", args);
    shell.refresh();
  });

  var shellContainer = document.getElementById("shell-container");
  shellContainer.addEventListener("contextmenu", function (e) {
    e.stopPropagation();
    e.preventDefault();
    templates["shell-context-menu"].popup(remote.getCurrentWindow());
  });

  // here we add some platform-specific classes.  this is done so we 
  // can have more precise control over fonts (basically we like ubuntu
  // mono, but it's too large at a given point size).

  if (process.platform === "win32") {
    document.body.classList.add("windows");
  }
  else if (process.platform === "linux") {
    document.body.classList.add("linux");
    var version = fs.readFileSync("/proc/version", { encoding: "utf8" })
    if (version.toLowerCase().match(/ubuntu/)) document.body.classList.add("ubuntu");
  }
  else if (process.platform === "darwin") {
    document.body.classList.add("osx");
  }

  // what happens if you run on solaris?  not that anyone would, just 
  // curious.  also: f/o/n/bsd? hpux?

  // buffered resize. we err on the side of being slow (vs. lots of calls)
  window._resize_timeout = null;
  window.addEventListener("resize", function (e) {
    // console.info( "publish resize" );
    PubSub.publish("resize", e);
    if (_resize_timeout) window.clearTimeout(_resize_timeout);
    _resize_timeout = window.setTimeout(resize_panes, RESIZE_TIMEOUT);
  });

  window.addEventListener("keydown", function (e) {

    if (e.ctrlKey) {

      // this key combination (ctrl+E) forces focus on the editor 
      // from anywhere else in the application
      if (e.keyCode === 69) {
        e.stopPropagation();
        e.preventDefault();
        shell.focus();
      }

      // we are intercepting ctrl+space for command palette
      if (e.keyCode === 0x20) {
        e.stopPropagation();
        e.preventDefault();

        // ...but not using it yet...
      }
    }
  });

  // we cache this value.  FIXME: settings should cache?
  function_tips = !Settings["disable.function.tips"];

  // we don't need to update this, but it will set listeners
  update_spinner();

  // see "exec_function".  args is [callback, data]
  PubSub.subscribe("exec_complete", function (channel, args) {
    var func = args[0];
    var data = args[1];
    func.call(this, data);
  });

  // settings are broadcast
  PubSub.subscribe(Constants.SETTINGS_CHANGE, function (channel, obj) {
    switch (obj.key) {

      case "user.stylesheet":
        update_user_stylesheet();
        break;

      case "line.wrapping":
        shell.setOption("lineWrapping", obj.val);
        break;

      case "disable.function.tips":
        function_tips = !obj.val;
        break;

      //		case "graphics.target":
      //			R.internal( `dev.set(${ graphics_devices[obj.val].device_number })`)
      //			break;			

      default:
      // console.info( "UNHANDLED", obj );
    }

    // mirror to the R env; FIXME: unify with startup code
    {
      var cmds = [];
      var type = typeof obj.val;
      var val = obj.val;
      var key = obj.key;
      if (Array.isArray(val)) {
        let json = JSON.stringify(val);
        val = "c(" + json.substr(1, json.length - 2) + ")";
      }
      else if (type === "object") { // FIXME: need a recursive method here
        if (null === val) val = "NULL";
        else {
          var elts = Object.keys(val).map(function (k2) {
            let v2 = val[k2];
            if (typeof v2 === "string") return `${k2}='${v2}'`;
            return `${k2}=${v2}`;
          });
          val = `list(${elts.join(", ")})`;
        }
      }
      else if (type === "string") {
        val = `"${Utils.escape_backslashes(val, 2)}"`;
      }
      else if (type === "boolean") {
        val = val ? "T" : "F";
      }
      else {
        console.info("??", type, obj);
      }
      cmds.push(`assign( "${key}", ${val}, envir=.js.client.options.env )`);
      R.internal(cmds);
    }

  });

  var init_status = false;

  ensure_r_home().then(function (rslt) {

    return init_r(rslt);

  }).then(function (rslt) {

    init_status = rslt;

    var core = {
      R: R,
      Settings: Settings,
      Hooks: Hooks,
      Constants: Constants,
      Utils: Utils,
      Packages: PackageManager.packages,
      Messages: Messages
    };

    return PackageManager.load_packages(path.join(__dirname, "packages"), core);

  }).then(function () {

    update_user_stylesheet();

  }).then(function () {

    // last bit of startup displays the screen (fades in via opacity transition)

    resize_panes();

    // you don't have to be so fastidious about this, it's not like
    // we adjust the opacity that often -- or ever, after init

    var layout = document.getElementById("shell-layout");
    layout.addEventListener('transitionend', function listener() {
      layout.removeEventListener('transitionend', listener);
      layout.setAttribute("style", "opacity: 1; ");
    });

    layout.setAttribute("style", "transition: .25s; opacity: 1; ");

    // then (on success) load startup file, if any

    var oncomplete = function () {
      if (!init_status || !init_status.prompt) return;
      shell.focus();
      shell.prompt(init_status.prompt);

      /*
      setImmediate( function(){
          open_test_area();
      });
      */
    }

    if (init_status && init_status.success) {
      var startup = Settings["startup.file"];
      if (startup) {
        PubSub.publish(Constants.SHELL_MESSAGE, [
          `${Messages.LOADING_STARTUP_FILE}: "${Utils.escape_backslashes(startup, 2)}"\n\n`, "shell-system-information"]);
        startup = Utils.escape_backslashes(startup, 2);
        var cmd = `source(\"${startup}\")`;
        R.exec(cmd).then(function () {
          oncomplete();
        }).catch(function () {
          oncomplete();
        });
      }
      else oncomplete();
    }

  });

});

function resize_panes() {

  update_spinner();
  set_console_width();

  // FIXME: this needs to move somwhere else, or get encapsulated
  let nodes = document.querySelectorAll("[layout-event-handler]")
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].dispatchEvent(new CustomEvent('layout'));
  }

};

function quit() {

  global.__quit = true;
  remote.getCurrentWindow().close();

}

function save_environment(quiet) {
  var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  var data = Utils.escape_backslashes(path.join(home, RDATA), 2);
  //var cmd = `invisible( save.image('${data}'))`;
  var cmd = `save.image('${data}')`;

  console.info(cmd);
  R.exec(cmd).then(function () {
    if (!quiet) {
      PubSub.publish(Constants.SHELL_MESSAGE, [Messages.SAVED_OK + "\n", "shell-system-information"]);
    }
  });

}

var templates = new MenuTemplate(path.join(__dirname, "data", "menus.json"));

Menu.setApplicationMenu(templates.application);

//
// FIXME: use a hook, so we can indicate if we have consumed 
// the message in a package
//
PubSub.subscribe("menu-click", function () {

  var data = arguments[1];

  switch (data.message) {
    case "developer-tools":
      if (data.focusedWindow) data.focusedWindow.toggleDevTools();
      break;
    case "full-screen":
      if (data.focusedWindow) data.focusedWindow.setFullScreen(
        !data.focusedWindow.isFullScreen());
      break;
    case "reload":
      if (data.focusedWindow) data.focusedWindow.reload();
      break;
    case "watch":
      open_watch();
      break;
    case "locals":
      open_locals();
      break;
    case "clear-shell":
      shell.clear();
      update_spinner();
      break;
    case "preferences":
      toggle_shell_preferences();
      break;
    case "about":
      about_dialog();
      break;
    case "learn-more":
      electron.shell.openExternal(LEARN_MORE_URL);
      break;
    case "close":
      quit();
      break;
    case "history":
      open_history_panel();
      break;
    case "save-environment":
      save_environment();
      break;
    case "save-history":
      save_history();
      break;
    case "save-shell":
      save_shell();
      break;
    default:
      console.warn("Unhandled menu command", data.item.message);
      break;
  }
});

/**
 * context menu for details pane
 */
var details_context_menu = Menu.buildFromTemplate([
  { label: 'Copy', role: 'copy' },
  {
    label: 'Select All', click: function (e) {
      if (details_context_menu.$target) details_context_menu.$target.selectAll();
    }
  }
]);

/**
 * context menu for locals.  this has changed slightly because
 * menu labels can't change dynamically; therefore we construct
 * it on the fly.
 * /
var locals_context_menu_template = [
    { label: 'Field', enabled: false },
    { type: 'separator' },
	{ 
		label: 'Add watch', click: function(e){
			var field = locals_context_menu.target.name;
			add_watch( field, undefined, undefined, true );
		}
	}
];

// FIXME: REMOVE (legacy)
var locals_context_menu = Menu.buildFromTemplate(locals_context_menu_template);
*/

/**
 * context menu for watches: delete
 */
var watches_context_menu = Menu.buildFromTemplate([
  {
    label: 'Remove watch', click: function (e) {
      var index = watches_context_menu.$index;
      remove_watch(index);
    }
  }
]);

/**
 * about dialog; shows versions of various components
 */
var about_dialog = function () {
  dialog.showMessageBox(remote.getCurrentWindow(), {
    type: "info",
    title: "ConstructR Shell",
    buttons: ["OK"],
    message: `ConstructR Shell ${versions['constructr']}`,
    detail: versions.R + "\n"
    + `jsClientLib ${versions.jsClientLib}\n`
    + `ControlR ${versions.controlr}\n`
    + `Node ${process.versions.node}\n`
    + `Chrome ${process.versions.chrome}\n`
    + `Electron ${process.versions.electron}`
  });
};

// plugin support (in progress)

var Hooks = {

  installed: {},

  install: function (hook, func, name) {
    if (!hook || !func) throw ("hook and func required");
    if (!this.installed[hook]) this.installed[hook] = [];
    this.installed[hook].push({
      func: func, name: name
    });
  },

  remove: function (hook, func_or_name) {
    if (!hook || !this.installed[hook] || !func_or_name) return false;
    for (var i = 0; i < this.installed[hook].length; i++) {
      if (this.installed[hook][i].func === func_or_name
        || this.installed[hook][i].name === func_or_name) {
        delete this.installed[hook][i];
        return true;
      }
    }
    return false;
  },

	/** 
	 * we want to support the possibility of hooks returning 
	 * values.  using map here will return an array of results,
	 * allowing the caller to make the decision (use first, use
	 * all, &c).
	 * 
	 * FIXME: why not use filter()?
	 */
  exec: function (hook) {
    if (!this.installed[hook]) return false;
    var args = arguments;
    return this.installed[hook].map(function (inst) {
      if (inst.func) return inst.func.apply(this, args);
      return null;
    }, this);
  }

};
