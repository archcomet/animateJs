/**
 The MIT License (MIT)

 Copyright (c) 2014-2015 Michael Good

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

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

			if (notifications && elapsed >= 0) {
				task.state = STATE.PAUSED;
			}

			if (elapsed < 0) {
				task.state = STATE.WAITING;
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
			x = t / d;

			var j, jl, i, il, key, prop;
			for (i = 0, il = propsArray.length; i < il; ++i) {
				prop = propsArray[i].prop;
				key = propsArray[i].key;

				if (prop.toPattern) {

					for (j = 0, jl = prop.toIndexes.length; j < jl; ++j) {
						b = prop.from[j];
						c = prop.change[j];
						prop.toPattern[prop.toIndexes[j]] = c * easingFn(x) + b;
					}

					target[key] = prop.toPattern.join('');
				}
				else {
					b = prop.from;
					c = prop.change;
					target[key] = c * easingFn(x) + b;
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
			subordinates = Array.isArray(subordinate) ? subordinate :  Array.prototype.slice.call(arguments),
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
			return function (x) {
				return aFn(x) * (1 - weightB) + bFn(x) * weightB;
			}
		},

		crossfade: function (aFn, bFn) {
			return function (x) {
				return aFn(x) * (1 - x) + bFn(x) * x;
			}
		},

		stepwise: function (aFn, bFn) {
			return function (x) {
				if (x < 0.5)
					return aFn(2 * x) * 0.5;
				return bFn(2 * x - 1) * 0.5 + 0.5;
			}
		},

		bezier: function (c1x, c1y, c2x, c2y) {
			return bezierEasing(c1x, c1y, c2x, c2y);
		},

		smoothStartN: function (n) {
			return function (x) {
				return Math.pow(x, n);
			}
		},

		smoothStopN: function (n) {
			return function (x) {
				return 1 - Math.pow(1 - x, n);
			}
		},

		smoothStepN: function (n) {
			var startFn = easing.smoothStartN(n),
				stopFn = easing.smoothStopN(n);

			return function (x) {
				if (x < 0.5)
					return startFn(2 * x) * 0.5;
				return stopFn(2 * x - 1) * 0.5 + 0.5;
			}
		},

		backStartS: function (s) {
			return function (x) {
				return easing.backStart(x, s);
			}
		},

		backStopS: function (s) {
			return function (x) {
				return easing.backStop(x, s);
			}
		},

		backStepS: function (s) {
			return function (x) {
				return easing.backStep(x, s);
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
			return x * x * x * x * x;
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

		smoothStep2: function (x) {
			if (x < 0.5) {
				x *= 2;
				return x * x * 0.5;
			}
			x = 1 - (2 * x - 1);
			return (1 - x * x) * 0.5 + 0.5;
		},

		smoothStep3: function (x) {
			if (x < 0.5) {
				x *= 2;
				return x * x * x * 0.5;
			}
			x = 1 - (2 * x - 1);
			return (1 - x * x * x) * 0.5 + 0.5;
		},

		smoothStep4: function (x) {
			if (x < 0.5) {
				x *= 2;
				return x * x * x * x * 0.5;
			}
			x = 1 - (2 * x - 1);
			return (1 - x * x * x * x) * 0.5 + 0.5;
		},

		smoothStep5: function (x) {
			if (x < 0.5) {
				x *= 2;
				return x * x * x * x * x * 0.5;
			}
			x = 1 - (2 * x - 1);
			return (1 - x * x * x * x * x) * 0.5 + 0.5;
		},

		sineStart: function (x) {
			return -Math.cos(x * (Math.PI / 2)) + 1.0;
		},

		sineStop: function (x) {
			return Math.sin(x * (Math.PI / 2));
		},

		sineStep: function (x) {
			return -1 / 2 * (Math.cos(Math.PI * x) - 1);
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
			if (x < 1) return -1 / 2 * (Math.sqrt(1 - x * x) - 1);
			else return 1 / 2 * (Math.sqrt(1 - (x - 2) * (x - 2)) + 1);
		},

		expoStart: function (x) {
			if (x === 0) return 0.0;
			return Math.pow(2, 10 * (x - 1));
		},

		expoStop: function (x) {
			if (x === 1.0) return 1.0;
			return -Math.pow(2, -10 * x) + 1;
		},

		expoStep: function (x) {
			if (x === 0.0) return 0.0;
			if (x === 1.0) return 1.0;
			x *= 2;

			if (x < 1.0) return 1 / 2 * Math.pow(2, 10 * (x - 1));
			return 1 / 2 * (-Math.pow(2, -10 * (x - 1)) + 2);
		},

		backStart: function (x, s) {
			if (s === undefined) {
				s = 1.70158;
			}
			return x * x * ((s + 1) * x - s);
		},

		backStop: function (x, s) {
			if (s === undefined) {
				s = 1.70158;
			}
			x = (x - 1);
			return x * x * ((s + 1) * x + s) + 1;
		},

		backStep: function (x, s) {
			if (s === undefined) {
				s = 1.70158;
			}
			s *= 1.525;
			x *= 2;
			if (x < 1) return 1 / 2 * (x * x * ((s + 1) * x - s));
			x -= 2;
			return 1 / 2 * (x * x * ((s + 1) * x + s) + 2);
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
			if (x < 1) return -.5 * (Math.pow(2, 10 * (x - 1)) * Math.sin((x - 1.1125) * (2 * Math.PI) / 0.45));
			return Math.pow(2, -10 * (x - 1)) * Math.sin((x - 1.1125) * (2 * Math.PI) / 0.45) * .5 + 1.0;
		},

		bounceStart: function (x) {
			return 1.0 - easing.bounceStop(1.0 - x);
		},

		bounceStop: function (x) {
			if (x < (1 / 2.75)) {
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

		bounceStep: function (x) {
			if (x < 0.5)
				return easing.bounceStart(x * 2) * 0.5;
			return easing.bounceStop(x * 2 - 1.0) * 0.5 + 0.5;
		},

		arch: function (x) {
			return x * (1 - x) * 4;
		},

		bell2: function (x) {
			var s = x * (1 - x) * 4;
			return s * s;
		},

		bell3: function (x) {
			var s = x * (1 - x) * 4;
			return s * s * s;
		},

		bell4: function (x) {
			var s = x * (1 - x) * 4;
			return s * s * s * s;
		},

		bell5: function (x) {
			var s = x * (1 - x) * 4;
			return s * s * s * s * s;
		},

		smoothStartArch2: function (x) {
			return x * x * (1 - x) * 27 / 4;
		},

		smoothStopArch2: function (x) {
			return x * (1 - x) * (1 - x) * 27 / 4;
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


	/**
	 *
	 * BezierEasing - use bezier curve for transition easing function
	 * by Gaëtan Renaudeau 2014 – MIT License
	 *
	 * Credits: is based on Firefox's nsSMILKeySpline.cpp
	 * Usage:
	 * var spline = BezierEasing(0.25, 0.1, 0.25, 1.0)
	 * spline(x) => returns the easing value | x must be in [0, 1] range
	 *
	 */

	var bezierEasing = (function () {

		// These values are established by empiricism with tests (tradeoff: performance VS precision)
		var NEWTON_ITERATIONS = 4;
		var NEWTON_MIN_SLOPE = 0.001;
		var SUBDIVISION_PRECISION = 0.0000001;
		var SUBDIVISION_MAX_ITERATIONS = 10;

		var kSplineTableSize = 11;
		var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

		function a(aA1, aA2) {
			return 1.0 - 3.0 * aA2 + 3.0 * aA1;
		}

		function b(aA1, aA2) {
			return 3.0 * aA2 - 6.0 * aA1;
		}

		function c(aA1) {
			return 3.0 * aA1;
		}

		// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
		function calcBezier(aT, aA1, aA2) {
			return ((a(aA1, aA2) * aT + b(aA1, aA2)) * aT + c(aA1)) * aT;
		}

		// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
		function getSlope(aT, aA1, aA2) {
			return 3.0 * a(aA1, aA2) * aT * aT + 2.0 * b(aA1, aA2) * aT + c(aA1);
		}

		function binarySubdivide(aX, aA, aB, mX1, mX2) {
			var currentX, currentT, i = 0;
			do {
				currentT = aA + (aB - aA) / 2.0;
				currentX = calcBezier(currentT, mX1, mX2) - aX;
				if (currentX > 0.0) {
					aB = currentT;
				} else {
					aA = currentT;
				}
			} while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
			return currentT;
		}

		function bezierEasing(mX1, mY1, mX2, mY2) {
			// Validate arguments
			if (arguments.length !== 4) {
				throw new Error("BezierEasing requires 4 arguments.");
			}
			for (var i = 0; i < 4; ++i) {
				if (typeof arguments[i] !== "number" || isNaN(arguments[i]) || !isFinite(arguments[i])) {
					throw new Error("BezierEasing arguments should be integers.");
				}
			}
			if (mX1 < 0 || mX1 > 1 || mX2 < 0 || mX2 > 1) {
				throw new Error("BezierEasing x values must be in [0, 1] range.");
			}

			var mSampleValues = new Float32Array(kSplineTableSize);

			function newtonRaphsonIterate(aX, aGuessT) {
				for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
					var currentSlope = getSlope(aGuessT, mX1, mX2);
					if (currentSlope === 0.0) return aGuessT;
					var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
					aGuessT -= currentX / currentSlope;
				}
				return aGuessT;
			}

			function calcSampleValues() {
				for (var i = 0; i < kSplineTableSize; ++i) {
					mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
				}
			}

			function getTForX(aX) {
				var intervalStart = 0.0;
				var currentSample = 1;
				var lastSample = kSplineTableSize - 1;

				for (; currentSample != lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
					intervalStart += kSampleStepSize;
				}
				--currentSample;

				// Interpolate to provide an initial guess for t
				var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample + 1] - mSampleValues[currentSample]);
				var guessForT = intervalStart + dist * kSampleStepSize;

				var initialSlope = getSlope(guessForT, mX1, mX2);
				if (initialSlope >= NEWTON_MIN_SLOPE) {
					return newtonRaphsonIterate(aX, guessForT);
				} else if (initialSlope === 0.0) {
					return guessForT;
				} else {
					return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
				}
			}

			var _precomputed = false;

			function precompute() {
				_precomputed = true;
				if (mX1 != mY1 || mX2 != mY2)
					calcSampleValues();
			}

			var f = function (aX) {
				if (!_precomputed) precompute();
				if (mX1 === mY1 && mX2 === mY2) return aX; // linear
				// Because JavaScript number are imprecise, we should guarantee the extremes are right.
				if (aX === 0) return 0;
				if (aX === 1) return 1;
				return calcBezier(getTForX(aX), mY1, mY2);
			};

			f.getControlPoints = function () {
				return [{x: mX1, y: mY1}, {x: mX2, y: mY2}];
			};

			var args = [mX1, mY1, mX2, mY2];
			var css = "cubic-bezier(" + args + ")";
			f.toCSS = function () {
				return css;
			};

			return f;
		}

		return bezierEasing;

	}());

}());