(function () {
	'use strict';

	var topBottomPadding = 32;
	var width = 145;
	var height = 85;
	var duration = 1500;

	var easing = animate.easing;

	var colors = ['red', 'green', 'blue', 'orange'];

	var visualizers = [
		[
			['linear', easing.linear, 'grey']
		],
		[
			['smoothStart2<br>easeInQuad', easing.smoothStart2],
			['smoothStart3<br>easeInCubic', easing.smoothStart3],
			['smoothStart4<br>easeInQuartic', easing.smoothStart4],
			['smoothStart5<br>easeInQuintic', easing.smoothStart5]
		],
		[
			['smoothStop2<br>easeOutQuad', easing.smoothStop2],
			['smoothStop3<br>easeOutCubic', easing.smoothStop3],
			['smoothStop4<br>easeOutQuartic', easing.smoothStop4],
			['smoothStop5<br>easeOutQuintic', easing.smoothStop5]
		],
		[
			['smoothStep2<br>easeInOutQuad', easing.smoothStep2],
			['smoothStep3<br>easeInOutCubic', easing.smoothStep3],
			['smoothStep4<br>easeInOutQuartic', easing.smoothStep4],
			['smoothStep5<br>easeInOutQuintic', easing.smoothStep5]
		],
		[
			['sineStart<br>easeInSine', easing.sineStart],
			['circStart<br>easeInCirc', easing.circStart],
			['expoStart<br>easeInExpo', easing.expoStart]
		],
		[
			['sineStop<br>easeOutSine', easing.sineStop],
			['circStop<br>easeOutCirc', easing.circStop],
			['expoStop<br>easeOutExpo', easing.expoStop]
		],
		[
			['sineStep<br>easeInOutSine', easing.sineStep],
			['circStep<br>easeInOutCirc', easing.circStep],
			['expoStep<br>easeInOutExpo', easing.expoStep]
		],
		[
			['backStart<br>easeInBack', easing.backStart],
			['elasticStart<br>easeInElastic', easing.elasticStart],
			['bounceStart<br>easeInBounce', easing.bounceStart]
		],
		[
			['backStop<br>easeOutBack', easing.backStop],
			['elasticStop<br>easeOutElastic', easing.elasticStop],
			['bounceStop<br>easeOutStop', easing.bounceStop]
		],
		[
			['backStep<br>easeInOutBounce', easing.backStep],
			['elasticStep<br>easeInOutElastic', easing.elasticStep],
			['bounceStep<br>easeInOutBounce', easing.bounceStep]
		],
		[
			['arch', easing.arch],
			['smoothStartArch2', easing.smoothStartArch2],
			['smoothStopArch2', easing.smoothStopArch2]
		],
		[
			['bell2', easing.bell2],
			['bell3', easing.bell3],
			['bell4', easing.bell4],
			['bell5', easing.bell5]
		],
		[
			['mix(backStep, elasticStop, 0.2)', easing.mix(easing.backStep, easing.elasticStop, 0.2)],
			['crossfade(stop3, start3)', easing.crossfade(easing.smoothStop3, easing.smoothStart3)],
			['crossfade(start5, stop5)', easing.crossfade(easing.smoothStart5, easing.smoothStop5)],
			['stepwise(start5, stop5)', easing.stepwise(easing.smoothStart5, easing.smoothStop5)]
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

		// Create one line
		var one = document.createElementNS(svgNS, 'path');
		one.setAttributeNS(null, 'stroke', 'lightgrey');
		one.setAttributeNS(null, 'stroke-width', '2');
		one.setAttributeNS(null, 'fill', 'none');
		one.setAttributeNS(null, 'd', 'M0,0 L' + width + ',0');
		svg.appendChild(one);

		// Create Axis lines
		var axis = document.createElementNS(svgNS, 'path');
		axis.setAttributeNS(null, 'stroke', 'black');
		axis.setAttributeNS(null, 'stroke-width', '2');
		axis.setAttributeNS(null, 'fill', 'none');
		axis.setAttributeNS(null, 'd', 'M0,-1 L0,' + height + ' ' + width + ',' + height);
		svg.appendChild(axis);


		// Create viewBox
		var viewBox = document.createElement('div');
		viewBox.classList.add('viewBox');
		viewBox.style.top = (topBottomPadding+1) + 'px';
		viewBox.style.left = '1px';
		viewBox.style.width = width + 'px';
		viewBox.style.height = height + 'px';
		wrap.appendChild(viewBox);

		if (typeof easingFn === 'function') {
			easingFn = [easingFn];
			color = [color];
		}

		var j = easingFn.length - 1,
			animations = [];

		for (; j >= 0; --j) {
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
				v = c * easingFn[j](x) + b;

				path.push(i === 0 ? 'M' : ' L');
				path.push(t.toFixed(1), ',', v.toFixed(1));
			}

			plot.setAttributeNS(null, 'stroke', color[j]);
			plot.setAttributeNS(null, 'stroke-width', '2');
			plot.setAttributeNS(null, 'fill', 'none');
			plot.setAttributeNS(null, 'd', path.join(''));
			svg.appendChild(plot);

			// Create dot
			var dot = document.createElement('div');
			dot.classList.add('dot');
			dot.style['background-color'] = color[j];
			dot.style.left = '0px';
			dot.style.top = height + 'px';
			viewBox.appendChild(dot);

			// Create marker
			var marker = document.createElement('div');
			marker.classList.add('marker');
			marker.style.top = height + 'px';
			marker.style['border-right-color'] = color[j];
			viewBox.appendChild(marker);


			animations.push(animate.group(
				animate(dot.style).to({left: width + 'px'}, duration),
				animate(dot.style).to({top: '0px'}, duration).using(easingFn[j]),
				animate(marker.style).to({top: '0px'}, duration).using(easingFn[j])
			));

			parent.appendChild(visualizer);
		}


		var animation = animate.group.apply(animate, animations).repeat(Infinity);
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

			var fnArray = [];
			for (j = 0, jl = row.length; j < jl; ++j) {
				visualizer(div, row[j][0], row[j][1], jl === 1 ? 'grey' : colors[j]);
				fnArray.push(row[j][1]);
			}

			if (fnArray.length > 1) {
				visualizer(div, 'composite', fnArray, colors);
			}

			document.body.appendChild(div);
		}

	});

}());