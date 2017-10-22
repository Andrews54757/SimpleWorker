/*
\| LegitSoulja | 2017
\| All Rights Reserved
\| Documentation: https://github.com/LegitSoulja/SimpleWorker
\|
\| License: Apache
\|
*/

(function (w, d) {

	var workers = {};
	var pipes = {};
	
	var $frame = `
	<html>
	  <script>
	    (function(w,d){
			if(typeof(window.attachEvent) != 'undefined') {
				window.attachEvent('onmessage', function(e){
					var func = eval('(function(e){return e;})('+e.data.func+')');
					window.parent.postMessage({
						dthid: e.data.dthid,
						data: func.apply(null, e.data.args)
					}, '*')
				})
			}else{
				window.addEventListener('message', function(e){
					var func = eval('(function(e){return e;})('+e.data.func+')');
					window.parent.postMessage({
						dthid: e.data.dthid,
						data: func.apply(null, e.data.args)
					}, '*')
				})
			}
	    })(window,document);
	  </script>
	</html>
	`;
	class SimpleWorkerPipe{
	  constructor(sw){
	    this.container = null;
	    if(document.getElementById("swp") !== null) {
	      this.container = d.getElementById('swp');
	    }else{
	      this.container = d.createElement('div');
	      this.container.setAttribute('id', 'swp');
	      this.container.setAttribute('style', 'display: none; position: absolute; top: 0; left: 0; width: 0px; height: 0px; z-index: -999999');
	      d.body.appendChild(this.container);
	    }
		this.sw = sw;
	  }
	  createWorker(pid){
	    var worker = d.createElement('iframe');
	    var content = $frame;
		worker.setAttribute('style', 'border: 0; display: none');
		worker.src = 'data:text/html;charset=utf-8,' + encodeURI(content);
		this.container.appendChild(worker);
		worker.onload = ()=>{
			this.sw.update(pid, worker.contentWindow);
		}
	  }
	  
	}
	
	class MessageListener {
		
		constructor(){
			var a = this;
			this.events = {};
			w.addEventListener('message', function(e){
				if(typeof(e.data) === 'object') {
					if(!a.inspectIncomingData(e.data)) throw new Error("Unknown message " + e);
					a.events[e.data.dthid](e.data.data);
				}
			})
		}
		inspectIncomingData(e){
			if(typeof(e.dthid) === 'undefined') return false;
			if(typeof(e.data) === 'undefined') return false;
			return true;
		}
		addEvent(evtn, cb){
			this.events[evtn] = cb;
		}
		
	}
	
	
	class SimpleWorker{
		constructor(pub){
			this.workers = [];
			this.que = [];
			this.listener = new MessageListener();
			this.swp = new SimpleWorkerPipe(this);
		}
		dth(a) {
		  if(a > 0) a = -Math.abs(a);
		  a = 0xFFFFFFFF + a + 1;
		  return a.toString(16).toUpperCase();
		}
		prepare(func){
			if(typeof(func) !== 'function') throw new Error()
			var args = [];
			if(arguments > 1)
				Array.prototype.push.apply(args, arguments);
			args.shift();
			var pid = Object.keys(this.workers).length + 1;
			var dthid = this.dth(pid);
			var ss = this;
			this.swp.createWorker(dthid);
			this.workers[dthid] = {
			  id: dthid,
			  pipe: null,
			  func: func,
			  args: args,
			  run: function(cb){
			    if(this.pipe != null) {
					ss.listener.addEvent(dthid, function(e){
						return cb(e);
					})
					var s = (this.func).toString();
					this.pipe.postMessage({dthid: this.id, func: s, args: this.args}, '*');
				}

			  }
			}
			
			console.log("New thread created " + dthid);
		}
		execute(pid, cb){
	      pid = this.dth(pid)
		  if(typeof(cb) === 'function')
		    if(typeof(this.workers[pid]) != 'undefined') {
				if(this.workers[pid].pipe === null) {
					var ticks = 0;
					var intt = setInterval(()=>{
						if(ticks > 10) clearInterval(intt);
						if(this.workers[pid].pipe != null) {
							clearInterval(intt);
							this.workers[pid].run(cb);
						}
						ticks++;
					}, 1000);
				}else this.workers[pid].run(cb);
			}else throw new Error("Could not find worker 0x" + pid)
		  else throw new Error("Execute requires a callback function");
		}
		update(pid, func){
		  if(typeof(this.workers[pid]) != 'undefined') {
		    this.workers[pid].pipe = func;
		  }else throw new Error("Could not update pipe " + pid);
		}
	}
	
	w.SimpleWorker = SimpleWorker;

})(window, document);
