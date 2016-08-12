'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.t) {
	window.components.t = function(key, num) {
		return window.jQuery.i18n.map[key];
	};
}

