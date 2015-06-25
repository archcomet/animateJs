(function () {
	'use strict';

	var tasks = [],
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
			var idx = tasks.indexOf(task);
			if (idx !== -1) {
				tasks.splice(idx, 1);
			}
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

			for (; i < n; ++i) {
				tasks[i].step(dt);
			}

			lastTimeStamp = timeStamp;
			scheduler.scheduleNext();
		}
	};

	function Task() {
		var doneFilters = [],
			progressFilters = [],
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

					// todo state

					return promise;
				},

				stop: function () {
					scheduler.remove(task);
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

		task.promise = promise;

		task.step = function(dt) {

			if (delay > 0) {
				delay -= dt;
				dt = delay >= 0 ? 0 : Math.abs(delay);
			}

			if (dt > 0) {
				elapsed += dt;
				console.log(elapsed);
			}

		};
	}

	var animate = function (obj) {

		var t = new Task(),
			promise = t.promise;

		promise.from = function () {
			// todo
			return promise;
		};

		promise.to = function () {
			// todo
			return promise;
		};

		promise.using = function () {
			// todo
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