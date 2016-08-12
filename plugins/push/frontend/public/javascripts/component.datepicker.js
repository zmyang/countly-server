'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.datepicker) {

	var datepicker = window.components.datepicker = {

		controller: function(opts){
			if (!(this instanceof datepicker.controller)) {
				return new datepicker.controller(opts);
			}
			this.opts = opts;
			this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
			this.datestr = m.prop();
			this.timestr = m.prop();
		},
		
		view: function(ctrl){
			return m('.comp-datepicker', [
				ctrl.opts.date ? m('input[type="date"]', {placeholder: 'Date'}) : '', 
				ctrl.opts.time ? m('input[type="time"]', {placeholder: 'Time'}) : '', 
			]);
		}
	};
}

