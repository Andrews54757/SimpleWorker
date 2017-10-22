# SimpleWorker

##### Todo
- [ ] Worker builder, instead of the worker building (Increase speed of workers)
- [ ] Shared/Dedicated workers.
- [ ] Ability to extend/share worker threads (Worker Builder).
- [ ] Implement for/foreach threading, (Basically an implemented function within the worker).
> When using for/foreach threading you still use for/foreach in your thread function. It'll just be replaced with a function the Worker can read that'll run for/each in a new thread. **This may or moy not be a feature, but for testing purposes only**.

###### Future goals
- Take advantage of iframe
> IFrames runs in another thread (Same as tabs). For more advanced capabilities, the goal is to convert an iframe into a worker, in which allows more functionality than a normal JavaScript Worker. IFrame could be the key to everyones dream.


#### Pseudo Code

```js
	var sw = new SimpleWorker();
	
	var pid = sw.prepare(function(w,h){
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		canvas.width = w;
		canvas.height = h;
		ctx.fillStyle = 'red';
		ctx.fillRect(0,0,w,h);
		ctx.fill();
		var data = ctx.getImageData(0,0,w,h);
	  return data.data;
	}, 500, 500)
	sw.execute(pid, function(e){
		console.log('finished in ' + (((new Date()).getSeconds() - start.getSeconds()) / 1000) + "s");
		console.log(arguments);
	})
	
```
