#!/usr/bin/env node
var pkg = require('../package.json');
var exec = require('child_process').execFile;
var fs = require('fs');
var path = require('path');
var program = require('commander');
var mkdirp = require('mkdirp');
var util = require('util');
var forever = require('forever');
var foreverBin = path.join(__dirname, "node_modules", "forever", "bin", "forever");

//parse args
program
  .version(pkg.version)
  .usage('config')
  .option('-d, --debug', 'Enable debugging')
  .parse(process.argv);


var configFile = program.args[0] || pkg.name+".json";
var configPath = path.resolve(configFile);
var data = null;

if(!fs.existsSync(configPath))
  exit("Configuration file '%s' not found", configPath);

var tasks;
try {
  tasks = JSON.parse(fs.readFileSync(configPath).toString());
} catch(e) {
  exit("Configuration file '%s' is not valid JSON (%se)", configPath, e.message);
}

var REPOS_DIR = path.join(__dirname, '..', 'repos');
mkdirp.sync(REPOS_DIR);

var t = {
  "*": util.format("git clone %g %s/%r || cd %r && git pull", REPOS_DIR)
};

for(var n in tasks) {
  var cmds = tasks[n];
  if(typeof cmds === "string")
    cmds = tasks[n] = [cmds];
  t[n] = cmds.map(function(script) {
    script = util.format("%s/%r/%s", REPOS_DIR, script);
    return ["stop","start"].map(function(action) {
      return util.format("%s %s %s;", foreverBin, action, script);
    }).join(";");
  });
}

var gitlabhook = require('gitlabhook');
var gitlab = gitlabhook({
  configFile: null,
  configPathes: [],
  host: "0.0.0.0",
  port: 3240,
  tasks: t,
  logger: {
    log:function(s) {
      if(program.debug) console.log(s);
    },
    error:function(s){
      if(program.debug) console.error(s);
    }
  }
});
gitlab.listen();

function exit() {
  console.error.apply(console, arguments);
  process.exit(1);
}