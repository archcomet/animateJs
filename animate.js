(function () {
	'use strict';

	function isString(obj) {
		return  Object.prototype.toString.call(obj) === '[object String]';
	}

	var tasks = [],
		tasksToChange = [],
		lastTimeStamp = null;

	var scheduler = {

		add: function (task) {
			var idx = tasksToChange.indexOf(task);
			if (idx === -1) {
				tasksToChange.push(task);
			}
			task.requestState = STATE.STARTING;
			scheduler.scheduleNext();
		},

		remove: function (task) {
			var idx = tasksToChange.indexOf(task);
			if (idx === -1) {
				tasksToChange.push(task);
			}
			task.requestState = STATE.STOPPING;
		},

		updateStates: function() {
			for (var i = 0, n = tasksToChange.length; i < n; ++i) {
				var task = tasksToChange[i],
					idx = tasks.indexOf(task);

				switch(task.requestState) {
					case STATE.STARTING:
						if (idx === -1) {
							tasks.push(task);
						}
						task.state = STATE.STARTING;
						break;

					case STATE.STOPPING:
						if (idx !== -1) {
							tasks.splice(idx, 1);
						}
						task.state = STATE.STOPPING;
						break;
				}
			}

			tasksToChange.length = 0;
		},

		scheduleNext: function () {
			requestAnimationFrame(scheduler.step);
			if (!lastTimeStamp) {
				lastTimeStamp = performance.now();
			}
		},

		step: function () {
			var i, n,
				timeStamp = performance.now(),
				dt = timeStamp - lastTimeStamp;

			scheduler.updateStates();

			for (i = 0, n = tasks.length; i < n; ++i) {
				tasks[i].step(dt);
			}

			scheduler.updateStates();

			if (tasks.length > 0) {
				scheduler.scheduleNext();
				lastTimeStamp = timeStamp;
			}
			else {
				lastTimeStamp = null;
			}
		}
	};

	var STATE = {
		NONE: 0,
		STARTING: 1,
		WAITING: 2,
		RUNNING: 3,
		STOPPING: 4
	};

	function Task() {
		var beginFilters = [],
			doneFilters = [],
			progressFilters = [],
			task = this,
			elapsed = 0,
			delay = 0,
			delaySetting = 0,
			iterationSetting = 0,
			promise = {

				start: function () {
					scheduler.add(task);
					return promise;
				},

				stop: function () {
					scheduler.remove(task);
					return promise;
				},

				resume: function() {
					// todo
					return promise;
				},

				jump: function (ms) {
					// todo
					return promise;
				},

				delay: function (delayMs) {
					delaySetting = delayMs;
					return promise;
				},

				repeat: function (iterations) {
					iterationSetting = iterations;
					return promise;
				},

				begin: function(beginFilter) {
					beginFilters.push(beginFilter);
					return promise;
				},

				done: function (doneFilter) {
					doneFilters.push(doneFilter);
					return promise;
				},

				progress: function (progressFilter) {
					progressFilters.push(progressFilter);
					return promise;
				}
			};

		task.wake = function() {
			for (var i = 0, n = beginFilters.length; i < n; ++i) {
				beginFilters[i].apply(promise, arguments);
			}
		};

		task.notify = function() {
			for (var i = 0, n = progressFilters.length; i < n; ++i) {
				progressFilters[i].apply(promise, arguments);
			}
 		};

		task.resolve = function() {
			for (var i = 0, n = doneFilters.length; i < n; ++i) {
				doneFilters[i].apply(promise, arguments);
			}
		};

		task.promise = promise;

		task.step = function(dt) {

			if (task.state === STATE.STARTING) {
				delay = delaySetting;
				elapsed = 0;
				task.state = STATE.WAITING;
			}

			if (delay > 0) {
				delay -= dt;
				dt = delay >= 0 ? 0 : Math.abs(delay);
			}

			if (dt > 0) {
				if (task.state === STATE.WAITING) {
					task.begin();
					task.state = STATE.RUNNING;
				}
				elapsed += dt;
				task.update(elapsed);
			}
		};

		task.state = STATE.NONE;
		task.stateRequest = STATE.NONE;
	}


	function merge(target, source, destinationKey) {
		if (source) {
			for (var key in source) {
				if (source.hasOwnProperty(key)) {
					target[key] = target[key] || {};
					target[key][destinationKey] = source[key];
				}
			}
		}
	}

	var floatRegExp = /^([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)(.*)/;

	function format(target, source) {
		var value, valueString, matches, prop;
		for (var key in target) {
			if (target.hasOwnProperty(key)) {

				prop = target[key];
				
				if (prop.from === undefined) {
					prop.from = source[key];
				}

				if (prop.to === undefined) {
					prop.to = source[key];
				}

				if (isString(prop.from)) {
					valueString = prop.from;
					value = parseFloat(valueString);

					if (!isNaN(value)) {
						matches = valueString.match(floatRegExp);
						prop.suffix = matches[3];
						prop.from = value;
					}
				}

				if (isString(prop.to)) {
					valueString = prop.to;
					value = parseFloat(valueString);

					if (!isNaN(value)) {
						matches = valueString.match(floatRegExp);
						prop.suffix = matches[3];
						prop.to = value;
					}
				}
				
				prop.change = prop.to - prop.from;
			}
		}
	}

	var animate = function (target) {

		var task = new Task(),
			easingFn = animate.easing.LINEAR,
			durationSetting = 0,
			fromSetting = null,
			toSetting = null,
			props,
			promise = task.promise;

		task.begin = function() {
			props = {};
			merge(props, fromSetting, 'from');
			merge(props, toSetting, 'to');
			format(props, target);
			task.wake(target);
		};

		task.update = function(elapsed) {
			var t, b, c, d, v, r = 0;

			t = elapsed;
			d = durationSetting;

			if (t > d) {
				t = d;
				r = t-d;
			}

			var key, prop;
			for (key in props) {
				if (props.hasOwnProperty(key)) {
					prop = props[key];
					b = prop.from;
					c = prop.change;
					v = easingFn(t, b, c, d);
					target[key] = prop.suffix ? v + prop.suffix : v;
				}
			}

			task.notify(target, elapsed, d);

			if (t === d) {
				scheduler.remove(task);
				task.resolve(target);
			}

			return r;
		};

		promise.from = function (descriptor, duration, doneFilter) {
			fromSetting = descriptor;
			durationSetting = duration;
			if (doneFilter) {
				promise.done(doneFilter);
			}
			return promise;
		};

		promise.to = function (descriptor, duration, doneFilter) {
			toSetting = descriptor;
			durationSetting = duration;
			if (doneFilter) {
				promise.done(doneFilter);
			}
			return promise;
		};

		promise.duration = function(duration) {
			durationSetting = duration;
		};

		promise.using = function (easing) {
			easingFn = easing;
			return promise;
		};

		return promise;
	};

	animate.sequence = function (subordinate /* , ..., subordinateN */) {
		// todo
		var t = new Task();
		return t.promise;
	};

	animate.group = function (subordinate /* , ..., subordinateN */) {
		// todo
		var t = new Task();
		return t.promise;
	};

	animate.easing = {

		mix: function (a, b, u) {
			// todo
		},

		crossFade: function (a, b, u) {
			// todo
		},

		smoothStartN: function (n) {
			// todo
		},

		smoothStopN: function (n) {
			// todo
		},

		smoothStepN: function (n) {
			// todo
		},

		flip: function (a) {
			// todo
		},

		scale: function () {
			// todo
		},

		reverseScale: function () {
			// todo
		},

		LINEAR: function (t, b, c, d) {
			return c * (t / d) + b;
		},

		SMOOTH_START2: function (t, b, c, d) {
			t /= d;
			return c * t * t + b;
		},

		SMOOTH_START3: function (t, b, c, d) {
			t /= d;
			return c * t * t * t + b;
		},

		SMOOTH_START4: function (t, b, c, d) {
			t /= d;
			return c * t * t * t * t + b;
		},

		SMOOTH_START5: function (t, b, c, d) {
			t /= d;
			return c * t * t * t * t * t + b;
		},

		SMOOTH_STOP2: function () {
			// todo
		},

		SMOOTH_STOP3: function () {
			// todo
		},

		SMOOTH_STOP4: function () {
			// todo
		},

		SMOOTH_STOP5: function () {
			// todo
		},

		SMOOTH_STEP2: function () {
			// todo
		},

		SMOOTH_STEP3: function () {
			// todo
		},

		SMOOTH_STEP4: function () {
			// todo
		},

		SMOOTH_STEP5: function () {
			// todo
		},

		ELASTIC_START: function () {
			// todo
		},

		ELASTIC_STOP: function () {
			// todo
		},

		ELASTIC_STEP: function () {
			// todo
		},

		BOUNCE_START: function () {
			// todo
		},

		BOUNCE_STOP: function () {
			// todo
		},

		BOUNCE_STEP: function () {
			// todo
		}

	};

	window.animate = animate;

	if (typeof define === "function" && define.amd) {
		define('animate', function () {
			return animate;
		});
	}

}());