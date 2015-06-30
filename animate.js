
// todo composer
// todo arch
// todo bezier
// todo range mapping
// todo int vs float
// todo docs & examples

// i made a thing v1
//		purpose animations
// 		promises + state machine + magical timers = ???
// 		animation tree
// 		composites - decorators - leafs
// 		function blending
// 	future mad visions
// 		serializer / deserializer
// 		css3 animation transpiler ?!?


(function () {
	'use strict';

	function isString(obj) {
		return Object.prototype.toString.call(obj) === '[object String]';
	}

	var frameScheduled = false,
		lastTimeStamp = null,
		tasksToUpdate = [],
		tasksToRun = [];

	var scheduler = {

		// Marks a task for addition to the taskToRun array.
		// Additions are deferred so they don't happen during iteration over tasksToRun.
		add: function (task) {
			if (!task.scheduleNeedsUpdate) {
				task.scheduleNeedsUpdate = true;
				tasksToUpdate.push(task);
			}
			task.scheduleChangeType = 'add';
			scheduler.scheduleNext();
		},

		// Marks a task for removal to the taskToRun array.
		// Removals are deferred so they don't happen during iteration over tasksToRun.
		remove: function (task) {
			if (!task.scheduleNeedsUpdate) {
				task.scheduleNeedsUpdate = true;
				tasksToUpdate.push(task);
			}
			task.scheduleChangeType = 'remove';
			scheduler.scheduleNext();
		},

		// Schedules the next animation frame
		scheduleNext: function (timeStamp) {
			if (!frameScheduled) {
				frameScheduled = true;
				lastTimeStamp = timeStamp || performance.now();
				window.requestAnimationFrame(scheduler.frame);
			}
		},

		// Animation frame callback. Updates tasks and executes task steps.
		frame: function (timeStamp) {

			frameScheduled = false;

			scheduler.updateSchedule();
			scheduler.stepTasks(timeStamp - lastTimeStamp);
			scheduler.updateSchedule();

			if (tasksToRun.length > 0) {
				scheduler.scheduleNext(timeStamp);
			}
		},

		// Steps each task that is running
		stepTasks: function (dt) {
			var i = 0,
				n = tasksToRun.length;

			for (; i < n; ++i) {
				tasksToRun[i].step(dt);
			}
		},

		// Adds/removes tasks from tasksToRun 
		updateSchedule: function () {

			var task, idx,
				i = 0,
				n = tasksToUpdate.length;

			for (; i < n; ++i) {
				task = tasksToUpdate[i];
				idx = tasksToRun.indexOf(task);

				if (task.scheduleChangeType === 'add') {
					if (idx === -1) {
						tasksToRun.push(task);
					}
				}

				else if (idx !== -1) {
					tasksToRun.splice(idx, 1);
				}

				task.scheduleNeedsUpdate = false;
			}

			tasksToUpdate.length = 0;
		}
	};

	// Tasks states
	var STATE = {

		// Initial state
		NONE: 'none',

		// Task has been executed, but is waiting due to delay setting
		WAITING: 'waiting',

		// Task has been executed, and is currently running
		RUNNING: 'running',

		// Task has been paused
		PAUSED: 'paused',

		// Task has completed
		DONE: 'done'
	};

	function Task() {

		var task = this,
			beginFilters = [],
			doneFilters = [],
			progressFilters = [],
			iterationFilters = [],
			elapsed = 0,
			duration = Infinity,
			delaySetting = 0,
			iterations = 0,
			iterationCount = 0,
			iterationSetting = 0,
			notifications = true,

			promise = {

				//  Controls

				start: function (timeStamp) {
					task.updateStart(timeStamp);
					return promise;
				},

				stop: function () {
					task.updateStop();
					return promise;
				},

				jump: function (timeStamp) {
					task.updateJump(timeStamp);
					return promise;
				},

				// Settings

				delay: function (delayMs) {
					delaySetting = delayMs;
					return promise;
				},

				repeat: function (iterations) {
					iterationSetting = iterations;
					return promise;
				},

				// Filters

				begin: function (beginFilter) {
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
				},

				iteration: function (iterationFilter) {
					iterationFilters.push(iterationFilter);
					return promise;
				},

				// Step

				step: function (dt) {
					return task.step(dt);
				},

				// Getters

				getState: function () {
					return task.state;
				},

				getElapsed: function () {
					return elapsed;
				},

				getDelay: function () {
					return delaySetting;
				},

				getDuration: function (withDelay) {
					return withDelay === true ? delaySetting + duration : duration;
				}

			};

		task.promise = promise;

		task.state = STATE.NONE;

		task.scheduleChangeType = 'add';

		task.scheduleNeedsUpdate = false;

		task.getDuration = function () {
			return duration;
		};

		task.setDuration = function (newDuration) {
			if (newDuration <= 0) {
				newDuration = 1;
			}
			duration = newDuration;
		};

		task.notifyBegin = function () {
			if (iterations === 0) {
				task.onBegin && task.onBegin();

				if (notifications) {
					for (var i = 0, n = beginFilters.length; i < n; ++i) {
						beginFilters[i].call(promise, promise);
					}
				}
			}
		};

		task.notifyIteration = function () {
			if (iterations > 0) {
				task.onIteration && task.onIteration();

				if (notifications) {
					for (var i = 0, n = iterationFilters.length; i < n; ++i) {
						iterationFilters[i].call(promise, promise, iterations);
					}
				}
			}
		};

		task.notifyProgress = function (dt, elapsed, duration) {
			task.onProgress && task.onProgress(dt, elapsed, duration);

			if (notifications) {
				for (var i = 0, n = progressFilters.length; i < n; ++i) {
					progressFilters[i].call(promise, promise, dt, elapsed, duration);
				}
			}
		};

		task.notifyDone = function () {
			task.onDone && task.onDone();

			if (notifications) {
				for (var i = 0, n = doneFilters.length; i < n; ++i) {
					doneFilters[i].call(promise, promise);
				}
			}
		};

		task.updateStart = function (timeStamp) {

			if (timeStamp !== undefined || task.state !== STATE.PAUSED) {
				task.setTimeStamp(timeStamp || 0, 0);
				task.state = STATE.WAITING;
			}

			scheduler.add(task);
		};

		task.updateJump = function (timeStamp) {

			notifications = (
				task.state !== STATE.WAITING &&
				task.state !== STATE.RUNNING
			);

			task.state = STATE.WAITING;
			task.setTimeStamp(0, 0);
			task.step(timeStamp);

			if (notifications) {
				task.state = STATE.PAUSED;
			}

			notifications = true;
		};

		task.updateStop = function () {

			if (task.state === STATE.WAITING || task.state === STATE.RUNNING) {
				task.state = STATE.PAUSED;
			}
			else {
				task.state = STATE.DONE;
			}

			scheduler.remove(task);
		};


		task.setTimeStamp = function (timeStamp, iteration) {
			iterations = iteration;
			iterationCount = iterationSetting;
			elapsed = -delaySetting + timeStamp;
		};

		task.step = function (dt) {

			var remainder = -1;

			// Preparing the task ...
			if (task.state === STATE.NONE || task.state === STATE.DONE) {
				task.setTimeStamp(0, iterations);
				task.state = STATE.WAITING;
			}

			elapsed += dt;

			// Starting the task ...
			if (elapsed >= 0 && task.state === STATE.WAITING) {

				task.state = STATE.RUNNING;

				task.notifyBegin();

				task.notifyIteration();

				task.notifyProgress(0, 0, duration);
			}

			// Running the task ...
			if (task.state === STATE.RUNNING || task.state === STATE.PAUSED) {

				if (elapsed < duration) {

					task.state = STATE.RUNNING;

					task.notifyProgress(dt, elapsed, duration);
				}

				// Finishing the task ...
				else {

					remainder = elapsed - duration;

					task.notifyProgress(dt - remainder, duration, duration);

					task.state = STATE.DONE;

					// Iterating the task ...
					if (iterations < iterationCount) {
						iterations++;
						remainder = task.step(remainder);
					}

					// Really done!
					else {
						iterations = 0;
						scheduler.remove(task);
						task.notifyDone(promise);
					}
				}
			}

			return remainder;
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

	var stringSplitterRegExp = /([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?|(\D*))/g;

	function findNumbers(str) {

		var values = [];
		var indexes = [];

		var i, n, value, chunk, matches = str.match(stringSplitterRegExp);
		for (i = 0, n = matches.length; i < n; ++i) {
			chunk = matches[i];
			value = parseFloat(chunk);
			if (!isNaN(value)) {
				values.push(value);
				indexes.push(i);
			}
		}

		return {
			values: values,
			pattern: matches,
			indexes: indexes
		}
	}

	function format(props, propsArray, source) {

		var i, n, map, isArray, prop;

		for (var key in props) {
			if (props.hasOwnProperty(key)) {

				prop = props[key];
				isArray = false;

				if (prop.from === undefined) {
					prop.from = source[key];
				}

				if (prop.to === undefined) {
					prop.to = source[key];
				}

				if (isString(prop.from)) {
					map = findNumbers(prop.from);
					prop.from = map.values;
					prop.fromPattern = map.pattern;
					prop.fromIndexes = map.indexes;
					isArray = true;
				}

				if (isString(prop.to)) {
					map = findNumbers(prop.to);
					prop.to = map.values;
					prop.toPattern = map.pattern;
					prop.toIndexes = map.indexes;
					isArray = true;
				}

				if (isArray) {
					prop.change = [];
					for (i = 0, n = prop.to.length; i < n; ++i) {
						prop.change.push(prop.to[i] - prop.from[i]);
					}
				}
				else {
					prop.change = prop.to - prop.from;
				}

				propsArray.push({
					key: key,
					prop: prop
				});
			}
		}
	}


	function animate(target) {

		var task = new Task(),
			easingFn = animate.easing.linear,
			fromSetting = null,
			toSetting = null,
			props,
			propsArray = [],
			promise = task.promise;

		task.setDuration(1);

		task.updateSettings = function () {

			if (!fromSetting) {
				fromSetting = {};
			}

			if (!toSetting) {
				toSetting = {};
			}

			var key, descriptor;
			for (key in props) {
				if (props.hasOwnProperty(key)) {
					descriptor = props[key];

					if (!fromSetting[key]) {
						fromSetting[key] = descriptor.fromPattern ? descriptor.fromPattern.join('') : descriptor.from;
					}

					if (!toSetting[key]) {
						toSetting[key] = descriptor.toPattern ? descriptor.toPattern.join('') : descriptor.to;
					}
				}
			}
		};

		task.onBegin = function () {
			props = {};
			propsArray.length = 0;
			merge(props, fromSetting, 'from');
			merge(props, toSetting, 'to');
			format(props, propsArray, target);
			task.updateSettings();
		};

		task.onProgress = function (dt, elapsed, duration) {
			var t, b, c, d, x;

			t = elapsed;
			d = duration;
			x = t/d;

			var j, jl, i, il, key, prop;
			for (i = 0, il = propsArray.length; i < il; ++i) {
				prop = propsArray[i].prop;
				key = propsArray[i].key;

				if (prop.toPattern) {

					for (j = 0, jl = prop.toIndexes.length; j < jl; ++j) {
						b = prop.from[j];
						c = prop.change[j];
						prop.toPattern[prop.toIndexes[j]] = c * easingFn(x, x) + b;
					}

					target[key] = prop.toPattern.join('');

				}
				else {
					b = prop.from;
					c = prop.change;
					target[key] =  c * easingFn(x, x) + b;
				}
			}
		};

		promise.from = function (descriptor, duration, doneFilter) {
			fromSetting = descriptor;

			if (duration !== undefined) {
				task.setDuration(duration);
			}

			if (doneFilter) {
				promise.done(doneFilter);
			}

			return promise;
		};

		promise.to = function (descriptor, duration, doneFilter) {
			toSetting = descriptor;

			if (duration !== undefined) {
				task.setDuration(duration);
			}

			if (doneFilter) {
				promise.done(doneFilter);
			}

			return promise;
		};

		promise.duration = function (duration) {
			task.setDuration(duration);
			return promise;
		};

		promise.using = function (easing) {
			easingFn = easing;
			return promise;
		};

		return promise;
	}


	animate.group = function (subordinate /* , ..., subordinateN */) {

		var task = new Task(),
			subordinates = Array.prototype.slice.call(arguments),
			subordinateRemainders = new Float32Array(subordinates.length);

		var i, n, maxDuration = 0;
		for (i = 0, n = subordinates.length; i < n; ++i) {
			maxDuration = Math.max(subordinates[i].getDuration(true), maxDuration);
			subordinateRemainders[i] = -1;
		}

		task.setDuration(maxDuration);

		task.onBegin = task.onIteration = function () {
			var i, n;
			for (i = 0, n = subordinates.length; i < n; ++i) {
				subordinates[i].jump(0);
				subordinateRemainders[i] = -1;
			}
		};

		task.onProgress = function (dt) {

			var i, n, remainder;
			for (i = 0, n = subordinates.length; i < n; ++i) {

				if (subordinateRemainders[i] === -1) {
					remainder = subordinates[i].step(dt);
					if (remainder !== -1) {
						subordinateRemainders[i] = remainder;
					}
				}
			}
		};

		return task.promise;
	};

	animate.sequence = function (subordinate /* , ..., subordinateN */) {

		var task = new Task(),
			subItr = 0,
			subordinates = Array.prototype.slice.call(arguments);

		var i, n, duration = 0;
		for (i = 0, n = subordinates.length; i < n; ++i) {
			duration += subordinates[i].getDuration(true);
		}

		task.setDuration(duration);

		task.onBegin = task.onIteration = function () {
			var i, n;
			for (i = 0, n = subordinates.length; i < n; ++i) {
				subordinates[i].jump(0);
			}
			subItr = 0;
		};

		task.onProgress = function (dt) {

			var n = subordinates.length;

			while (dt >= 0 && subItr < n) {

				dt = subordinates[subItr].step(dt);

				if (dt >= 0) {
					subItr++;
				}
			}
		};

		return task.promise;
	};

	var easing = {

		mix: function (aFn, bFn, weightB) {
			return function (x, t) {
				return aFn(x, t) * (1 - weightB) + bFn(x, t) * weightB;
			}
		},

		crossfade: function (aFn, bFn) {
			return function (x, t) {
				return aFn(x, t) * (1 - t) + bFn(x, t) * (t);
			}
		},

		smoothStartN: function (n) {
			return function (x, t) {
				return Math.pow(x, n);
			}
		},

		smoothStopN: function (n) {
			return function (x, t) {
				return 1 - Math.pow(1 - x, n);
			}
		},

		smoothStepN: function (n) {
			return function (x, t) {
				var s = 1 - x;
				return Math.pow(x, n) * (1 - t) + (1 - Math.pow(s, n)) * t;
			}
		},

		flip: function (aFn) {
			return function (x, t) {
				return 1 - aFn(x, t);
			}
		},

		scale: function (aFn) {
			return function (x, t) {
				return aFn(x, t) * t;
			}
		},

		reverseScale: function (aFn) {
			return function (x, t) {
				return aFn(x, t) * (1 - t);
			}
		},

		linear: function (x) {
			return x;
		},

		smoothStart2: function (x) {
			return x * x;
		},

		smoothStart3: function (x) {
			return x * x * x;
		},

		smoothStart4: function (x) {
			return x * x * x * x;
		},

		smoothStart5: function (x) {
			return x * x * x * x;
		},

		smoothStop2: function (x) {
			x = 1 - x;
			return 1 - x * x;
		},

		smoothStop3: function (x) {
			x = 1 - x;
			return 1 - x * x * x;
		},

		smoothStop4: function (x) {
			x = 1 - x;
			return 1 - x * x * x * x;
		},

		smoothStop5: function (x) {
			x = 1 - x;
			return 1 - x * x * x * x * x;
		},

		smoothStep2: function (x, t) {
			var s = 1 - x;
			return (x * x) * (1 - t) + (1 - s * s) * t;
		},

		smoothStep3: function (x, t) {
			var s = 1 - x;
			return (x * x * x) * (1 - t) + (1 - s * s * s) * t;
		},

		smoothStep4: function (x, t) {
			var s = 1 - x;
			return (x * x * x * x) * (1 - t) + (1 - s * s * s * s) * t;
		},

		smoothStep5: function (x, t) {
			var s = 1 - x;
			return (x * x * x * x * x) * (1 - t) + (1 - s * s * s * s * s) * t;
		},

		sineStart: function (x) {
			return -Math.cos(x * (Math.PI/2)) + 1.0;
		},

		sineStop: function (x) {
			return Math.sin(x * (Math.PI/2));
		},

		sineStep: function (x) {
			return -1/2 * (Math.cos(Math.PI * x) - 1);
		},

		circStart: function (x) {
			return -(Math.sqrt(1 - x * x) - 1);
		},

		circStop: function (x) {
			x -= 1;
			return Math.sqrt(1 - x * x);
		},

		circStep: function (x) {
			x *= 2;
			if (x < 1) return -1/2 * (Math.sqrt(1- x * x) - 1);
			else return 1/2 * (Math.sqrt(1 - (x-2)*(x-2)) + 1);
		},

		expoStart: function (x) {
			if (x === 0) return 0.0;
			return Math.pow(2, 10 * (x-1));
		},

		expoStop: function (x) {
			if (x === 1.0) return 1.0;
			return -Math.pow(2, -10 * x) + 1;
		},

		expoStep: function (x) {
			if (x === 0.0) return 0.0;
			if (x === 1.0) return 1.0;
			x *= 2;

			if (x < 1.0) return 1/2 * Math.pow(2, 10 * (x - 1));
			return 1/2 * (-Math.pow(2, -10 * (x - 1)) + 2);
		},

		backStart: function (x, t, s) {
			if (s === undefined) {
				s = 1.70158;
			}
			return x * x * ((s + 1) * x - s);
		},

		backStop: function (x, t, s) {
			if (s === undefined) {
				s = 1.70158;
			}
			x = (x - 1);
			return x * x * ((s + 1) * x + s) + 1;
		},

		backStep: function (x, t, s) {
			if (s === undefined) {
				s = 1.70158;
			}
			s *= 1.525;
			x *= 2;
			if (x < 1) return 1 / 2 * (x * x * ((s + 1) * x - s));
			x -= 2;
			return 1 / 2 * (x * x * ((s + 1) * x + s) + 2);
		},

		backStartS: function (s) {
			return function (x, t) {
				return easing.backStart(x, t, s);
			}
		},

		backStopS: function (s) {
			return function (x, t) {
				return easing.backStop(x, t, s);
			}
		},

		backStepS: function (s) {
			return function (x, t) {
				return easing.backStep(x, t, s);
			}
		},

		elasticStart: function (x) {
			if (x === 0) return 0.0;
			if (x === 1) return 1.0;
			x -= 1;
			return -(Math.pow(2, 10 * x) * Math.sin((x - 0.075) * (2 * Math.PI) / 0.3));
		},

		elasticStop: function (x) {
			if (x === 0) return 0.0;
			if (x === 1) return 1.0;
			return Math.pow(2, -10 * x) * Math.sin((x - 0.075) * (2 * Math.PI) / 0.3) + 1.0;
		},

		elasticStep: function (x) {
			x *= 2;
			if (x === 0) return 0.0;
			if (x === 2) return 1.0;
			if (x < 1) return -.5 * (Math.pow(2, 10 * (x-1)) * Math.sin((x - 1.1125) * (2 * Math.PI) / 0.45));
			return Math.pow(2, -10 * (x-1)) * Math.sin((x - 1.1125) * (2 * Math.PI) / 0.45) * .5 + 1.0;
		},

		bounceStart: function (x, t) {
			return 1.0 - easing.bounceStop(1.0 - x, t);
		},

		bounceStop: function (x) {
			if (x < (1/2.75)) {
				return 7.5625 * x * x;
			}
			else if (x < (2 / 2.75)) {
				x -= 1.5 / 2.75;
				return (7.5625 * x * x + .75);
			} else if (x < (2.5 / 2.75)) {
				x -= 2.25 / 2.75;
				return 7.5625 * x * x + .9375;
			} else {
				x -= 2.625 / 2.75;
				return 7.5625 * x * x + .984375;
			}
		},

		bounceStep: function (x, t) {
			if (x < 0.5) return easing.bounceStart(x * 2, t) * 0.5;
			return easing.bounceStop(x * 2 - 1.0, t) * 0.5 + 0.5;
		}
	};

	easing.easeInQuad = easing.smoothStart2;
	easing.easeInCubic = easing.smoothStart3;
	easing.easeInQuartic = easing.smoothStart4;
	easing.easeInQuintic = easing.smoothStart5;

	easing.easeOutQuad = easing.smoothStop2;
	easing.easeOutCubic = easing.smoothStop3;
	easing.easeOutQuartic = easing.smoothStop4;
	easing.easeOutQuintic = easing.smoothStop5;

	easing.easeInOutQuad = easing.smoothStep2;
	easing.easeInOutCubic = easing.smoothStep3;
	easing.easeInOutQuartic = easing.smoothStep4;
	easing.easeInOutQuintic = easing.smoothStep5;

	easing.easeInSine = easing.sineStart;
	easing.easeInCirc = easing.circStart;
	easing.easeInExpo = easing.expoStart;
	easing.easeInBack = easing.backStart;
	easing.easeInElastic = easing.elasticStart;
	easing.easeInBounce = easing.bounceStart;
	
	easing.easeOutSine = easing.sineStop;
	easing.easeOutCirc = easing.circStop;
	easing.easeOutExpo = easing.expoStop;
	easing.easeOutBack = easing.backStop;
	easing.easeOutElastic = easing.elasticStop;
	easing.easeOutBounce = easing.bounceStop;

	easing.easeInOutSine = easing.sineStep;
	easing.easeInOutCirc = easing.circStep;
	easing.easeInOutExpo = easing.expoStep;
	easing.easeInOutBack = easing.backStep;
	easing.easeInOutElastic = easing.elasticStep;
	easing.easeInOutBounce = easing.bounceStep;

	animate.easing = easing;

	window.animate = animate;

	if (typeof define === "function" && define.amd) {
		define('animate', function () {
			return animate;
		});
	}

}());