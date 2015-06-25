(function () {
	'use strict';

	function isString(obj) {
		return  Object.prototype.toString.call(obj) === '[object String]';
	}

	var tasks = [],
		tasksToRemove = [],
		lastTimeStamp = null;

	var scheduler = {

		add: function (task) {
			var idx = tasks.indexOf(task);
			if (idx === -1) {
				tasks.push(task);
				if (!lastTimeStamp) {
					lastTimeStamp = performance.now();
				}
			}
			scheduler.scheduleNext();
		},

		remove: function (task) {
			var idx = tasksToRemove.indexOf(task);
			if (idx === -1) {
				tasksToRemove.push(task);
			}
		},

		drain: function() {
			for (var i = 0, n = tasksToRemove.length; i < n; ++i) {
				var idx = tasks.indexOf(tasksToRemove[i]);
				if (idx !== -1) {
					tasks.splice(idx, 1);
				}
			}
			tasksToRemove.length = 0;
		},

		scheduleNext: function () {
			if (tasks.length) {
				requestAnimationFrame(scheduler.step);
			}
			else {
				lastTimeStamp = null;
			}
		},

		step: function () {
			var i = 0,
				n = tasks.length,
				timeStamp = performance.now(),
				dt = timeStamp - lastTimeStamp;

			scheduler.drain();

			for (; i < n; ++i) {
				tasks[i].step(dt);
			}

			scheduler.drain();
			scheduler.scheduleNext();

			lastTimeStamp = timeStamp;
		}
	};

	function Task() {
		var doneFilters = [],
			progressFilters = [],
			started = false,
			task = this,
			elapsed = 0,
			delay = 0,

			delaySetting = 0,
			iterationSetting = 0,

			promise = {

				start: function () {
					scheduler.add(task);
					elapsed = 0;
					delay = delaySetting;
					started = false;

					// todo state

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

				done: function (doneFilter) {
					doneFilters.push(doneFilter);
					return promise;
				},

				progress: function (progressFilter) {
					progressFilters.push(progressFilter);
					return promise;
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
			if (delay > 0) {
				delay -= dt;
				dt = delay >= 0 ? 0 : Math.abs(delay);
			}

			if (dt > 0) {
				if (!started) {
					started = true;
					task.begin();
				}
				elapsed += dt;
				task.update(elapsed);
			}
		};
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
		var value, valueString, matches;
		for (var key in target) {
			if (target.hasOwnProperty(key)) {
				if (target[key].from === undefined) {
					target[key].from = source[key];
				}

				if (target[key].to === undefined) {
					target[key].to = source[key];
				}

				if (isString(target[key].from)) {
					valueString = target[key].from;
					value = parseFloat(valueString);

					if (!isNaN(value)) {
						matches = valueString.match(floatRegExp);
						target[key].suffix = matches[3];
						target[key].from = value;
					}
				}

				if (isString(target[key].to)) {
					valueString = target[key].to;
					value = parseFloat(valueString);

					if (!isNaN(value)) {
						matches = valueString.match(floatRegExp);
						target[key].suffix = matches[3];
						target[key].to = value;
					}
				}
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
		};

		task.update = function(elapsed) {
			//todo
			console.log('update', elapsed);
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