Gitlab Deployment Server
==============

Automatic deployment server listening for Gitlab Webhooks

## Usage

1. `npm install -g gitlab-deploy`
1. Run `gitlab-deploy --debug` on you `<hostname>` machine
1. Configure:
  1. Log into Gitlab
  1. Project `foo`
  1. Settings
    1. Deploy Keys
      * Add public key of `<hostname>` (or "+Enable" if already added)
    1. Web Hooks
      * Add `http://<hostname>:<port>?<foo-entry-file.js>` *(For example `http://10.1.0.247:3240?server.js`)*
      * Click "Test Hook"
1. `gitlab-deploy` should receive the POST and begin deploying `foo`
1. Confirm `foo-entry-file.js` is running
1. Rerun `gitlab-deploy` with `&` or `nohup`

## Help

```
gitlab-deploy --help
```
```
  Usage: gitlab-deploy [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -d, --debug          Enable logs and application stdout
    -h, --host [ip]      Host [ip] to bind on
    -p, --port [number]  Port [number] to listen on
    -w, --wipe           Wipe all stored data (application meta data and repositories)
```

### Todo

* Make this work with Git**Hub** web hooks
* Non-node applications
* Logging

