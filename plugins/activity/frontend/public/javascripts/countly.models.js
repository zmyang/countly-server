(function (countlyActivities, $, undefined) {

    //Private Properties
    var _crashData = {},
		_groupData = {},
		_reportData = {},
        _crashTimeline = {},
        _list = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = {},
		_periodObj = {},
		_metrics = {},
		_groups = {},
        _lastId = null,
        _usable_metrics = {
            metrics: {},
            custom:{}
        };
        
    countlyActivities.loadList = function (id) {
        $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":id,
                "method":"crashes",
                "list":1
            },
            dataType:"json",
            success:function (json) {
                for(var i = 0; i < json.length; i++){
                    _list[json[i]._id] = json[i].name;
                }
            }
        });
    }
    
    if(countlyGlobal.member && countlyGlobal.member.api_key && countlyCommon.ACTIVE_APP_ID != 0){
        countlyActivities.loadList(countlyCommon.ACTIVE_APP_ID);
    }

    //Public Methods
    countlyActivities.initialize = function (id, isRefresh) {
		_activeAppKey = countlyCommon.ACTIVE_APP_KEY;
		_initialized = true;
		_metrics = {
            "os_name":jQuery.i18n.map["crashes.os"], 
            "browser":jQuery.i18n.map["crashes.browser"], 
            "view":jQuery.i18n.map["crashes.view"], 
            "app_version":jQuery.i18n.map["crashes.app_version"], 
            "os_version":jQuery.i18n.map["crashes.os_version"],
			"manufacture":jQuery.i18n.map["crashes.manufacture"], 
			"device":jQuery.i18n.map["crashes.device"], 
			"resolution":jQuery.i18n.map["crashes.resolution"], 
			"orientation":jQuery.i18n.map["crashes.orientation"],
			"cpu":jQuery.i18n.map["crashes.cpu"],
			"opengl":jQuery.i18n.map["crashes.opengl"]
        };
        _groups = {
			"metrics":jQuery.i18n.map["crashes.group-metrics"],
			"custom":jQuery.i18n.map["crashes.group-custom"]
        };
            
        
        
		_period = countlyCommon.getPeriodForAjax();
		if(id){
            _lastId = id;
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":"activities",
                    "period":_period,
					"group":id,
                    "display_loader": !isRefresh
				},
				dataType:"jsonp",
				success:function (json) {
                    _groupData = json;
                    if(_groupData.data && _groupData.data.length){
                        for(var i = 0; i < _groupData.data.length; i++){
                            _reportData[_groupData.data[i]._id] = _groupData.data[i]; 
                        }
                    }
                    _groupData.name = countlyCommon.decode(_groupData.name);
                    _groupData.error = countlyCommon.decode(_groupData.error);
                    _list[_groupData._id] = _groupData.name;
					_groupData.dp = {};
					for(var i in _metrics){
                        if(_groupData[i]){
                            _usable_metrics.metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyActivities.processMetric(_groupData[i], i, _metrics[i]);
                        }
					}
                    if(_groupData.custom){
                        for(var i in _groupData.custom){
                            _groupData.dp[i] = countlyActivities.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
				}, 
                error:function(jqXHR, textStatus, errorThrown ){
                    if(errorThrown && errorThrown === "Bad Request"){
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.not-found"], "red");
                        app.navigate("/activities", true);
                    }
                }
			});
		}
		else
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
                    "period":_period,
					"method":"activities",
                    "graph":1,
                    "display_loader": !isRefresh
				},
				dataType:"jsonp",
				success:function (json) {
					_crashData = json;
                    _crashTimeline = json.data;
                    setMeta();
					if(_crashData.crashes.latest_version == "")
						_crashData.crashes.latest_version = "None";
					if(_crashData.crashes.error == "")
						_crashData.crashes.error = "None";
					if(_crashData.crashes.os == "")
						_crashData.crashes.os = "None";
					if(_crashData.crashes.highest_app == "")
						_crashData.crashes.highest_app = "None";
				}
			});
    };
    
    countlyActivities.getCrashName = function(id){
        if(_list[id])
            return _list[id];
        return id;
    }
    
    countlyActivities.getRequestData =  function(){
        return {
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":"activities",
					"group":_lastId,
                    "userlist":true
				};
    };
    
    countlyActivities.getId = function(){
        return _lastId;
    }
    
    countlyActivities.common = function (id, path, callback) {
        var data = {};
        if(typeof id === "string")
            data.crash_id = id;
        else
            data.crashes = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/activities/'+path,
            data:{
                args:JSON.stringify(data),
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
	
	countlyActivities.markResolve = function (id, callback) {
        countlyActivities.common(id, "resolve", function(json){
            if(json){
                if(typeof id === "string")
                    callback(json[id].replace(/:/g, '.'));
                else
                    callback(json);
            }
            else
                callback();
        });
    };
	
	countlyActivities.markUnresolve = function (id, callback) {
        countlyActivities.common(id, "unresolve", callback);
    };
    
    countlyActivities.markSeen = function (id, callback) {
        countlyActivities.common(id, "view", callback);
    };
    
    countlyActivities.share = function (id, callback) {
        countlyActivities.common(id, "share", callback);
    };
    
    countlyActivities.unshare = function (id, callback) {
        countlyActivities.common(id, "unshare", callback);
    };
    
    countlyActivities.hide = function (id, callback) {
        countlyActivities.common(id, "hide", callback);
    };
    
    countlyActivities.show = function (id, callback) {
        countlyActivities.common(id, "show", callback);
    };
    
    countlyActivities.resolving = function (id, callback) {
        countlyActivities.common(id, "resolving", callback);
    };
 
    countlyActivities.del = function (id, callback) {
        countlyActivities.common(id, "delete", callback);
    };
    
    countlyActivities.modifyShare = function (id, data, callback) {
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/activities/modify_share',
            data:{
                args:JSON.stringify({
                    crash_id:id,
                    data: data
                }),
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"jsonp",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyActivities.addComment = function (id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/activities/add_comment',
            data:{
                args:JSON.stringify(data),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyActivities.editComment = function (id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/activities/edit_comment',
            data:{
                args:JSON.stringify(data),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyActivities.deleteComment = function (id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/activities/delete_comment',
            data:{
                args:JSON.stringify(data),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };

    countlyActivities.refresh = function (id) {		
        _period = countlyCommon.getPeriodForAjax();
		if(id){
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":"activities",
                    "period":_period,
					"group":id,
                    "display_loader": false
				},
				dataType:"jsonp",
				success:function (json) {
					_groupData = json;
                    if(_groupData.data && _groupData.data.length){
                        for(var i = 0; i < _groupData.data.length; i++){
                            _reportData[_groupData.data[i]._id] = _groupData.data[i]; 
                        }
                    }
                    _list[_groupData._id] = _groupData.name;
					_groupData.dp = {};
					for(var i in _metrics){
                        if(_groupData[i]){
                            _usable_metrics.metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyActivities.processMetric(_groupData[i], i, _metrics[i]);
                        }
					}
                    if(_groupData.custom){
                        for(var i in _groupData.custom){
                            _groupData.dp[i] = countlyActivities.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
				}
			});
		}
		else
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
                    "period":_period,
					"method":"activities",
                    "graph":1,
                    "display_loader": false
				},
				dataType:"jsonp",
				success:function (json) {
					_crashData = json;
					if(_crashData.crashes.latest_version == "")
						_crashData.crashes.latest_version = "None";
					if(_crashData.crashes.error == "")
						_crashData.crashes.error = "None";
					if(_crashData.crashes.os == "")
						_crashData.crashes.os = "None";
					if(_crashData.crashes.highest_app == "")
						_crashData.crashes.highest_app = "None";
                    
                    countlyCommon.extendDbObj(_crashTimeline, json.data);
				}
			});
    };

    countlyActivities.reset = function () {
		_crashData = {};
		_groupData = {};
		_reportData = {};
        _crashTimeline = {};
        _metrics = {};
        _groups = {};
        _usable_metrics = {
            metrics:{},
            custom:{}
        };
    };
	
	countlyActivities.processMetric = function (data, metric, label) {
        
		var ret = {dp:[{data:[[-1,null]], "label":label}],ticks:[[-1,""]]};
		if(data){
            var vals = [];
			for(var key in data){
                vals.push({key:key, val:data[key]});
            }
            vals.sort(function(a,b){
                return b.val - a.val;
            });
            for(var i = 0; i < vals.length; i++){
				ret.dp[0].data.push([i,vals[i].val]);
                var l = vals[i].key.replace(/:/g, '.');
                if(metric == "device" && countlyDeviceList && countlyDeviceList[l])
                    l = countlyDeviceList[l];
				ret.ticks.push([i,l]);
			}
			ret.dp[0].data.push([vals.length,null]);
		}
		return ret;
    };
    
    countlyActivities.getChartData = function(metric, name){
		var chartData = [
                { data:[], label:name, color:'#DDDDDD', mode:"ghost" },
                { data:[], label:name, color:'#333933' }
            ],
            dataProps = [
                {
                    name:"p"+metric,
                    func:function (dataObj) {
                        return dataObj[metric]
                    },
                    period:"previous"
                },
                { name:metric }
            ];

        return countlyCommon.extractChartData(_crashTimeline, countlyActivities.clearObject, chartData, dataProps);
	};
	
	countlyActivities.getMetrics = function () {
		var ob = {};
        for(var i in _usable_metrics){
            ob[_groups[i]] = _usable_metrics[i];
        }
        return ob;
    };
	
	countlyActivities.getData = function () {
		return _crashData;
    };
	
	countlyActivities.getGroupData = function () {
		return _groupData;
    };
    
    countlyActivities.setGroupData = function (data) {
        _metrics = {
            "os_name":jQuery.i18n.map["crashes.os"], 
            "browser":jQuery.i18n.map["crashes.browser"], 
            "view":jQuery.i18n.map["crashes.view"], 
            "app_version":jQuery.i18n.map["crashes.app_version"], 
            "os_version":jQuery.i18n.map["crashes.os_version"],
			"manufacture":jQuery.i18n.map["crashes.manufacture"], 
			"device":jQuery.i18n.map["crashes.device"], 
			"resolution":jQuery.i18n.map["crashes.resolution"], 
			"orientation":jQuery.i18n.map["crashes.orientation"],
			"cpu":jQuery.i18n.map["crashes.cpu"],
			"opengl":jQuery.i18n.map["crashes.opengl"]
        };
        _groups = {
			"metrics":jQuery.i18n.map["crashes.group-metrics"],
			"custom":jQuery.i18n.map["crashes.group-custom"]
        };
		_groupData = data;
        _groupData.dp = {};
		for(var i in _metrics){
            if(_groupData[i]){
                _usable_metrics.metrics[i] = _metrics[i];
                _groupData.dp[i] = countlyActivities.processMetric(_groupData[i], i, _metrics[i]);
            }
		}
        if(_groupData.custom){
            for(var i in _groupData.custom){
                _groupData.dp[i] = countlyActivities.processMetric(_groupData.custom[i], i, i);
                _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
            }
        }
    };
	
	countlyActivities.getReportData = function (id) {
		return _reportData[id];
    };
	
	countlyActivities.getErrorName = function () {
		var error = _crashData.crashes.error.split(":")[0];
		return error;
	};
	
	countlyActivities.getAffectedUsers = function () {
		if(_crashData.users.total > 0){
            var ret = [];
			var affected = (_crashData.users.affected/_crashData.users.total)*100;
			var fatal = (_crashData.users.fatal/_crashData.users.total)*100;
			var nonfatal = ((_crashData.users.affected-_crashData.users.fatal)/_crashData.users.total)*100;
			var name1 = Math.round(fatal)+"% "+jQuery.i18n.map["crashes.fatal"];
            if(fatal > 0)
                ret.push({"name":name1,"percent":fatal});
			var name2 = Math.round(nonfatal)+"% "+jQuery.i18n.map["crashes.nonfatal"];
            if(nonfatal > 0)
                ret.push({"name":name2,"percent":nonfatal});
			var name3 = Math.round(100-affected)+"% "+jQuery.i18n.map["crashes.notaffected"];
            if(100-affected > 0)
                ret.push({"name":name3,"percent":100-affected});
			return ret;
		}
		return [];
	};
	
	countlyActivities.getFatalBars = function () {
		if(_crashData.crashes.total > 0){
            var ret = [];
            var total = _crashData.crashes.fatal + _crashData.crashes.nonfatal;
			var fatal = (_crashData.crashes.fatal/total)*100;
			var nonfatal = (_crashData.crashes.nonfatal/total)*100;
			var name1 = Math.round(fatal)+"% "+jQuery.i18n.map["crashes.fatal"];
            if(fatal > 0)
                ret.push({"name":name1,"percent":fatal});
			var name2 = Math.round(nonfatal)+"% "+jQuery.i18n.map["crashes.nonfatal"];
            if(nonfatal > 0)
                ret.push({"name":name2,"percent":nonfatal});
			return ret;
		}
		return [];
    };
	
	countlyActivities.getResolvedBars = function () {
		if(_crashData.crashes.unique > 0){
            var ret = [];
            var total = Math.max(_crashData.crashes.resolved, 0) + Math.max(_crashData.crashes.unresolved,0);
			var resolved = (_crashData.crashes.resolved/total)*100;
			var unresolved = (_crashData.crashes.unresolved/total)*100;
			var name1 = Math.round(resolved)+"% "+jQuery.i18n.map["crashes.resolved"];
            if(resolved > 0)
                ret.push({"name":name1,"percent":resolved});
			var name2 = Math.round(unresolved)+"% "+jQuery.i18n.map["crashes.unresolved"];
            if(unresolved > 0)
                ret.push({"name":name2,"percent":unresolved});
			return ret;
		}
		return [];
    };
	
	countlyActivities.getPlatformBars = function () {
		var res = [];
        var data = [];
		var total = 0;
        
		for(var i in _crashData.crashes.os){
            if(_crashData.crashes.os[i] > 0)
                data.push([i, _crashData.crashes.os[i]]);
		}
        
        data.sort(function(a, b) {return b[1] - a[1]});
        
        var maxItems = 3;
        if(data.length < maxItems)
            maxItems = data.length;
        
		for(var i = 0; i < maxItems; i++){
            total += data[i][1];
        }
        
		for(var i = 0; i < maxItems; i++){
            res.push({"name":data[i][0],"percent":(data[i][1]/total)*100});
		}
        
		return res;
    };
    
    countlyActivities.getBoolBars = function (name) {
		if(_groupData[name]){
            _groupData[name].yes = _groupData[name].yes || 0;
            _groupData[name].no = _groupData[name].no || 0;
            var total = _groupData[name].yes + _groupData[name].no;
			var yes = (_groupData[name].yes/total)*100;
			var no = (_groupData[name].no/total)*100;
            var ret = [];
            if(yes > 0){
                ret.push({"name":yes.toFixed(2)+"%","percent":yes});
                ret.push({"name":no.toFixed(2)+"%","percent":no});
            }
            else{
                ret.push({"name":yes.toFixed(2)+"%","percent":no, "background":"#86CBDD"});
            }
			return ret;
		}
		return [];
    };
    
    countlyActivities.getDashboardData = function () {
        var data = countlyCommon.getDashboardData(_crashTimeline, ["cr", "crnf", "crf", "cru", "crru"], ["cru"], null, countlyActivities.clearObject);
        return {usage:data};
    };
    
    countlyActivities.clearObject = function (obj) {
        if (obj) {
            if (!obj["cr"]) obj["cr"] = 0;
            if (!obj["cru"]) obj["cru"] = 0;
            if (!obj["crnf"]) obj["crnf"] = 0;
            if (!obj["crf"]) obj["crf"] = 0;
            if (!obj["crru"]) obj["crru"] = 0;
        }
        else {
            obj = {"cr":0, "cru":0, "crnf":0, "crf":0, "crru":0};
        }

        return obj;
    };
	
	function setMeta() {
        if (_crashTimeline['meta']) {
			for(var i in _crashTimeline['meta']){
				_metas[i] = (_crashTimeline['meta'][i]) ? _crashTimeline['meta'][i] : [];
			}
        }
    }

    function extendMeta() {
        if (_crashTimeline['meta']) {
			for(var i in _crashTimeline['meta']){
				_metas[i] = countlyCommon.union(_metas[i] , _crashTimeline['meta'][i]);
			}
        }
    }
	
}(window.countlyActivities = window.countlyActivities || {}, jQuery));