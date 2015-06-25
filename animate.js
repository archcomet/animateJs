(function () {
	'use strict';

	var tasks = [];

	var scheduler = {

		add: function (task) {
			var idx = tasks.indexOf(task);
			if (idx === -1) {
				tasks.push(task);
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
		},

		update: function () {
			var i = 0,
				n = tasks.length,
				timeStamp = performance.now();

			for (; i < n; ++i) {
				tasks[i].update(timeStamp);
			}

			scheduler.scheduleNext();
		}
	};

	function Task() {

		var lastTimeStamp = null,
			elapsed = 0,
			promise = {

			update: function (timeStamp) {
				elapsed += timeStamp - lastTimeStamp;
				lastTimeStamp = timeStamp;
				// todo
				return promise;
			},

			start: function (ms) {
				elapsed = ms || 0;
				lastTimeStamp = performance.now();
				scheduler.add(promise);
				// todo
				return promise;
			},

			stop: function () {
				// todo
				scheduler.remove(promise);
				return promise;
			},

			jump: function () {
				// todo
				return promise;
			},

			delay: function () {
				// todo
				return promise;
			},

			done: function () {
				// todo
				return promise;
			},

			progress: function () {
				// todo
				return promise;
			},

			repeat: function (iterations) {
				// todo
				return promise;
			}

		};

		return promise;
	}

	var animate = function (obj) {

		var t = Task();

		t.from = function () {
			// todo
			return t;
		};

		t.to = function () {
			// todo
			return t;
		};

		t.using = function () {
			// todo
			return t;
		};

		return t;
	};

	animate.sequence = function (subordinate /* , ..., subordinateN */) {
		// todo
		return Task();
	};

	animate.group = function (subordinate /* , ..., subordinateN */) {
		// todo
		return Task();
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