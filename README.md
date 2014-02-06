Gitlab Deployment Server
==============

Automatic deployment server listening for Gitlab Webhooks

## Quick Usage

1. `npm install -g gitlab-deploy`
1. `gitlab-deploy`
1. Setup Web Hook:
  1. Log into Gitlab 
  1. Project `foo`
  1. Settings
  1. Web Hooks
  1. Add `http://<hostname>:<port>?<foo-entry-file.js>` *(For example `http://10.1.0.247:3240?server.js`)*

## Help

`gitlab-deploy --help`

```
  Usage: gitlab-deploy [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -d, --debug          Enable debugging
    -h, --host [ip]      Host [ip] to bind on
    -p, --port [number]  Port [number] to listen on
    -w, --wipe           Wipe all stored data (application meta data and repositories)
```

### Todo

* Make this work with Git**Hub** web hooks
* Non-node applications
* Logging

