#!/usr/bin/env node
var pkg = require('../package.json');
var execFile = require('child_process').execFile;
var fs = require('fs');
var path = require('path');
var program = require('commander');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var util = require('util');
var root = path.join(__dirname, "..");

//parse args
program
  .version(pkg.version)
  .usage('[options]')
  .option('-d, --debug', 'Enable debugging')
  .option('-h, --host [ip]', 'Host [ip] to bind on', "0.0.0.0")
  .option('-p, --port [number]', 'Port [number] to listen on', 3240)
  .option('-w, --wipe', 'Wipe all stored data (application meta data and repositories)')
  .parse(process.argv);

var DB_DIR = path.join(root, 'database');
var db = require('level')(DB_DIR, { valueEncoding: 'json' });

var REPOS_DIR = path.join(root, 'repos');
mkdirp.sync(REPOS_DIR);

if(program.wipe) {
  rimraf.sync(DB_DIR);
  rimraf.sync(REPOS_DIR);
  info("Wiped all deployment data");
  process.exit(1);
}

//start forever server
var procs = {};

//start webhook server
var url = require('url');
require("http").createServer(function(req, res) {
  var u = url.parse(req.url);
  var entry = u.query;

  if(!entry) {
    res.writeHead(400);
    res.end("no entry file");
    return;
  }

  var json = "";
  req.on("data", function(buff) {
    json += buff;
  });
  req.on("end", function() {
    try {
      var hook = JSON.parse(json);
      if(!hook.repository)
        throw "missing 'repository'";
      var name = hook.repository.name;
      var app = {
        name: name,
        dir: path.join(REPOS_DIR, name),
        entry: entry,
        git: hook.repository.url
      };
      db.put(name, app);
      app.proc = procs[name];
      onHook(app);
      res.writeHead(200);
    } catch(e) {
      error("invalid: " + e);
      res.writeHead(400);
    }
    res.end();
  });
}).listen(program.port, program.host, function() {
  info("Gitlab deployment server bound to %s:%s...", program.host, program.port);
});

//reload existing apps
db.createReadStream().on('data', function (data) {
  var app = data.value;
  onHook(app);
});

function onHook(app) {
  stop(app, function(err) {
    if(err) return error(err);
    reinstall(app, function(err) {
      if(err) return error(err);
      start(app, function(err) {
        if(err) return error(err);
      });
    });
  });
}

function reinstall(app, next) {

  function install() {
    exec("npm", ["install"], { cwd: app.dir }).on("exit", function(code) {
      if(code !== 0) return next("npm install error");
      next();
    });
  }

  if(fs.existsSync(app.dir)) {
    exec("git", ["fetch", "--all"], { cwd: app.dir }).on("exit", function(code) {
      if(code !== 0) return next("git fetch error");
      exec("git", ["reset","--hard","origin/master"], { cwd: app.dir }).on("exit", function(code) {
        if(code !== 0) return next("git reset error");
        install();
      });
    });
  } else {
    exec("git", ["clone", app.git, app.dir]).on("exit", function(code) {
      if(code !== 0) return next("git clone error");
      install();
    });
  }
}

function start(app, next) {
  var proc = app.proc = procs[app.name] = exec("node", [app.entry], { cwd: app.dir });

  proc.on("error", function(err) {
    error("app error: %s: %s", app.name, err);
  });

  proc.on("exit", function(code) {
    app.proc = procs[app.name] = null;
  });

  proc.stdout.on('data', function(buff) {
    log(">> application log: %s:", app.name, buff.toString());
  });
  proc.stderr.on('data', function(buff) {
    error(">> application error: %s:", app.name, buff.toString());
  });

  next(null);
}

function stop(app, next) {
  if(!app.proc)
    return next(null);
  app.proc.kill('SIGHUP');
  app.proc.on("exit", function() {
    next(null);
  });
}

function exec(file, args, opts) {
  var extra = "";
  if(opts)
    if(opts.cwd)
      extra = util.format(" (from '%s')", opts.cwd);
  var str = file + " " + args.join(" ");
  log(">> start '%s'%s", str, extra);
  var proc = execFile.apply(null, arguments);
  proc.on("exit", function(code) {
    log(">> stop '%s' with: %s", str, code || '<no-code>');
  });
  return proc;
}

function log() {
  if(!program.debug) return;
  console.log.apply(console, arguments);
}

function info() {
  console.info.apply(console, arguments);
}

function error() {
  //TODO email or someting...
  console.error.apply(console, arguments);
}

