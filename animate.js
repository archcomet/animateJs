
// todo int vs float

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

		// Task has been added to the scheduler, but has not yet been run
		PENDING: 'pending',

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
				task.state = STATE.PENDING;
			}

			scheduler.add(task);
		};

		task.updateJump = function (timeStamp) {

			notifications = (
				task.state !== STATE.WAITING &&
				task.state !== STATE.PENDING &&
				task.state !== STATE.RUNNING
			);

			task.state = STATE.PENDING;
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
				task.state = STATE.PENDING;
			}

			elapsed += dt;

			// Waiting for the task ...
			if (elapsed < 0) {
				task.state = STATE.WAITING;
			}

			// Starting the task ...
			else if (task.state === STATE.WAITING || task.state === STATE.PENDING) {

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
			easingFn = animate.easing.LINEAR,
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
			var t, b, c, d, v;

			t = elapsed;
			d = duration;

			var j, jl, i, il, key, prop;
			for (i = 0, il = propsArray.length; i < il; ++i) {
				prop = propsArray[i].prop;
				key = propsArray[i].key;

				if (prop.toPattern) {

					for (j = 0, jl = prop.toIndexes.length; j < jl; ++j) {
						b = prop.from[j];
						c = prop.change[j];
						prop.toPattern[prop.toIndexes[j]] = easingFn(t, b, c, d);
					}

					target[key] = prop.toPattern.join('');

				}
				else {
					b = prop.from;
					c = prop.change;
					target[key] = easingFn(t, b, c, d);
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

		/**
		 * Returns a mix function from two easing functions.
		 *
		 * @param {Function} aFn - Function A
		 * @param {Function} bFn - Function B
		 * @param {Number} weightB - Weight of function B. Should be between 0 and 1.0
		 * @returns {Function}
		 */

		mix: function (aFn, bFn, weightB) {
			return function (t, b, c, d) {
				return aFn(t, b, c, d) * (1 - weightB) + bFn(t, b, c, d) * weightB;
			}
		},

		/**
		 * Returns a crossfade function from two easing functions. Similar to mix, except t is used for weight.
		 *
		 * @param {Function} aFn - Function A
		 * @param {Function} bFn - Function B
		 * @returns {Function}
		 */

		crossfade: function (aFn, bFn) {
			return function (t, b, c, d) {
				return aFn(t, b, c, d) * (1 - (t/d)) + bFn(t, b, c, d) * (t/d);
			}
		},

		/**
		 * Returns a smoothStart function of degree N.
		 *
		 * @param {number} n
		 * @returns {Function}
		 */

		smoothStartN: function (n) {
			return function (t, b, c, d) {
				t /= d;
				return c * Math.pow(t, n) + b;
			}
		},

		/**
		 * Returns a smoothStop function of degree N.
		 *
		 * @param {number} n
		 * @returns {Function}
		 */

		smoothStopN: function (n) {
			// todo
		},

		/**
		 * Returns a smoothStep function of degree N.
		 *
		 * @param {number} n
		 * @returns {Function}
		 */

		smoothStepN: function (n) {
			// todo
		},

		/**
		 * Returns a flipped function
		 *
		 * @param {Function} aFn
		 * @returns {Function}
		 */

		flip: function (aFn) {
			return function (t, b, c, d) {
				return aFn(d - t, b, c, d);
			}
		},

		/**
		 *
		 */

		scale: function (aFn) {
			return function (t, b, c, d) {
				return aFn(t, b, c, d) * (t/d);
			}
		},

		/**
		 *
		 */

		reverseScale: function (aFn) {
			return function (t, b, c, d) {
				return aFn(t, b, c, d) * (1 - t/d);
			}
		},

		/**
		 *
		 * @param t
		 * @param b
		 * @param c
		 * @param d
		 * @returns {*}
		 */

		LINEAR: function (t, b, c, d) {
			return c * (t / d) + b;
		},

		/**
		 *
		 * @param t
		 * @param b
		 * @param c
		 * @param d
		 * @returns {*}
		 */

		SMOOTH_START2: function (t, b, c, d) {
			t /= d;
			return c * t * t + b;
		},

		/**
		 *
		 * @param t
		 * @param b
		 * @param c
		 * @param d
		 * @returns {*}
		 */

		SMOOTH_START3: function (t, b, c, d) {
			t /= d;
			return c * t * t * t + b;
		},

		/**
		 *
		 * @param t
		 * @param b
		 * @param c
		 * @param d
		 * @returns {*}
		 */

		SMOOTH_START4: function (t, b, c, d) {
			t /= d;
			return c * t * t * t * t + b;
		},

		/**
		 *
		 * @param t
		 * @param b
		 * @param c
		 * @param d
		 * @returns {*}
		 */

		SMOOTH_START5: function (t, b, c, d) {
			t /= d;
			return  c * t * t * t * t * t + b;
		},

		/**
		 *
		 */

		SMOOTH_STOP2: function (t, b, c, d) {
			t /= d;
			return -c * t * (t - 2) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STOP3: function (t, b, c, d) {
			t /= d;
			t--;
			return c * (t * t * t + 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STOP4: function (t, b, c, d) {
			t /= d;
			t--;
			return -c * (t * t * t * t - 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STOP5: function (t, b, c, d) {
			t /= d;
			t--;
			return c * (t * t * t * t * t + 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STEP2: function (t, b, c, d) {
			t /= d / 2;
			if (t < 1) return c / 2 * t * t + b;
			t--;
			return -c / 2 * (t * (t - 2) - 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STEP3: function (t, b, c, d) {
			t /= d / 2;
			if (t < 1) return c / 2 * t * t * t + b;
			t -= 2;
			return c / 2 * (t * t * t + 2) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STEP4: function (t, b, c, d) {
			t /= d / 2;
			if (t < 1) return c / 2 * t * t * t * t + b;
			t -= 2;
			return -c / 2 * (t * t * t * t - 2) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SMOOTH_STEP5: function (t, b, c, d) {
			t /= d / 2;
			if (t < 1) return c / 2 * t * t * t * t * t + b;
			t -= 2;
			return c / 2 * (t * t * t * t * t + 2) + b;
		},

		/**
		 *
		 * @constructor
		 */

		ELASTIC_START: function (t, b, c, d) {
			var s = 1.70158;
			var p = 0;
			var a = c;
			if (t == 0) return b;
			if ((t /= d) == 1) return b + c;
			if (!p) p = d * .3;
			if (a < Math.abs(c)) {
				a = c;
				s = p / 4;
			}
			else s = p / (2 * Math.PI) * Math.asin(c / a);
			return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
		},

		/**
		 *
		 * @constructor
		 */

		ELASTIC_STOP: function (t, b, c, d) {
			var s = 1.70158;
			var p = 0;
			var a = c;
			if (t == 0) return b;
			if ((t /= d) == 1) return b + c;
			if (!p) p = d * .3;
			if (a < Math.abs(c)) {
				a = c;
				s = p / 4;
			}
			else s = p / (2 * Math.PI) * Math.asin(c / a);
			return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
		},

		/**
		 *
		 * @constructor
		 */

		ELASTIC_STEP: function (t, b, c, d) {
			var s = 1.70158;
			var p = 0;
			var a = c;
			if (t == 0) return b;
			if ((t /= d / 2) == 2) return b + c;
			if (!p) p = d * (.3 * 1.5);
			if (a < Math.abs(c)) {
				a = c;
				s = p / 4;
			}
			else s = p / (2 * Math.PI) * Math.asin(c / a);
			if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
			return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
		},

		/**
		 *
		 * @constructor
		 */

		BOUNCE_START: function (t, b, c, d) {
			return c - easing.BOUNCE_STOP(d - t, 0, c, d) + b;
		},

		/**
		 *
		 * @constructor
		 */

		BOUNCE_STOP: function (t, b, c, d) {
			if ((t /= d) < (1 / 2.75)) {
				return c * (7.5625 * t * t) + b;
			} else if (t < (2 / 2.75)) {
				return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
			} else if (t < (2.5 / 2.75)) {
				return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
			} else {
				return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
			}
		},

		/**
		 *
		 * @constructor
		 */

		BOUNCE_STEP: function (t, b, c, d) {
			if (t < d / 2) return easing.BOUNCE_START(t * 2, 0, c, d) * .5 + b;
			return easing.BOUNCE_STOP(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
		},

		/**
		 *
		 * @constructor
		 */

		BACK_START: function (t, b, c, d) {
			var s = 1.70158;
			return c * (t /= d) * t * ((s + 1) * t - s) + b;
		},

		/**
		 *
		 * @constructor
		 */

		BACK_STOP: function (t, b, c, d) {
			var s = 1.70158;
			return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		BACK_STEP: function (t, b, c, d) {
			var s = 1.70158;
			if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
			return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
		},

		/**
		 *
		 * @constructor
		 */

		CIRCULAR_START: function (t, b, c, d) {
			return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		CIRCULAR_STOP: function (t, b, c, d) {
			return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
		},

		/**
		 *
		 * @constructor
		 */

		CIRCULAR_STEP: function (t, b, c, d) {
			if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
			return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SINUSOIDAL_START: function (t, b, c, d) {
			return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
		},

		/**
		 *
		 * @constructor
		 */

		SINUSOIDAL_STOP: function (t, b, c, d) {
			return c * Math.sin(t / d * (Math.PI / 2)) + b;
		},

		/**
		 *
		 * @constructor
		 */

		SINUSOIDAL_STEP: function (t, b, c, d) {
			return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		EXPONENTIAL_START: function (t, b, c, d) {
			return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
		},

		/**
		 *
		 * @constructor
		 */

		EXPONENTIAL_STOP: function (t, b, c, d) {
			return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
		},

		/**
		 *
		 * @constructor
		 */

		EXPONENTIAL_STEP: function (t, b, c, d) {
			if (t == 0) return b;
			if (t == d) return b + c;
			if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
			return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
		}
	};

	easing.easeInQuad = easing.SMOOTH_START2;
	easing.easeInCubic = easing.SMOOTH_START3;
	easing.easeInQuartic = easing.SMOOTH_START4;
	easing.easeInQuintic = easing.SMOOTH_START5;

	easing.easeOutQuad = easing.SMOOTH_STOP2;
	easing.easeOutCubic = easing.SMOOTH_STOP3;
	easing.easeOutQuartic = easing.SMOOTH_STOP4;
	easing.easeOutQuintic = easing.SMOOTH_STOP5;

	easing.easeInOutQuad = easing.SMOOTH_STEP2;
	easing.easeInOutCubic = easing.SMOOTH_STEP3;
	easing.easeInOutQuartic = easing.SMOOTH_STEP4;
	easing.easeInOutQuintic = easing.SMOOTH_STEP5;

	easing.easeInSine = easing.SINUSOIDAL_START;
	easing.easeInCirc = easing.CIRCULAR_START;
	easing.easeInExpo = easing.EXPONENTIAL_START;
	easing.easeInBack = easing.BACK_START;
	easing.easeInElastic = easing.ELASTIC_START;
	easing.easeInBounce = easing.BOUNCE_START;
	
	easing.easeOutSine = easing.SINUSOIDAL_STOP;
	easing.easeOutCirc = easing.CIRCULAR_STOP;
	easing.easeOutExpo = easing.EXPONENTIAL_STOP;
	easing.easeOutBack = easing.BACK_STOP;
	easing.easeOutElastic = easing.ELASTIC_STOP;
	easing.easeOutBounce = easing.BOUNCE_STOP;

	easing.easeInOutSine = easing.SINUSOIDAL_STEP;
	easing.easeInOutCirc = easing.CIRCULAR_STEP;
	easing.easeInOutExpo = easing.EXPONENTIAL_STEP;
	easing.easeInOutBack = easing.BACK_STEP;
	easing.easeInOutElastic = easing.ELASTIC_STEP;
	easing.easeInOutBounce = easing.BOUNCE_STEP;


	// t * (1 - t)
	animate.easing = easing;

	window.animate = animate;

	if (typeof define === "function" && define.amd) {
		define('animate', function () {
			return animate;
		});
	}

}());