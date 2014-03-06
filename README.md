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
1. Rerun `gitlab-deploy --file &` to log to file and then place process in background

## Help

```
gitlab-deploy --help
```
```
  Usage: server.js [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -f, --file           Write to log.txt and err.txt instead of stdouterr
    -h, --host [ip]      Host [ip] to bind on
    -p, --port [number]  Port [number] to listen on
    --wipe-app [app]     Wipe one application
    --wipe-all           Wipe everything
```

### Todo

* Make this work with GitHub web hooks
* Non-node applications

#### MIT License

Copyright © 2014 Jaime Pillora &lt;dev@jpillora.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


