(function () {
	'use strict';

	var topBottomPadding = 24;
	var width = 135;
	var height = 65;

	var easing = animate.easing;

	var visualizers = [
		[
			['linear', easing.linear, 'grey']
		],
		[
			['smoothStart2<br>easeInQuad', easing.smoothStart2, 'red'],
			['smoothStart3<br>easeInCubic', easing.smoothStart3, 'green'],
			['smoothStart4<br>easeInQuartic', easing.smoothStart4, 'blue'],
			['smoothStart5<br>easeInQuintic', easing.smoothStart5, 'red']
		],
		[
			['smoothStop2<br>easeOutQuad', easing.smoothStop2, 'red'],
			['smoothStop3<br>easeOutCubic', easing.smoothStop3, 'green'],
			['smoothStop4<br>easeOutQuartic', easing.smoothStop4, 'blue'],
			['smoothStop5<br>easeOutQuintic', easing.smoothStop5, 'red']
		],
		[
			['smoothStep2<br>easeInOutQuad', easing.smoothStep2, 'red'],
			['smoothStep3<br>easeInOutCubic', easing.smoothStep3, 'green'],
			['smoothStep4<br>easeInOutQuartic', easing.smoothStep4, 'blue'],
			['smoothStep5<br>easeInOutQuintic', easing.smoothStep5, 'red']
		],
		[
			['sineStart<br>easeInSine', easing.sineStart, 'red'],
			['circStart<br>easeInCirc', easing.circStart, 'green'],
			['expoStart<br>easeInExpo', easing.expoStart, 'blue'],
			['backStart<br>easeInBack', easing.backStart, 'red'],
			['elasticStart<br>easeInElastic', easing.elasticStart, 'green'],
			['bounceStart<br>easeInBounce', easing.bounceStart, 'blue']
		],
		[
			['sineStop<br>easeOutSine', easing.sineStop, 'red'],
			['circStop<br>easeOutCirc', easing.circStop, 'green'],
			['expoStop<br>easeOutExpo', easing.expoStop, 'blue'],
			['backStop<br>easeOutBack', easing.backStop, 'red'],
			['elasticStop<br>easeOutElastic', easing.elasticStop, 'green'],
			['bounceStop<br>easeOutStop', easing.bounceStop, 'blue']
		],
		[
			['sineStep<br>easeInOutSine', easing.sineStep, 'red'],
			['circStep<br>easeInOutCirc', easing.circStep, 'green'],
			['expoStep<br>easeInOutExpo', easing.expoStep, 'blue'],
			['backStep<br>easeInOutBounce', easing.backStep, 'red'],
			['elasticStep<br>easeInOutElastic', easing.elasticStep, 'green'],
			['bounceStep<br>easeInOutBounce', easing.bounceStep, 'blue']
		],
		[
			['smoothStartN(2.7)', easing.smoothStartN(2.7), 'red'],
			['mix(backStep, elasticStop, 0.2)', easing.mix(easing.backStep, easing.elasticStop, 0.2), 'red'],
			['crossfade(stop3, start3)', easing.crossfade(easing.smoothStop3, easing.smoothStart3), 'red'],
			['smoothStart2d', easing.crossfade(easing.smoothStart2, easing.smoothStop2), 'magenta']
		]
	];


	function visualizer(parent, titleText, easingFn, color) {

		var visualizer = document.createElement('div');
		visualizer.classList.add('visualizer');
		visualizer.style.width = (width + 22) + 'px';

		// Create Wrap
		var wrap = document.createElement('div');
		wrap.classList.add('wrap');
		wrap.style.width = (width + 2) + 'px';
		wrap.style.height = (height + 2 + topBottomPadding * 2) + 'px';
		visualizer.appendChild(wrap);

		// Create title
		var title = document.createElement('div');
		title.classList.add('title');
		title.innerHTML = titleText;
		visualizer.appendChild(title);

		// Create SVG
		var svgNS = 'http://www.w3.org/2000/svg',
			svg = document.createElementNS(svgNS, 'svg');

		var minX = -1,
			minY = -1 - topBottomPadding,
			maxX = width + 2,
			maxY = height + 2 + topBottomPadding * 2;

		svg.setAttributeNS(null, 'viewBox', minX + ' ' + minY + ' ' + maxX + ' ' + maxY);
		wrap.appendChild(svg);

		// Create Axis lines
		var axis = document.createElementNS(svgNS, 'path');
		axis.setAttributeNS(null, 'stroke', 'black');
		axis.setAttributeNS(null, 'stroke-width', '2');
		axis.setAttributeNS(null, 'fill', 'none');
		axis.setAttributeNS(null, 'd', 'M0,-1 L0,' + height + ' ' + width + ',' + height);
		svg.appendChild(axis);

		// Create plot
		var plot = document.createElementNS(svgNS, 'path'),
			size = 200,
			path = [];

		var i, t, b, c, d, x, v;
		for (i = 0; i < size; ++i) {
			t = Math.floor(width * (i / (size - 1)));
			b = height;
			c = -height;
			d = width;

			x = t/d;
			v = c * easingFn(x, x) + b;

			path.push(i === 0 ? 'M' : ' L');
			path.push(t.toFixed(1), ',', v.toFixed(1));
		}

		plot.setAttributeNS(null, 'stroke', color);
		plot.setAttributeNS(null, 'stroke-width', '2');
		plot.setAttributeNS(null, 'fill', 'none');
		plot.setAttributeNS(null, 'd', path.join(''));
		svg.appendChild(plot);

		// Create viewBox
		var viewBox = document.createElement('div');
		viewBox.classList.add('viewBox');
		viewBox.style.top = (topBottomPadding+1) + 'px';
		viewBox.style.left = '1px';
		viewBox.style.width = width + 'px';
		viewBox.style.height = height + 'px';
		wrap.appendChild(viewBox);

		// Create dot
		var dot = document.createElement('div');
		dot.classList.add('dot');
		dot.style['background-color'] = color;
		dot.style.left = '0px';
		dot.style.top = height + 'px';
		viewBox.appendChild(dot);

		// Create marker
		var marker = document.createElement('div');
		marker.classList.add('marker');
		marker.style.top = height + 'px';
		viewBox.appendChild(marker);

		// Create animation
		var duration = 1000;

		var animation = animate.group(
			animate(dot.style).to({left: width + 'px'}, duration),
			animate(dot.style).to({top: '0px'}, duration).using(easingFn),
			animate(marker.style).to({top: '0px'}, duration).using(easingFn)
		).repeat(Infinity);

		parent.appendChild(visualizer);

		var activated = false;

		visualizer.addEventListener('click', function () {
			if (activated) {
				visualizer.classList.remove('focus');
				animation.stop();
				animation.jump(0);
				activated = false;
			}
			else {
				visualizer.classList.add('focus');
				animation.start();
				activated = true;
			}
		});

		visualizer.addEventListener('mouseenter', function () {
			if (!activated) {
				animation.start();
			}
		});

		visualizer.addEventListener('mouseleave', function () {
			if (!activated) {
				animation.stop();
				animation.jump(0);
			}
		});
	}

	(function ready(fn) {
		if (document.readyState !== 'loading') {
			fn();
		} else {
			document.addEventListener('DOMContentLoaded', fn);
		}
	})(function () {

		var i, il, j, jl, div, row;
		for (i = 0, il = visualizers.length; i < il; ++i) {
			div = document.createElement('div');
			row = visualizers[i];
			for (j = 0, jl = row.length; j < jl; ++j) {
				visualizer(div, row[j][0], row[j][1], row[j][2]);
			}
			document.body.appendChild(div);
		}


	});


}());