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
				requestAnimationFrame(scheduler.update);
			}
			else {
				lastTimeStamp = null;
			}
		},

		update: function () {
			var i = 0,
				n = tasks.length,
				timeStamp = performance.now(),
				dt = timeStamp - lastTimeStamp;

			for (; i < n; ++i) {
				tasks[i].update(dt);
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
			iterationCount = 0,
			iterationTotal = 0,
			promise = {

				start: function (ms) {
					elapsed = ms || 0;
					iterationCount = 0;
					scheduler.add(task);
					// todo state
					return promise;
				},

				stop: function () {
					scheduler.remove(task);
					return promise;
				},

				jump: function (ms) {
					elapsed = ms;
					// todo state
					return promise;
				},

				delay: function (ms) {
					delay = ms;
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

				repeat: function (iterations) {
					iterationTotal = iterations;
					return promise;
				}

			};

		task.promise = promise;

		task.update = function(dt) {
			elapsed += dt;
			// todo state
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

		LINEAR: function () {
			// todo
		},

		SMOOTH_START2: function () {
			// todo
		},
		SMOOTH_START3: function () {
			// todo
		},
		SMOOTH_START4: function () {
			// todo
		},
		SMOOTH_START5: function () {
			// todo
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