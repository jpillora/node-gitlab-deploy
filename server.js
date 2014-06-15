#!/usr/bin/env node
var pkg = require('./package.json');
var execFile = require('child_process').execFile;
var fork = require('child_process').fork;
var fs = require('fs');
var path = require('path');
var program = require('commander');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var util = require('util');

//parse args
program
  .version(pkg.version)
  .usage('[options]')
  .option('-f, --file [file]', 'Write to [file] instead of std out/err (defaults to ./deploy.txt)')
  .option('-h, --host [ip]', 'Host [ip] to bind on', "0.0.0.0")
  .option('-p, --port [number]', 'Port [number] to listen on', 3240)
  .option('--clean-install', 'Delete old "node_modules" before "npm install"ing')
  .option('--wipe-app [app]', 'Wipe one application')
  .option('--wipe-all', 'Wipe everything')
  .parse(process.argv);

//apply default
if(program.file === true)
  program.file = './deploy.txt';

//logging
require('logbook').configure({
  console: {
    log: !program.file,
    err: !program.file,
    timestamps: true,
    typestamps: true
  },
  file: {
    log: !!program.file,
    err: !!program.file,
    logPath: program.file,
    errPath: program.file,
    timestamps: true,
    typestamps: false
  }
});

var DB_DIR = path.join(__dirname, 'database');
var db = require('level')(DB_DIR, { valueEncoding: 'json' });

var REPOS_DIR = path.join(__dirname, 'repos');
mkdirp.sync(REPOS_DIR);

if(program.wipeApp) {
  var app = program.wipeApp;
  db.del(app);
  rimraf.sync(path.join(REPOS_DIR, app));
  info("Wiped '%s'", app);
  process.exit(1);
} else if(program.wipeAll) {
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

    if(program.cleanInstall)
      rimraf.sync(path.join(app.dir, 'node_modules'));

    exec("npm", ["install"], { cwd: app.dir }, function(err) {
      if(err) return next("npm install error: " + err);
      next();
    });
  }

  if(fs.existsSync(app.dir)) {
    exec("git", ["fetch", "--all"], { cwd: app.dir }, function(err) {
      if(err) return next("git fetch error: " + err);
      exec("git", ["reset","--hard","origin/master"], { cwd: app.dir }, function(err) {
        if(err) return next("git reset error: " + err);
        install();
      });
    });
  } else {
    exec("git", ["clone", app.git, app.dir], function(err) {
      if(err) return next("git clone error: " + err);
      install();
    });
  }
}

function start(app, next) {

  log("[ gitlab-deploy ] starting app '%s'", app.name);
  var proc = app.proc = procs[app.name] = fork(app.entry, {
    cwd: app.dir,
    silent: true
  });

  proc.stdout.on('data', function(buff) {
    log("[ %s ] %s", app.name, buff.toString().replace(/\n$/, ''));
  });
  proc.stderr.on('data', function(buff) {
    error("[ %s ] %s", app.name, buff.toString().replace(/\n$/, ''));
  });

  proc.on("error", function(err) {
    error("app error: %s: %s", app.name, err);
  });

  proc.once("exit", function(code) {
    log("[ gitlab-deploy ] exited app '%s' with %s", app.name, code || 0);
    app.proc = procs[app.name] = null;
    // if(app.start) {
      // TOOD try to stop infinite instant restarts
      // app.crash = app.crash ? 1 : app.crash+1;
    //   log("[ gitlab-deploy ] restarting '%s'...", app.name);
    //   start(app, function(err) {});
    // }
  });

  next(null);
}

function stop(app, next) {
  if(!app.proc)
    return next(null);
  log("[ gitlab-deploy ] sent '%s' SIGHUP", app.name);
  app.proc.kill('SIGHUP');
  app.proc.once("exit", function() {
    next(null);
  });
}

function exec(file, args, opts) {
  var extra = "";
  if(opts)
    if(opts.cwd)
      extra = util.format(" (from '%s')", opts.cwd);
  var str = file + " " + args.join(" ");
  log("[ gitlab-deploy ] '%s' executing%s", str, extra);
  execFile.apply(null, arguments);
}

function log() {
  console.log.apply(console, arguments);
}

function info() {
  console.info.apply(console, arguments);
}

function error() {
  //TODO email or someting...
  console.error.apply(console, arguments);
}

