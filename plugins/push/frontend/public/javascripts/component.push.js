'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.push) {
	setTimeout(function(){
        window.components.push.popup.show();
	}, 300);

	var C = {
		TYPE: {
			MESSAGE: 'message',
			DATA: 'data',
			REVIEW: 'review',
			UPDATE: 'update',
		},

		TAB: {
			APPS: 0,
			PLATFORMS: 1,
			TIME_N_LOC: 2,
			MESSAGE: 3
		},

		PLATFORMS: {
			IOS: 'i',
			ANDROID: 'a'
		}
	}, t = window.components.t;

	var push = window.components.push = {};

	push.Message = function(data) {
		this._id = m.prop(data._id);
		this.type = m.prop(data.type || C.TYPE.MESSAGE);
		this.apps = m.prop(data.apps || []);
		this.platforms = m.prop(data.platforms || []);
		this.date = m.prop(data.date);
		this.sent = m.prop(data.sent);
		this.sound = m.prop(data.sound || 'default');
		this.test = m.prop(typeof data.test === 'undefined' ? false : data.test);

		this.userConditions = m.prop(data.userConditions);
		this.drillConditions = m.prop(data.drillConditions);
		this.geo = m.prop(data.geo || '');

		this.count = m.prop();
		this.locales = m.prop(data.locales);
		this.messagePerLocale = m.prop(data.messagePerLocale || {});

		this.result = new push.MessageResult(data.result || {});

		this.expiryDate = m.prop(data.expiryDate);
		this.appNames = m.prop(data.appNames || []);
		this.created = m.prop(data.created);

		this.availablePlatforms = function() {
			var platofrms = [];
			this.apps().forEach(function(id){
				var a = window.countlyGlobal.apps[id];
				if (a.apn && (a.apn.universal || a.apn.prod || a.apn.dev) && platofrms.indexOf(C.PLATFORMS.IOS) === -1) { platofrms.push(C.PLATFORMS.IOS); } 
				if (a.gcm && (a.gcm.key) && platofrms.indexOf(C.PLATFORMS.ANDROID) === -1) { platofrms.push(C.PLATFORMS.ANDROID); } 
			});
			return platofrms;
		};

		this.schedule = function() {
			return !!this.date();
		};

		this.audience = function() {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/audience',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					args: JSON.stringify({
						apps: this.apps(),
						platforms: this.platforms(),
						userConditions: this.userConditions(),
						drillConditions: this.drillConditions(),
						test: this.test()
					})
				}
			});
		};
	};

	push.MessageResult = function(data) {
		this.status = m.prop(data.status || 0);
		this.total = m.prop(data.total || 0);
		this.processed = m.prop(data.processed || 0);
		this.sent = m.prop(data.sent || 0);
		this.error = m.prop(data.error);
	};

	push.popup = {
		show: function(prefilled){
			var message = new push.Message(prefilled || {});
			push.popup.slider = window.components.slider.show({
				title: function(){
					var els = [
						t('pu.po.title')
					];
					if (message.count()) {
						els.push(m('span.count.ion-person', 'Recipients: ' + message.count().TOTALLY));
					}
					return m('h3', els);
				}, 
				desc: t('pu.po.desc'),
				// onclose: function() {
				// 	console.log('slider closed');
				// },
				component: window.components.push.popup, 
				componentOpts: message,
				loadingTitle: t('pu.po.loading'),
				loadingDesc: t('pu.po.loading-desc'),
			});
		},

		controller: function(message){
			this.renderTab = function(i, active) {
				return m('.comp-push-tab', {class: active ? 'active' : ''}, [
					i < this.tabs.tab() ? m('.comp-push-tab-num.ion-checkmark') : m('.comp-push-tab-num', i + 1),
					m('.comp-push-tab-title', t('pu.po.tab' + i + '.title')),
					m('.comp-push-tab-desc', t('pu.po.tab' + i + '.desc'))
				]);
			};

			var popup = this, apps = [];
			for (var k in window.countlyGlobal.apps) {
				var a = window.countlyGlobal.apps[k];
				apps.push(window.components.selector.Option({value: a._id, title: a.name, selected: message.apps().indexOf(a._id) !== -1}));
			}

			this.previewPlatform = m.prop(C.PLATFORMS.IOS);
			
			this.ontab = function(tab) {
				console.log('tab', tab);
			}.bind(this);

			this.tabenabled = function(tab) {
				if (this.tabs.tab() >= tab) {
					return true;
				}

				var enabled = true;
				switch (tab) {
					/* falls through */
					case 3:
						if (message.type() === C.TYPE.MESSAGE) {
							enabled = enabled && false;
						} else {
							enabled = enabled && true;
						}
					/* falls through */
					case 2:
						if (message.schedule()) {
							enabled = enabled && !!message.date();
						}
					/* falls through */
					case 1:
						enabled = enabled && message.platforms().length && message.apps().length;
						break;
				}

				return enabled;
			}.bind(this);

			this.next = function(ev, tab) {
				if (ev) { ev.preventDefault(); }

				tab = typeof tab === 'undefined' ? this.tabs.tab() + 1 : tab;
				if (tab === 2 && !message.count()) {
					push.popup.slider.loading(true);
					message.audience().then(function(count){
						setTimeout(function(){
							m.startComputation();
							push.popup.slider.loading(false);
							message.count(count);
							if (this.tabenabled(tab)) {
								popup.tabs.set(tab);
							}
							m.endComputation();
						}.bind(this), 2000);
					}.bind(this), push.popup.slider.loading.bind(push.popup.slider, false));
				} else if (this.tabenabled(tab)) {
					popup.tabs.set(tab);
				}
			}.bind(this);

			this.prev = function(ev) {
				ev.preventDefault();
				if (this.tabs.tab() > 0) {
					this.tabs.set(popup.tabs.tab() - 1);
				}
			}.bind(this);

			var locales = {
				controller: function(){
					var locales = [], self = this;
					for (var k in message.count()) if (k !== 'TOTALLY') {
						for (var l in message.count()[k]) if (l !== 'TOTALLY') {
							var ll = locales.filter(function(loc){ return loc.value === l; });
							if (ll.length) {
								ll[0].count += message.count()[k][l];
							} else {
								locales.push({value: l, count: message.count()[k][l]});
							}
						}
					}
					var sum = 0;
					locales.forEach(function(l){ sum += l.count; });
					locales.sort(function(a, b){ return b.count - a.count; });
					locales.unshift({value: 'default', count: sum});

					locales.forEach(function(l, i){
						l.percent = Math.round(l.count / sum * 100);
						l.tab = function() {
							return m('div', {class: popup.tabs.tab() === i ? 'active' : ''}, [
								// message.locales()[l] ? m('.comp-push-tab-num.ion-checkmark') : 
								m('span.comp-push-locale-count', l.percent + '%'),
								m('span.comp-push-locale-title', l.value)
							]);
						};
						l.view = function() {
							return m('textarea', {'data-locale': l.value, value: message.messagePerLocale()[l.value] || '', onkeyup: m.withAttr('value', self.ontext)});
						};
					});
					this.text = m.prop();
					this.ontab = function(tab){
						this.text(message.messagePerLocale()[locales[tab].value]);
					}.bind(this);
					this.ontext = function(text) {
						this.text(text);
						message.messagePerLocale()[locales[this.tabs.tab()].value] = text;
					}.bind(this);
					this.tabs = new window.components.tabs.controller(locales, {ontab: this.ontab});
					this.ontab(0);
				},
				view: function(ctrl){
					return m('.comp-push-locales', [
						window.components.tabs.view(ctrl.tabs),
					]);
				},
			};

			this.tabs = new window.components.tabs.controller([
				// Apps & Platforms
				{
					tab: this.renderTab.bind(this, 0),
					controller: function() {
						return {
							appsSelector: window.components.selector.controller({
								title: t('pu.po.tab0.apps'),
								addTitle: t('pu.po.tab0.add'),
								options: apps,
								onchange: function(opts) {
									message.count(undefined);
									message.apps(opts.map(function(o){ return o.value(); }));
									if (!message.apps().length) {
										message.platforms([]);
									} else {
										var available = message.availablePlatforms();
										for (var i in message.platforms()) {
											if (available.indexOf(message.platforms()[i]) === -1) {
												message.platforms().splice(i, 1);
											}
										}
									}
								}
							}),
							onplatform: function(ev){
								message.count(undefined);
								var p = ev.target.value, i = message.platforms().indexOf(p);
								if (i === -1) {
									message.platforms().push(p);
								} else {
									message.platforms().splice(i, 1);
								}
							},
						};
					},

					view: function(ctrl) {
						var platforms = message.availablePlatforms();
						return m('div.comp-push-tab', [
							m('.comp-push-panels', [
								m('.comp-push-panel', [
									m('h4', t('pu.po.tab0.select-apps')),
									m('h6', t('pu.po.tab0.select-apps-desc')),
									window.components.selector.view(ctrl.appsSelector)
								]),
								m('.comp-push-panel', [
									m('h4', t('pu.po.tab0.select-platforms')),
									m('h6', t('pu.po.tab0.select-platforms-desc')),
									!platforms.length ? m('div.help', t('pu.po.tab0.select-platforms-no')) : m('.platforms', [platforms.map(function(p){
										var o = {value: p, onchange: ctrl.onplatform};
										if (message.platforms().indexOf(p) !== -1) {
											o.checked = 'checked';
										}
										return m('.platform', [
											m('input[type="checkbox"]', o),
											m('span', t('pu.platform.' + p))
										]);
									})])
								]),
							]),
							m('.btns', [
								popup.tabs.tab() > 0 ? m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')) : '',
								m('a.btn-next', {href: '#', onclick: popup.next, disabled: popup.tabenabled(1) ? false : 'disabled'}, t('pu.po.next'))
							])
						]);
					}
				},

				// Time & Location
				{
					tab: this.renderTab.bind(this, 1), 
					view: function() { 
						return m('.comp-push-tab', [
							m('.comp-push-vert-panel', [
								m('h4', t('pu.po.tab1.scheduling')),
								m('h6', t('pu.po.tab1.scheduling-desc')),
								m.component(window.components.radio, {options: [
									{value: false, title: t('pu.po.tab1.scheduling-now'), desc: t('pu.po.tab1.scheduling-now-desc')},
									{value: true, title: t('pu.po.tab1.scheduling-date'), desc: t('pu.po.tab1.scheduling-date-desc'), view: function(){
										return m.component(window.components.datepicker, {date: true, time: true, value: message.date});
									}}
								], value: message.schedule.bind(message)}),
							]),
							m('.comp-push-vert-panel', [
								m('h4', t('pu.po.tab1.testing')),
								m('h6', t('pu.po.tab1.testing-desc')),
								m.component(window.components.radio, {options: [
									{value: false, title: t('pu.po.tab1.testing-prod'), desc: t('pu.po.tab1.testing-prod-desc')},
									{value: true, title: t('pu.po.tab1.testing-test'), desc: t('pu.po.tab1.testing-test-desc')}
								], value: message.test}),
							]),
							// window.components.radio
							// m('.comp-push-options', [
							// 	m('.comp-push-option', [
							// 		m('input[name="push-test"][type="radio"][value="prod"]'), m('label', ), m('span.help', )
							// 	]),
							// 	m('.comp-push-option', [
							// 		m('input[name="push-test"][type="radio"][value="test"]'), m('label', 'Test Users'), m('span.help', 'Development & test users')
							// 	])
							// ])
							m('.btns', [
								popup.tabs.tab() > 0 ? m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')) : '',
								m('a.btn-next', {href: '#', onclick: popup.next, disabled: popup.tabenabled(2) ? false : 'disabled'}, t('pu.po.next'))
							])
						]);
					}
				},
				// Message
				{
					tab: this.renderTab.bind(this, 2), 
					view: function(){ 
						return m('.comp-push-tab', [
							m('.comp-push-panels', [
								m('.comp-push-panel.comp-push-panel-compose-left.comp-push-compose', [
									m('h4', t('pu.po.tab2.message')),
									m('h6', t('pu.po.tab2.type')),
									m.component(window.components.select, {options: [
										{value: C.TYPE.MESSAGE, title: t('pu.type.message')},
										{value: C.TYPE.DATA, title: t('pu.type.data')},
									], value: message.type}),
									message.type() === C.TYPE.MESSAGE ? 
										m('.comp-push-message.comp-push-space-top', [
											m('h6', t('pu.po.tab2.text')),
											m.component(locales) 
										]) : '',
									m('h6.comp-push-space-top', t('pu.po.tab2.extras')),
								]),
								m('.comp-push-panel.comp-push-panel-compose-right.comp-push-preview', [
									m('h4', t('pu.po.tab2.preview')),
									m.component(window.components.select, {options: [
										{value: C.PLATFORMS.IOS, title: t('pu.platform.i')},
										{value: C.PLATFORMS.ANDROID, title: t('pu.platform.a')},
									], value: popup.previewPlatform}),
									m('img', {src: '/images/preview.' + popup.previewPlatform() + '.png'})
								])
							]),
							m('.btns', [
								popup.tabs.tab() > 0 ? m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')) : '',
								m('a.btn-next', {href: '#', onclick: popup.next, disabled: popup.tabenabled(3) ? false : 'disabled'}, t('pu.po.next'))
							])
						]);
					}
				},
				{tab: this.renderTab.bind(this, 3), view: function(){ return m('div', 'content 3'); }},
			], {stepbystep: true, ontab: this.ontab, tabenabled: this.tabenabled, tabset: this.next});

		},
		
		view: function(ctrl) {
			return m('div.comp-push', window.components.tabs.view(ctrl.tabs));
		},
	};

}