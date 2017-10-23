(function (w, d) {

    var $frame = `
	<html>
	  <head>
	  </head>
	  <script>
        (function (w, d) {

            function inspectIncomingData(e) {
                if (typeof (e.dthid) === 'undefined') return false;
                if (typeof (e.args) === 'undefined') return false;
                if (typeof (e.func) === 'undefined') return false;
                return true;
            }

            function inspectIncomingScripts(e) {
                return (typeof (e.scripts) === 'undefined') ? false : true;
            }

            function importScript(a) {
                var script = document.createElement('script');
                script.src = a;
                script.setAttribute('type', 'text/javascript');
                document.head.appendChild(script);
            }

            function importScripts(a) {
                if (typeof (a) === 'object')
                    for (var i in a)
                        importScript(a[i]);
                else importScript(a);
            }

            function onMessage(e) {
                if (inspectIncomingData(e.data)) {
                    window.parent.postMessage({ dthid: e.data.dthid, data: (eval('(function(e){return e;})(' + e.data.func + ')')).apply(null, e.data.args) }, '*')
                } else {
                    if (inspectIncomingScripts(e.data))
                        importScripts(e.data.scripts)
                }
            }

            if (typeof (window.attachEvent) != 'undefined')
                window.attachEvent('onmessage', onMessage);
            else window.addEventListener('message', onMessage);

        })(window, document);
	  </script>
	</html>`;
	
    class SimpleWorkerPipe {
        constructor(sw) {
            this.container = null;
            if (document.getElementById("swp") !== null) {
                this.container = d.getElementById('swp');
            } else {
                this.container = d.createElement('div');
                this.container.setAttribute('id', 'swp');
                this.container.setAttribute('style', 'display: none; position: absolute; top: 0; left: 0; width: 0px; height: 0px; z-index: -999999');
                d.body.appendChild(this.container);
            }
            this.sw = sw;
            this.frame = encodeURI($frame);
            this.workers = {};
        }
        createWorker(pid) {
            var worker = d.createElement('iframe');
            this.workers[pid] = worker;
            worker.setAttribute('node', pid);
            worker.setAttribute('style', 'border: 0; display: none');
            worker.src = 'data:text/html;charset=utf-8,' + this.frame;
            this.container.appendChild(worker);
            worker.onload = () => {
                this.sw.update(pid, worker.contentWindow);
            }
        }
        removeWorker(pid) {
            if (typeof (this.workers[pid]) != null) {
                this.container.removeChild(this.workers[pid]);
                delete this.workers[pid];
            }
        }

    }

    class MessageListener {

        constructor() {
            var a = this;
            this.events = {};
            w.addEventListener('message', function (e) {
                if (typeof (e.data) === 'object') {
                    if (!a.inspectIncomingData(e.data)) throw new Error("Unknown message " + e);
                    a.events[e.data.dthid](e.data.data);
                }
            })
        }
        inspectIncomingData(e) {
            if (typeof (e.dthid) === 'undefined') return false;
            if (typeof (e.data) === 'undefined') return false;
            return true;
        }
        addEvent(evtn, cb) {
            this.events[evtn] = cb;
        }

    }


    class SimpleWorker {
        constructor(pub) {
            this.workers = [];
            this.que = [];
            this.listener = new MessageListener();
            this.swp = new SimpleWorkerPipe(this);
        }
        dth(a) {
            if (a > 0) a = -Math.abs(a);
            a = 0xFFFFFFFF + a + 1;
            return a.toString(16).toUpperCase();
        }
        prepare(func) {
            if (typeof (func) !== 'function') throw new Error("Prepare must require a Thread(Function)");
            var args = [];
            if (arguments.length > 1)
                Array.prototype.push.apply(args, arguments);
            args = this.shiftN(args, 1);
            var pid = Object.keys(this.workers).length + 1;
            var dthid = this.dth(pid);
            var ss = this;
            this.swp.createWorker(dthid);
            this.workers[dthid] = {
                id: dthid,
                pipe: null,
                func: func,
                args: args,
                run: function (cb) {
                    if (this.pipe != null) {
                        ss.listener.addEvent(dthid, function (e) { return cb(e); });
                        this.pipe.postMessage({ dthid: this.id, func: (this.func).toString(), args: this.args }, '*');
                    }

                },
                importScripts: function (a) {
                    if (this.pipe != null)
                        this.pipe.postMessage({ scripts: a }, '*');
                    else {
                        var tick = 0;
                        var intt = setInterval(() => {
                            if (tick > 10) return clearInterval(intt);
                            if (this.pipe != null) {
                                clearInterval(intt);
                                this.pipe.postMessage({ scripts: a }, '*');
                            }
                            tick++;
                        }, 1000);
                    }
                }
            }
            return pid;
        }
        shiftN(args, n) {
            for (var i = 0; i < n; i++)
                args.shift();
            return args;
        }
        restore(pid, func) {
            pid = this.dth(pid);
            if (this.workers[pid] != null) {
                if (func != null) this.workers[pid].func = func;
                var args = [];
                if (arguments.length > 2) {
                    Array.prototype.push.apply(args, arguments);
                    args = this.shiftN(args, 2);
                    this.workers[pid].args = args;
                }
                return;
            }
            throw new Error("Thread 0x" + pid + " does not exist.");
        }
        importScript(pid, a) {
            pid = this.dth(pid);
            if (typeof (this.workers[pid]) != 'undefined') {
                this.workers[pid].importScripts(a);
            }
        }
        execute(pid, cb) {
            pid = this.dth(pid)
            if (typeof (cb) === 'function')
                if (typeof (this.workers[pid]) != 'undefined') {
                    if (this.workers[pid].pipe === null) {
                        var ticks = 0;
                        var intt = setInterval(() => {
                            if (ticks > 10) clearInterval(intt);
                            if (typeof (this.workers[pid]) === 'undefined') return clearInterval(intt);
                            if (this.workers[pid].pipe != null) {
                                clearInterval(intt);
                                this.workers[pid].run(cb);
                            }
                            ticks++;
                        }, 1000);
                    } else this.workers[pid].run(cb);
                } else throw new Error("Could not find worker 0x" + pid);
            else throw new Error("Execute requires a callback function");
        }
        update(pid, func) {
            if (typeof (this.workers[pid]) != 'undefined') {
                this.workers[pid].pipe = func;
            } else throw new Error("Could not update pipe " + pid);
        }
        kill(pid) {
            pid = this.dth(pid);
            if (typeof (this.workers[pid]) != null) {
                this.swp.removeWorker(pid);
                delete this.workers[pid];
                return;
            }
            throw new Error("")
        }
    }
	
	  w.SimpleWorker = SimpleWorker;

})(window, document);

