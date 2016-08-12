'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.slider) {

	var defaultWidth = function() {
		return Math.min(document.body.clientWidth - document.getElementById('sidebar').clientWidth, 768);
	};

	var slider = window.components.slider = {
		Slider: function(data) {
			this.title = m.prop(data.title || '');
			this.desc = m.prop(data.desc || '');
		},

		show: function(opts){
			var el = document.createElement('div');
			el.className = 'comp-slider comp-slider-closed';
			document.body.appendChild(el);

			var contr = m.mount(el, {
				controller: function(){
					this.model = new slider.Slider(opts);
					this.close = function(ev){
						ev.preventDefault();
						el.className = 'comp-slider comp-slider-closed';
						if (opts.onclose) { opts.onclose(this.model); }
					}.bind(this);
					this.setWidth = function(width) {
						el.style.width = width + 'px';
					};

					this.setWidth(opts.width || defaultWidth());
					document.body.onresize = function(){
						this.setWidth(opts.width || defaultWidth());
					}.bind(this);

					this.loading = function(loading) {
						document.getElementsByClassName('comp-slider')[0].className = 'comp-slider' + (loading ? ' loading' : '');
					};
				},
				
				view: function(ctrl){
					return m('div.comp-slider-inner', [
						m('.loadable', [
							m('div.comp-slider-title', [
								typeof ctrl.model.title() === 'function' ? ctrl.model.title()() : ctrl.model.title() ? m('h3', ctrl.model.title()) : '',
								typeof ctrl.model.desc() === 'function' ? ctrl.model.desc()() : ctrl.model.desc() ? m('h5', ctrl.model.desc()) : '',
								m('a.comp-slider-close.ion-close', {href: '#', onclick: ctrl.close}, 'Back')
							]),
							m('div.comp-slider-content', m.component(opts.component, opts.componentOpts)),
						]),
						opts.loadingTitle ? 
						m('.loader', [
							m('img[src="/images/loading.png"]'),
							m('div', [
								m('h3', opts.loadingTitle),
								m('h6', opts.loadingDesc)
							])
						]) : ''
					]);
				}
			});

			el.className = 'comp-slider';
			return contr;
		},
	};

}