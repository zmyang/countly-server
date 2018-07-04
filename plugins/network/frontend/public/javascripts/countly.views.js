window.NetworkView = countlyView.extend({
    selectedMetric:"t",
    selectedView:null,
    selectedViews:[],
	selectedApps: {all:true},
	selectedCount: 0,
    ids:{},
    lastId:0,
    token: false,
    useView: null,
    beforeRender: function() {
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/network/templates/network.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyNetwork.initialize()).then(function () {});
    },
    getProperties: function(metric){
        return {
            "t":jQuery.i18n.map["network.http.request-cnts"],
            "d":jQuery.i18n.map["network.http.response-time"],
            "e":jQuery.i18n.map["network.http.error-cnts"],
            // "n":jQuery.i18n.map["network.http.response-time"],
        //    "s":jQuery.i18n.map["views.starts"],
        //    "e":jQuery.i18n.map["views.exits"],
        //    "b":jQuery.i18n.map["views.bounces"] 
        }
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var data = countlyNetwork.getData();
        var props = this.getProperties();
        var usage = [];
        for(var i in props){
            usage.push({
                    "title":props[i],
                    "id":"view-metric-"+i
                });
        }
        
        var domains = countlyNetwork.getDomains();
        for(var i = 0; i < domains.length; i++){
            domains[i] = countlyCommon.decode(domains[i]);
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["network.title"],
            "font-logo-class":"fa-eye",
            "active-segmentation": jQuery.i18n.map["network.all-segments"],
            "segmentations": countlyNetwork.getSegments(),
            "usage":usage,
            "domains":domains
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            
            var columns = [
                { "mData": function(row, type){if(type == "display"){ return row.network+"<div class='color'></div>";} else return row.network;}, sType:"string", "sTitle": jQuery.i18n.map["network.table.url"] , "sClass": "break", "sWidth": "30%"},
                { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["network.http.request-cnts"] },
                { "mData": "d", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["network.http.response-time"] },
                { "mData": function(row, type){
                    var time = (row.d == 0 || row.t == 0) ? 0 : (row.d/row.t).toFixed(2);
                    return time;
                     // if(type === "display")
                    //  return countlyCommon.timeString(time/1000);
                    // else return time
                }, sType:"numeric", "sTitle": jQuery.i18n.map["network.avg-duration"] },
                { "mData": function(row, type){
                    if(row.e > 0){
                        return "<p id='"+row.network+"' class='table-link green link-class'>" +countlyCommon.formatNumber(row.e)+ "</a>";
                    }else{
                        return 0;
                    }
                }, sType:"numeric", "sTitle": jQuery.i18n.map["network.http.error-cnts"] },
                { "mData": function(row, type){
                    var rate = (row.e == 0 ) ? 0 : (row.e/row.t*100).toFixed(2);
                    return rate+"%";
                  
                }, sType:"string", "sTitle": jQuery.i18n.map["network.error-rate"] },
                // { "mData": "e", sType:"formatted-num", "mRender":function(d) { return "<p id='"+row.network+"' class='table-link green link-class'>" +countlyCommon.formatNumber(d)+ "</a>"; }, "sTitle": jQuery.i18n.map["network.http.error-cnts"] }
            //    { "mData": "s", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["network.starts"] },
            //    { "mData": "e", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["network.exits"] },
            //    { "mData": "b", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["network.bounces"] }
            ];
            
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("sg.name", null, "[CLY]_network"));
                if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "web" && domains.length){
                    columns.push({ "mData": function(row, type){
                        var url = "#/analytics/network/action-map/";
                        if(countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID]["app_domain"] && countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID]["app_domain"].length > 0){
                            url = countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID]["app_domain"];
                            if(url.indexOf("http") !== 0)
                                url = "http://"+url;
                            if(url.substr(url.length - 1) == '/') 
                                url = url.substr(0, url.length - 1);
                        }

                        return '<a href='+url+row.network+' class="table-link green" data-localize="network.table.view" style="margin:0px; padding:2px;">'+jQuery.i18n.map["network.table.view"]+'</a>';
                        }, sType:"string", "sTitle": jQuery.i18n.map["network.action-map"], "sClass":"shrink center", bSortable: false });
                }
            }

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    if(!self.selectedView){
                        self.selectedView = aData.network;
                        self.selectedViews.push(self.selectedView);
                    }
                    
                    if(!self.ids[aData.network]){
                        self.ids[aData.network] = "view_"+self.lastId;
                        self.lastId++;
                    }
                    $(nRow).attr("id", self.ids[aData.network]);
                   
                },
                "aoColumns": columns
            }));
            $('.link-class').on("click", function (event){
                event.stopPropagation();
                var id =countlyCommon.hex_md5($(this).attr("id"));
                if(id){
                    var link = "#/analytics/networkerror/" + id ;
                    window.open(link, "_self");
                } 
                event.preventDefault();
            });
            $(".d-table").stickyTableHeaders();
            this.dtable.fnSort( [ [1,'desc'] ] );
            $(".dataTable-bottom").append("<div class='dataTables_info' style='float: right;'>"+jQuery.i18n.map["network.maximum-items"]+" ("+countlyCommon.GRAPH_COLORS.length+")</div>")
            
            $('.views-table tbody').on("click", "tr", function (event){
                var row = $(this);
                
                self.selectedView = row.find("td").first().text();

                var persistentSettings = countlyCommon.getPersistentSettings()["pageNetworkItems_" + countlyCommon.ACTIVE_APP_ID] || [];

                if(_.contains(self.selectedViews, self.selectedView)){
                    var index = self.selectedViews.indexOf(self.selectedView);
                    self.selectedViews.splice(index, 1);
                    persistentSettings.splice(persistentSettings.indexOf(self.selectedView), 1);
                    row.find(".color").css("background-color", "transparent");
                }
                else if(self.selectedViews.length < countlyCommon.GRAPH_COLORS.length){
                    self.selectedViews.push(self.selectedView);
                    persistentSettings.push(self.selectedView);
                }
                
                var persistData = {};
                persistData["pageNetworkItems_" + countlyCommon.ACTIVE_APP_ID] = persistentSettings;
                countlyCommon.setPersistentSettings(persistData);

                if(self.selectedViews.length == 0)
                    $("#empty-graph").show();
                else
                    $("#empty-graph").hide();
                self.drawGraph();
            });
            
            $('.views-table tbody').on("click", "a.table-link", function (event){
                event.stopPropagation();
                var followLink = false;
                var url = event.target.href;

                if(url.indexOf("#/analytics/network/action-map/") < 0){
                    followLink = true;
                }

                if(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].sdk_version && parseInt((countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].sdk_version+"").split(".")[0]) <= 16){
                    return;
                }
                $(event.target).toggleClass("active");
                if($(event.target).hasClass("active")){
                    $(".views-table a.table-link").removeClass("active");
                    $(event.target).addClass("active");
                    
                    if(!followLink){
                        var pos = $(event.target).offset();
                        $('.widget-content .cly-button-menu').css({
                            top: (pos.top+25) + "px",
                            left: (pos.left-250) + "px",
                            right: 35 + "px"
                        });
                        $('.widget-content > .cly-button-menu-trigger').addClass("active");
                        $('.widget-content > .cly-button-menu').focus();
                    }

                    var newWindow = "";
                    if(followLink){
                        newWindow = window.open("");
                    }

                    countlyNetwork.getToken(function(token){
                        self.useView = event.target.hash;
                        self.token = token;

                        if(followLink && (self.token !== false)){
                            newWindow.location.href = url;
                            newWindow.name = "cly:" + JSON.stringify({"token":self.token,"purpose":"heatmap",period:countlyCommon.getPeriodForAjax(),showHeatMap: true});    
                        }
                    });
                }
                else{
                    $(event.target).removeClass("active");
                    $('.widget-content > .cly-button-menu-trigger').removeClass("active");
                }
                event.preventDefault();
            });
            
            $('.widget-content .cly-button-menu .item').click(function(event){
                var url = $(event.target).text();
                if(url.indexOf("http") !== 0)
                    url = "http://"+url;
                if(url.substr(url.length - 1) == '/') {
                    url = url.substr(0, url.length - 1);
                }
                if(self.token !== false){
                    var path = self.useView.replace("#/analytics/network/action-map/", "");
                    window.open(url+path, "cly:" + JSON.stringify({"token":self.token,"purpose":"heatmap",period:countlyCommon.getPeriodForAjax(),showHeatMap: true}));
                }
                $('.widget-content > .cly-button-menu-trigger').removeClass("active");
            });

            $('.widget-content .cly-button-menu').blur(function() {
                $('.widget-content > .cly-button-menu-trigger').removeClass("active");
            });
            
            $("#view-metric-"+this.selectedMetric).parents(".big-numbers").addClass("active");
            
            $(".widget-content .inner").click(function () {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
            });
            
            $(".segmentation-option").on("click", function () {
                countlyNetwork.reset();
				countlyNetwork.setSegment($(this).data("value"));
                self.refresh();
			});
    
            $(".big-numbers .inner").click(function () {
                var elID = $(this).find('.select').attr("id").replace("view-metric-", "");
    
                if (self.selectedMetric == elID) {
                    return true;
                }
    
                self.selectedMetric = elID;
                self.drawGraph();
            });
            
            var persistentSettings = countlyCommon.getPersistentSettings()['pageViewsItems_' + countlyCommon.ACTIVE_APP_ID] || [];
            if(persistentSettings.length === 0){
                for(var i in self.selectedViews){
                    persistentSettings.push(self.selectedViews[i]);
                }

                var persistData = {};
                persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = persistentSettings;
                countlyCommon.setPersistentSettings(persistData);
            }else{
                self.selectedViews = [];
                
                for(var i in persistentSettings){
                    var current = persistentSettings[i];

                    if(self.selectedViews.indexOf(current) < 0)
                        self.selectedViews.push(current)
                }
            }

            $("#view-metric-"+this.selectedMetric).parents(".big-numbers").addClass("active");
            
            this.drawGraph();
        }
    },
    drawGraph: function(){
        var props = this.getProperties();
        var dp = [];
        for(var i = 0;  i < this.selectedViews.length; i++){
            var color = countlyCommon.GRAPH_COLORS[i];
            var data = countlyNetwork.getChartData(this.selectedViews[i], this.selectedMetric, props[this.selectedMetric]).chartDP;
            data[1].color = color;
            $("#"+this.ids[this.selectedViews[i]]+" .color").css("background-color", color);
            if(this.selectedViews.length == 1){
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                data[0].color = "rgba("+parseInt(result[1], 16)+","+parseInt(result[2], 16)+","+parseInt(result[3], 16)+",0.5"+")";
                dp.push(data[0])
            }
            dp.push(data[1]);
        }
        countlyCommon.drawTimeGraph(dp, "#dashboard-graph");
    },
    refresh:function () {
        var self = this;
        $.when(countlyNetwork.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlyNetwork.getData();
            CountlyHelpers.refreshTable(self.dtable, data.chartData);
            $('.link-class').on("click", function (event){
                event.stopPropagation();
                var id =countlyCommon.hex_md5($(this).attr("id"));
                if(id){
                    var link = "#/analytics/networkerror/" + id ;
                    window.open(link, "_self");
                } 
                event.preventDefault();
            });
            self.drawGraph();
        });
    }
});

window.NetworkFrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var durationData = countlyNetwork.getViewFrequencyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["network.view-frequency"],
            "font-logo-class":"fa-eye"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "vc", sType:"view-frequency", "sTitle": jQuery.i18n.map["network.view-frequency"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-sessions"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlySession.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var durationData = countlyNetwork.getViewFrequencyData();
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

window.ActionMapView = countlyView.extend({
    actionType: "",
    curSegment: 0,
    curRadius: 1,
    curBlur: 1,
    baseRadius: 1,
    baseBlur: 1.6,
    beforeRender: function() {
        var self = this;
        return $.when($.get(countlyGlobal["path"]+'/network/templates/actionmap.html', function(src){
			self.template = Handlebars.compile(src);
		}), countlyNetwork.loadActionsData(this.view)).then(function () {});
    },
    getData: function(data){
        var heat = [];
        var point;
        var width = $("#view-canvas-map").prop('width');
        var height = $("#view-canvas-map").prop('height');
        for(var i = 0; i < data.length; i++){
            point = data[i].sg;
            if(point.type == this.actionType)
                heat.push([parseInt((point.x/point.width)*width), parseInt((point.y/point.height)*height), data[i].c])
        }
        return heat;
    },
    getMaxHeight: function(data){
        var width = $("#view-map").width();
        var lowest = {w:0, h:0};
        var highest = {w:100000, h:5000};
        for(var i = 0; i < data.length; i++){
            if(width == data[i].sg.width)
                return data[i].sg.height;
            else if(width > data[i].sg.width && lowest.w < data[i].sg.width){
                lowest.w = data[i].sg.width;
                lowest.h = data[i].sg.height;
            }
        }

        if(lowest.h > 0)
            return lowest.h;
        
        for(var i = 0; i < data.length; i++){
            if(width < data[i].sg.width && highest.w > data[i].sg.width){
                highest.w = data[i].sg.width;
                highest.h = data[i].sg.height;
            }
        }
        
        return highest.h;
    },
    getResolutions: function(data){
        var res = ["Normal", "Fullscreen", "320x480","480x800"];
        return res;
    },
    resize: function(){
        $('#view-canvas-map').prop('width', $("#view-map").width());
        $('#view-canvas-map').prop('height', $("#view-map").height());
        if(this.map)
            this.map.resize();
    },
    loadIframe: function(){
        var self = this;
        var segments = countlyNetwork.getActionsData().domains;
        var url = "http://"+segments[self.curSegment]+self.view;
        if($("#view_loaded_url").val().length == 0)
            $("#view_loaded_url").val(url);
        countlyNetwork.testUrl(url, function(result){
            if(result){
                $("#view-map iframe").attr("src", url);
                $("#view_loaded_url").val(url);
            }
            else{
                self.curSegment++;
                if(segments[self.curSegment]){
                    self.loadIframe();
                }
                else{
                    $("#view_loaded_url").show();
                    CountlyHelpers.alert(jQuery.i18n.map["network.cannot-load"], "red");
                }
            }
        });
    },
    renderCommon:function (isRefresh) {
        var data = countlyNetwork.getActionsData();
        this.actionType = data.types[0] || jQuery.i18n.map["network.select-action-type"];
        var segments = countlyNetwork.getSegments();
        var self = this;
        this.templateData = {
            "page-title":jQuery.i18n.map["network.action-map"],
            "font-logo-class":"fa-eye",
            "first-type":this.actionType,
            "active-segmentation": jQuery.i18n.map["network.all-segments"],
            "segmentations": segments,
            "resolutions": this.getResolutions(),
            "data":data
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#view-map").height(this.getMaxHeight(data.data));
            this.resize();
            this.loadIframe();
            this.map = simpleheat("view-canvas-map");
            this.map.data(this.getData(data.data));
            this.baseRadius = Math.max((48500-35*data.data.length)/900, 5);
            this.drawMap();

            app.localize();

            $("#view_reload_url").on("click", function () {
				$("#view-map iframe").attr("src", "/o/urlload?url="+encodeURIComponent($("#view_loaded_url").val()));
			});
            
            $("#view_loaded_url").keyup(function(event){
                if(event.keyCode == 13){
                    $("#view_reload_url").click();
                }
            });
            
            $("#radius").on("change", function(){
                self.curRadius = parseInt($("#radius").val())/10;
                self.drawMap();
            });
            
            $("#blur").on("change", function(){
                self.curBlur = parseInt($("#blur").val())/10;
                self.drawMap();
            });
            
            $("#action-map-type .segmentation-option").on("click", function () {
				self.actionType = $(this).data("value");
                self.refresh();
			});
            
            $("#action-map-resolution .segmentation-option").on("click", function () {
                switch ($(this).data("value")) {
                    case "Normal":
                        $("#view-map").width("100%");
                        $("#view-map").prependTo("#view-map-container");
                        break;
                    case "Fullscreen":
                        $("#view-map").width("100%");
                        $("#view-map").prependTo(document.body);
                        break;
                    default:
                        var parts = $(this).data("value").split("x");
                        $("#view-map").width(parts[0]+"px");
                        $("#view-map").prependTo("#view-map-container");
                }
				self.resize();
                self.refresh();
			});
            
            $("#view-segments .segmentation-option").on("click", function () {
                countlyNetwork.reset();
				countlyNetwork.setSegment($(this).data("value"));
                self.refresh();
			});
        }
    },
    drawMap:function(){
        this.map.radius(this.baseRadius*this.curRadius, this.baseRadius*this.baseBlur*this.curBlur);
        this.map.draw();
    },
    refresh:function () {
        var self = this;
        $.when(countlyNetwork.loadActionsData(this.view)).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            var data = countlyNetwork.getActionsData();
            if(self.map){
                self.map.clear();
                self.map.data(self.getData(data.data));
                self.baseRadius = Math.max((48500-35*data.data.length)/900, 5);
                self.drawMap();
            }
        });
    }
});



window.NetworkErrorView = countlyView.extend({
	initialize:function () {
        this.loaded = true;
    },
    beforeRender: function() {
        countlyNetwork.reset();
		// if(this.template)
		// 	return $.when(countlyNetwork.initialize(this.id)).then(function () {});
		// else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/network/templates/networkerror.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyNetwork.initialize(this.id)).then(function () {});
		// }
    },
    renderCommon:function (isRefresh) {
        var crashData = countlyNetwork.getGroupData();
        var url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+countlyGlobal["path"]+"/crash/";
       
        if(crashData.url)
               url += crashData.url;
        crashData.latest_version="12:03";
		crashData.latest_version = crashData.latest_version.replace(/:/g, '.');
        
        this.comments = {};
        
        if(typeof marked != "undefined"){
            marked.setOptions({
                breaks: true
            });
        }
        
        // if(crashData.comments){
        //     for(var i = 0; i < crashData.comments.length; i++){
        //         this.comments[crashData.comments[i]._id] = crashData.comments[i].text;
        //         if(typeof marked != "undefined")
        //             crashData.comments[i].html = marked(crashData.comments[i].text);
        //         else
        //             crashData.comments[i].html = crashData.comments[i].text;
        //     }
        // }
		
		// if (!isRefresh) {
		// 	this.metrics = countlyCrashes.getMetrics();
        //     for(var i in this.metrics){
        //         for(var j in this.metrics[i]){
        //             this.curMetric = j;
        //             this.curTitle = this.metrics[i][j];
        //             break;
        //         }
        //         break;
        //     }
		// }
        // var ranges = ["ram", "disk", "bat", "run"];
        // for(var i = 0; i < ranges.length; i++){
        //     if(!crashData[ranges[i]]){
        //         crashData[ranges[i]] = {min:0, max:0, total:0, count:1};
        //     }
        // }
        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.crashes-by"],
            "note-placeholder": jQuery.i18n.map["crashes.editnote"],
            "hasPermission": (countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]) ? true : false,
            "url":url,
			"data":crashData,
			// "error":crashData[0].name.substr(0, 80),
            // "fatal": (crashData[0].nonfatal) ? jQuery.i18n.map["crashes.nonfatal"] : jQuery.i18n.map["crashes.fatal"],
			"active-segmentation": this.curTitle,
			"segmentations": this.metrics,
			// "big-numbers":{
            //     "class":"four-column",
            //     "items":[
			// 		{
            //             "title":jQuery.i18n.map["crashes.platform"],
            //             "total":(crashData[0].not_os_specific) ? jQuery.i18n.map["crashes.varies"] : crashData[0].os,
            //             "help":"crashes.help-platform"
            //         },
            //         {
            //             "title":jQuery.i18n.map["crashes.reports"],
            //             "total":crashData[0].reports,
            //             "help":"crashes.help-reports"
            //         },
            //         {
            //             "title":jQuery.i18n.map["crashes.affected-users"],
            //             "total":crashData[0].users + " ("+((crashData[0].users/crashData[0].total)*100).toFixed(2)+"%)",
            //             "help":"crashes.help-affected"
            //         },
			// 		{
            //             "title":jQuery.i18n.map["crashes.highest-version"],
            //             "total":crashData.latest_version.replace(/:/g, '.'),
            //             "help":"crashes.help-app-version"
            //         }
            //     ]
            // }
        };
        // if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type != "web"){
        //     this.templateData["ranges"]=[
        //         {
        //             "title":jQuery.i18n.map["crashes.ram"],
        //             "icon":"memory",
        //             "help":"crashes.help-ram",
        //             "min":crashData.ram.min+" %",
        //             "max":crashData.ram.max+" %",
        //             "avg":(crashData[0].ram.total/crashData[0].ram.count).toFixed(2)+" %"
        //         },
        //         {
        //             "title":jQuery.i18n.map["crashes.disk"],
        //             "icon":"sd_storage",
        //             "help":"crashes.help-disk",
        //             "min":crashData[0].disk.min+" %",
        //             "max":crashData[0].disk.max+" %",
        //             "avg":(crashData[0].disk.total/crashData[0].disk.count).toFixed(2)+" %"
        //         },
        //         {
        //             "title":jQuery.i18n.map["crashes.battery"],
        //             "icon":"battery_full",
        //             "help":"crashes.help-battery",
        //             "min":crashData[0].bat.min+" %",
        //             "max":crashData[0].bat.max+" %",
        //             "avg":(crashData[0].bat.total/crashData[0].bat.count).toFixed(2)+" %"
        //         },
        //         {
        //             "title":jQuery.i18n.map["crashes.run"],
        //             "icon":"play_arrow",
        //             "help":"crashes.help-run",
        //             "min":countlyCommon.timeString(crashData[0].run.min/60),
        //             "max":countlyCommon.timeString(crashData[0].run.max/60),
        //             "avg":countlyCommon.timeString((crashData[0].run.total/crashData[0].run.count)/60)
        //         }
        //     ];
            
        //     this.templateData["bars"]=[
        //         {
        //             "title":jQuery.i18n.map["crashes.root"],
        //             "data": countlyCrashes.getBoolBars("root"),
        //             "help":"crashes.help-root"
        //         },
        //         {
        //             "title":jQuery.i18n.map["crashes.online"],
        //             "data":countlyCrashes.getBoolBars("online"),
        //             "help":"crashes.help-online"
        //         },
        //         {
        //             "title":jQuery.i18n.map["crashes.muted"],
        //             "data": countlyCrashes.getBoolBars("muted"),
        //             "help":"crashes.help-muted"
        //         },
        //         {
        //             "title":jQuery.i18n.map["crashes.background"],
        //             "data": countlyCrashes.getBoolBars("background"),
        //             "help":"crashes.help-background"
        //         }
        //     ];
        // }
        // if(crashData.loss){
        //     this.templateData["loss"] = true;
        //     this.templateData["big-numbers"]["items"].push({
        //         "title":jQuery.i18n.map["crashes.loss"],
        //         "total":parseFloat(crashData[0].loss).toFixed(2),
        //         "help":"crashes.help-loss"
        //     });
        // }
        
        // if(this.templateData["big-numbers"]["items"].length == 3)
        //     this.templateData["big-numbers"]["class"] = "three-column";
        // else if(this.templateData["big-numbers"]["items"].length == 5)
        //     this.templateData["big-numbers"]["class"] = "five-column";
        
       
      

		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            // changeResolveStateText(crashData);
            //  if(typeof addDrill != "undefined"){
            //     $("#content .widget:first-child .widget-header>.right").append(addDrill("sg.crash", this.id, "[CLY]_crash"));
            // }
            // $(".back-link").click(function(e){
            //     e.preventDefault();
            //     window.history.back();
            //     return false;
            // });
            // if(crashData.comments){
            //     var count = 0;
            //     for(var i = 0; i < crashData.comments.length; i++){
            //         if(!crashData.comments[i].is_owner && typeof store.get("countly_"+this.id+"_"+crashData.comments[i]._id) == "undefined"){
            //             count++;
            //         }
            //     }
            //     if(count > 0){
            //         $(".crash-comment-count span").text(count+"");
            //         $(".crash-comment-count").show();
            //     }
            // }
			// $(".segmentation-option").on("click", function () {
			// 	self.switchMetric($(this).data("value"));
			// });
			this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaSorting": [[0,'desc']],
                "aaData": crashData || [],
				"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData._id);
				},
                "aoColumns": [
                    { "mData": function(row, type){if(type == "display") return countlyCommon.formatTimeAgo(row.ts); else return row.ts;}, "sType":"format-ago", "sTitle": jQuery.i18n.map["error.time"]},
                    // { "mData": function(row, type){return row.url;}, "sType":"string", "sTitle": jQuery.i18n.map["network.table.url"] },
                    { "mData": function(row, type){return row.name;}, "sType":"string", "sTitle": jQuery.i18n.map["error.name"] },
                    { "mData": function(row, type){return row.code;}, "sType":"numeric", "sTitle": jQuery.i18n.map["error.code"] },
					{ "mData": function(row, type){var str = row.os; if(row.os_version) str += " "+row.os_version.replace(/:/g, '.'); return str;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.os_version"] },
					{ "mData": function(row, type){var str = ""; if(row.manufacture) str += row.manufacture+" "; if(row.device) str += countlyDeviceList[row.device] || row.device; return str;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.device"]},
					{ "mData": function(row, type){return row.app_version.replace(/:/g, '.');}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.app_version"] }
                ]
            }));
			this.dtable.stickyTableHeaders();
			
			/*$('.crash-reports tbody').on("click", "tr", function (){
				var id = $(this).attr("id");
				if(id)
					window.location.hash = window.location.hash.toString()+"/"+id;
			});*/
			CountlyHelpers.expandRows(this.dtable, this.formatData);
			// countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
 
         
            $(".btn-share-crash").click(function(e){
				if ($(this).hasClass("active")) {
                    $(this).removeClass("active");
                    $("#crash-share-list").hide();
                }
                else{
                    $(this).addClass("active");
                    $("#crash-share-list").show();
                }
			});

            $("#share-crash-done").click(function() {
                $(".btn-share-crash").removeClass("active");
                $("#crash-share-list").hide();
            }); 
            
            if(crashData.is_public){
                $('#crash-share-public').attr('checked', true);
                $(".crash-share").show();
            }
            else{
                $('#crash-share-public').attr('checked', false);
                $(".crash-share").hide();
            }
            
            if(crashData.share){
                for(var i in crashData.share){
                    if(crashData.share[i])
                        $('#crash-share-'+i).attr('checked', true);
                }
            }
          
            
            $( "#tabs" ).tabs({
                select: function( event, ui ) {
                    $(".flot-text").hide().show(0);
                }
            });
            $( "#crash-notes" ).click(function(){
                var crashData = countlyNetwork.getGroupData();
                if(crashData.comments){
                    for(var i = 0; i < crashData.comments.length; i++){
                        store.set("countly_"+self.id+"_"+crashData.comments[i]._id, true);
                    }
                    $(".crash-comment-count").hide();
                }
            });
           

            $("#expand-crash").on("click", function() {
                $(this).toggleClass("active");
                $("#expandable").toggleClass("collapsed");
            });

            var errorHeight = $("#expandable").find("code").outerHeight();

            if (errorHeight < 200) {
                $("#expandable").removeClass("collapsed");
                $("#expand-crash").hide();
            } else {
                $("#expandable").addClass("collapsed");
                $("#expand-crash").show();
            }
        }

        $("document").ready(function() {
            self.redecorateStacktrace();
        });
        
        var self = this;
        
    },
    redecorateStacktrace:function(){
         $(".crash-stack .line-number").remove();
         $(".crash-stack .cl").remove();
        
    },
    refresh:function () {
        var self = this;
        if(this.loaded){
            this.loaded = false;
            $.when(countlyNetwork.initialize(this.id, true)).then(function () {
                self.loaded = true;
                if (app.activeView != self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
                $(".grouped-numbers").replaceWith(newPage.find(".grouped-numbers"));
                $(".crash-bars").replaceWith(newPage.find(".crash-bars"));

                var crashData = countlyNetwork.getGroupData();
                $("#error pre code").html(crashData.error);
                var errorHeight = $("#expandable").find("code").outerHeight();

                if (errorHeight < 200) {
                    $("#expandable").removeClass("collapsed");
                    $("#expand-crash").hide();
                } else {
                    if($('#expand-crash:visible').length == 0){
                        $("#expandable").addClass("collapsed");
                        $("#expand-crash").show();
                    }
                }

                self.redecorateStacktrace();
                if(crashData.comments){
                    var container = $("#comments");
                    var comment, parent;
                    var count = 0;
                    for(var i = 0; i < crashData.comments.length; i++){
                        self.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                        comment = crashData.comments[i];
                        if(container.find("#comment_"+comment._id).length){
                            parent = container.find("#comment_"+comment._id);
                            parent.find(".text").html(newPage.find("#comment_"+comment._id+" .text").html());
                            parent.find(".author").html(newPage.find("#comment_"+comment._id+" .author").html());
                            parent.find(".time").html(newPage.find("#comment_"+comment._id+" .time").html());
                        }
                        else
                            container.append(newPage.find("#comment_"+comment._id));
                        
                        if(!crashData.comments[i].is_owner && typeof store.get("countly_"+self.id+"_"+comment._id) == "undefined"){
                            count++;
                        }
                    }
                    if(count > 0){
                        $(".crash-comment-count span").text(count+"");
                        $(".crash-comment-count").show();
                    }
                }
                CountlyHelpers.refreshTable(self.dtable, crashData);
                // countlyCommon.drawGraph(crashData.dp[self.curMetric], "#dashboard-graph", "bar");
                CountlyHelpers.reopenRows(self.dtable, self.formatData);
                app.localize();
            });
        }
    },
	formatData: function( data ) {
		// `d` is the original data object for the row
		var str = '';
		if(data){
			str += '<div class="datatablesubrow">'+
				'<table style="width: 100%;">'+
						'<tr>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.app_version"]+'</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.device"]+'</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.state"]+'</td>';
                            if(data.custom)
                                str += '<td class="text-left">'+jQuery.i18n.map["crashes.custom"]+'</td>';
						str += '</tr>'+
						'<tr>'+
							'<td class="text-left">'+data.app_version.replace(/:/g, '.')+'</td>'+
							'<td class="text-left">'+data.os+' ';
                                if(data.os_version)
                                    str += data.os_version.replace(/:/g, '.')+'<br/>';
                                if(data.manufacture)
                                    str += data.manufacture;+' ';
                                if(data.device)
                                    str += data.device;
                                if(data.cpu)
                                    str += ' ('+data.cpu+')';
				str += '<br/>';
                                if(data.opengl)
                                    str += jQuery.i18n.map["crashes.opengl"]+': '+data.opengl+'<br/>';
                                if(data.resolution)
                                    str += jQuery.i18n.map["crashes.resolution"]+': '+data.resolution+'<br/>';
                                str += jQuery.i18n.map["crashes.root"]+': '+((data.root)? "yes" : "no")+'<br/>';
                            str += '</td>'+
                            '<td class="text-left">';
                                if(data.ram_current && data.ram_total)
                                    str += jQuery.i18n.map["crashes.ram"]+': '+data.ram_current+'/'+data.ram_total+' Mb<br/>';
                                if(data.disk_current && data.disk_total)
                                    str += jQuery.i18n.map["crashes.disk"]+': '+data.disk_current+'/'+data.disk_total+' Mb<br/>';
                                if(data.bat_current)
                                    str += jQuery.i18n.map["crashes.battery"]+': '+data.bat_current+'%<br/>';
                                if(data.run)
                                    str += jQuery.i18n.map["crashes.run"]+': '+countlyCommon.timeString(data.run/60)+'<br/>';
                                if(data.session)
                                    str += jQuery.i18n.map["crashes.after"]+' '+data.session+' '+jQuery.i18n.map["crashes.sessions"]+'<br/>';
                                else
                                    str += jQuery.i18n.map["crashes.frequency"]+': '+jQuery.i18n.map["crashes.first-crash"]+'<br/>';
                                str += jQuery.i18n.map["crashes.online"]+": "+((data.online)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.background"]+": "+((data.background)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.muted"]+": "+((data.muted)? "yes" : "no")+"<br/>";
                            str += '</td>';
                            if(data.custom){
                                str += '<td class="text-left">';
                                for(var i in data.custom){
                                    str += i+': '+data.custom[i]+'<br/>';
                                }
                                str += '</td>';
                            }
						str += '</tr>'+
                        '<tr>'+
                        '<td colspan="4" class="stack-trace">';
                        str += '<pre>' + data.error + '</pre></td>'+
						'</tr>';
                        if(data.logs){
                            str += '<tr>'+
                                '<td class="text-left">'+jQuery.i18n.map["crashes.logs"]+'</td>'+
                            '</tr>'+
                            '<tr>'+
                            '<td colspan="4">'+
                                '<pre>' + data.logs + '</pre></td>'+
                            '</tr>';
                        }
						str += '</table>'+
			'</div>';
		}
		return str;
	},
	switchMetric:function(metric){
		this.curMetric = metric;
		var crashData = countlyNetwork.getGroupData();
		countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
	}
});



window.networkMetricView = countlyView.extend({
    convertFilter: {
        "sg.crash":{prop:"_id", type:"string"},
        "sg.cpu":{prop:"cpu", type:"segment"},
        "sg.opengl":{prop:"opengl", type:"segment"},
        "sg.os":{prop:"os", type:"string"},
        "sg.orientation":{prop:"orientation", type:"segment"},
        "sg.nonfatal":{prop:"nonfatal", type:"booltype"},
        "sg.root":{prop:"root", type:"boolsegment"},
        "sg.online":{prop:"online", type:"boolsegment"},
        "sg.signal":{prop:"signal", type:"boolsegment"},
        "sg.muted":{prop:"muted", type:"boolsegment"},
        "sg.background":{prop:"background", type:"boolsegment"},
        "up.d":{prop:"device", type:"segment"},
        "up.pv":{prop:"os_version", type:"segment"},
        "up.av":{prop:"app_version", type:"segment"},
        "up.r":{prop:"resolution", type:"segment"},
        "up.ls":{prop:"lastTs", type:"date"},
        "up.fs":{prop:"startTs", type:"date"},
        "is_new":{prop:"is_new", type:"booltype"},
        "is_resolved":{prop:"is_resolved", type:"booltype"},
        "is_hidden":{prop:"is_hidden", type:"booltype"},
        "is_renewed":{prop:"is_renewed", type:"booltype"},
        "reports":{prop:"reports", type:"number"},
        "users":{prop:"reports", type:"number"},
        "ram_min":{prop:"ram.min", type:"number"},
        "ram_max":{prop:"ram.max", type:"number"},
        "bat_min":{prop:"bat.min", type:"number"},
        "bat_max":{prop:"bat.max", type:"number"},
        "disk_min":{prop:"disk.min", type:"number"},
        "disk_max":{prop:"disk.max", type:"number"},
        "run_min":{prop:"run.min", type:"number"},
        "run_max":{prop:"run.max", type:"number"}
    },
	initialize:function () {
        this.loaded = true;
		this.filter = (store.get("countly_crashfilter")) ? store.get("countly_crashfilter") : "crash-all";
        this.curMetric = "cr";
        this.metrics = {
			cr:jQuery.i18n.map["crashes.total"],
			cru:jQuery.i18n.map["crashes.unique"],
			crnf:jQuery.i18n.map["crashes.nonfatal"]+" "+jQuery.i18n.map["crashes.title"],
			crf:jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
			crru:jQuery.i18n.map["crashes.resolved-users"]
		};
    },
    beforeRender: function() {
        this.selectedCrashes = {};
        this.selectedCrashesIds = [];
		if(this.template)
			return $.when(countlyCrashes.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/network/templates/metrics.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyCrashes.initialize()).then(function () {});
		}
    },
    // processData:function(){
    //     var self = this;
    //     var crashData = countlyCrashes.getData();
    //     this.dtable = $('#crash-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
    //         "aaSorting": [[ 5, "desc" ]],
    //         "bServerSide": true,
    //         "sAjaxSource": countlyCommon.API_PARTS.data.r + "?api_key="+countlyGlobal.member.api_key+"&app_id="+countlyCommon.ACTIVE_APP_ID+"&method=crashes",
    //         "fnServerData": function ( sSource, aoData, fnCallback ) {
    //             $.ajax({
    //                 "dataType": 'jsonp',
    //                 "type": "POST",
    //                 "url": sSource,
    //                 "data": aoData,
    //                 "success": function(data){
    //                     fnCallback(data);
    //                     $("#view-filter .bar-values").text(jQuery.i18n.prop('crashes.of-users', data.iTotalDisplayRecords, data.iTotalRecords));
    //                     $("#view-filter .bar span").text(Math.floor((data.iTotalDisplayRecords/data.iTotalRecords)*100)+"%");
    //                     $("#view-filter .bar .bar-inner").animate({width: Math.floor((data.iTotalDisplayRecords/data.iTotalRecords)*100)+"%"}, 1000);
    //                 }
    //             });
    //         },
    //         "fnServerParams": function ( aoData ) {
    //             if(self.filter){
    //                 aoData.push( { "name": "filter", "value": self.filter } );
    //             }
    //             if(self._query){
    //                 aoData.push({ "name": "query", "value": JSON.stringify(self._query) });
    //             }
    //         },
	// 		"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
	// 			$(nRow).attr("id", aData._id);

    //             if(aData.is_resolved)
    //                 $(nRow).addClass("resolvedcrash");
	// 			else if(aData.is_new)
	// 				$(nRow).addClass("newcrash");
    //             else if(aData.is_renewed)
    //                 $(nRow).addClass("renewedcrash");

    //             $(nRow).find(".tag").tipsy({gravity: 'w'});
	// 		},
    //         "aoColumns": [
    //             { "mData": function(row, type){
    //                 if(self.selectedCrashes[row._id])
    //                     return "<a class='fa fa-check-square check-green' id=\"" + row._id + "\"></a>";
    //                 else
    //                     return "<a class='fa fa-square-o check-green'  id=\"" + row._id + "\"></a>";
    //             }, "sType":"numeric", "sClass":"center", "sWidth": "30px", "bSortable": false, "sTitle": "<a class='fa fa-square-o check-green check-header'></a>"},
    //             {
    //                 "mData": function(row, type) {
    //                     if(type !== "display")
    //                         return row.name;
    //                     var tagDivs = "";

    //                     // This separator is not visible in the UI but | is visible in exported data
    //                     var separator = "<span class='separator'>|</span>";
                   
    //                     if(row.is_resolving) {
    //                         tagDivs += separator + "<div class='tag'>" + "<span style='color:green;'>" + jQuery.i18n.map["crashes.resolving"] + "</span>" + "</div>";
    //                     }else if (row.is_resolved) {
    //                         tagDivs += separator + "<div class='tag'>" + "<span style='color:green;'>" + jQuery.i18n.map["crashes.resolved"] + " (" + row.latest_version.replace(/:/g, '.') + ")</span>" + "</div>";
    //                     } else {
    //                         tagDivs += separator + "<div class='tag'>" + "<span style='color:red;'>" + jQuery.i18n.map["crashes.unresolved"] + "</span>" + "</div>";
    //                     } 

    //                     if (row.nonfatal) {
    //                         tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.nonfatal"] + "</div>";
    //                     } else {
    //                         tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.fatal"] + "</div>";
    //                     }

    //                     if (row.session) {
    //                         tagDivs += separator + "<div class='tag'>" + ((Math.round(row.session.total / row.session.count) * 100) / 100) + " " + jQuery.i18n.map["crashes.sessions"] + "</div>";
    //                     } else {
    //                         tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.first-crash"] + "</div>";
    //                     }

    //                     tagDivs += "<div class='tag not-viewed' title='" + jQuery.i18n.map["crashes.not-viewed"] + "'><i class='fa fa-eye-slash'></i></div>";
    //                     tagDivs += "<div class='tag re-occurred' title='" + jQuery.i18n.map["crashes.re-occurred"] + "'><i class='fa fa-refresh'></i></div>";

    //                     return "<div class='truncated'>" + row.name + "</div>" + tagDivs;
    //                 },
    //                 "sType": "string",
    //                 "sTitle": jQuery.i18n.map["crashes.error"]
    //             },
    //             {
    //                 "mData": function(row, type) {
    //                     return (row.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : row.os;
    //                 },
    //                 "sType": "string",
    //                 "sTitle": jQuery.i18n.map["crashes.platform"],
    //                 "sWidth": "90px"
    //             },
    //             {
    //                 "mData": "reports",
    //                 "sType": "numeric",
    //                 "sTitle": jQuery.i18n.map["crashes.reports"],
    //                 "sWidth": "90px"
    //             },
    //             {
    //                 "mData": function(row, type) {
    //                     row.users = row.users || 1;
    //                     if (type == "display") {
    //                         return row.users + " (" + ((row.users / crashData.users.total) * 100).toFixed(2) + "%)";
    //                     } else {
    //                         return row.users;
    //                     }
    //                 },
    //                 "sType": "string",
    //                 "sTitle": jQuery.i18n.map["crashes.users"],
    //                 "sWidth": "90px"
    //             },
    //             {
    //                 "mData": function(row, type) {
    //                     if (type == "display") {
    //                         return countlyCommon.formatTimeAgo(row.lastTs);
    //                     } else {
    //                         return row.lastTs;
    //                     }
    //                 },
    //                 "sType": "format-ago",
    //                 "sTitle": jQuery.i18n.map["crashes.last_time"],
    //                 "sWidth": "150px"
    //             },
    //             {
    //                 "mData": function(row, type) {
    //                     if (type == "display") {
    //                         return countlyCommon.formatTimeAgo(row.startTs);
    //                     } else {
    //                         return row.lastTs;
    //                     }
    //                 },
    //                 "sType": "format-ago",
    //                 "sTitle": jQuery.i18n.map["crashes.start_time"],
    //                 "sWidth": "150px"
    //             },
    //             {
    //                 "mData": function(row, type) {
    //                     return row.latest_version.replace(/:/g, '.');
    //                 },
    //                 "sType": "string",
    //                 "sTitle": jQuery.i18n.map["crashes.latest_app"],
    //                 "sWidth": "90px"
    //             },
    //             { "mData": function(row, type){return "<p class='table-link green'>" + jQuery.i18n.map["common.view"] + "</a>"; }, "sType":"numeric", "sClass":"center", "sWidth": "90px", "bSortable": false}
    //         ],
    //         "fnInitComplete": function(oSettings, json) {
    //             $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
    //             var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
    //             tableWrapper.find(".dataTables_filter input").attr("placeholder",jQuery.i18n.map["crashes.search"]);

    //             // init sticky headers here in order to wait for correct
    //             // table width (for multi select checkboxes to render)
    //             self.dtable.stickyTableHeaders();
    //         }
    //     }));

		//this.dtable.fnSort( [ [5,'desc'] ] );
        // this.dtable.find("thead .check-green").click(function(){
        //     if($(this).hasClass("fa-check-square")){
        //         $(".sticky-header .check-green").removeClass("fa-check-square").addClass("fa-square-o");
        //         self.dtable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
        //         self.selectedCrashesIds = [];
        //         self.selectedCrashes = {};
        //         $(".action-segmentation").addClass("disabled");
        //     }
        //     else{
        //         $(".sticky-header .check-green").removeClass("fa-square-o").addClass("fa-check-square");
        //         self.dtable.find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
        //         self.dtable.find(".check-green").parents("tr").each(function(){
        //             var id = $(this).attr("id");
        //             if(id){
        //                 if(!self.selectedCrashes[id]){
        //                     self.selectedCrashesIds.push(id);
        //                 }
        //                 self.selectedCrashes[id] = true;
        //                 $(".action-segmentation").removeClass("disabled");
        //             }
        //         });
        //     }
        // });

    
    
        // $('.crashes tbody ').on("click", "tr", function (){
        //     var id = $(this).attr("id");
        //     if(id){
        //         var link = "#/crashes/" + id ;
        //         window.open(link, "_self");
        //     } 
        // });

        // $('.crashes tbody ').on("click", "td:first-child", function (e){
        //     e.cancelBubble = true;                       // IE Stop propagation
        //     if (e.stopPropagation) e.stopPropagation();  // Other Broswers
        //     var id = $(this).parent().attr("id");
        //     if(id){
        //         if(self.selectedCrashes[id]){
        //             $(this).find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
        //             self.selectedCrashes[id] = null;
        //             var index = self.selectedCrashesIds.indexOf(id);
        //             if(index !== -1)
        //                 self.selectedCrashesIds.splice(index, 1);
        //         }
        //         else{
        //             self.selectedCrashes[id] = true;
        //             self.selectedCrashesIds.push(id);
        //             $(this).find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
        //         }
                
        //         if(self.selectedCrashesIds.length)
        //             $(".action-segmentation").removeClass("disabled");
        //         else
        //             $(".action-segmentation").addClass("disabled");
        //     }
		// });
         
        // $(".filter-segmentation").on("cly-select-change", function (e, val) {
        //     self.filterCrashes(val);
        // });
        // $(".action-segmentation").on("cly-select-change", function (e, val) {
        //     if(val != ""){
        //         $(".action-segmentation").clySelectSetSelection("",jQuery.i18n.map["crashes.make-action"]);
        //         if(val === "crash-resolve"){
        //             CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-resolved", self.selectedCrashesIds.length), "red", function (result) {
        //                 if (!result) {
        //                     return true;
        //                 }
        //                 countlyCrashes.markResolve(self.selectedCrashesIds, function(data){
        //                     if(!data){
        //                         CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
        //                         self.resetSelection(true);
        //                     } 
        //                 });
        //             });
        //         }
        //         else if(val === "crash-unresolve"){
        //             CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-unresolved", self.selectedCrashesIds.length), "red", function (result) {
        //                 if (!result) {
        //                     return true;
        //                 }
        //                 countlyCrashes.markUnresolve(self.selectedCrashesIds, function(data){
        //                     if(!data){
        //                         CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
        //                     }
        //                     else{
        //                         self.resetSelection(true);
        //                     }
        //                 });
        //             });
        //         }
        //         else if(val === "crash-hide"){
        //             CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-hide", self.selectedCrashesIds.length), "red", function (result) {
        //                 if (!result) {
        //                     return true;
        //                 }
        //                 countlyCrashes.hide(self.selectedCrashesIds, function(data){
        //                     if(!data){
        //                         CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
        //                     }
        //                     else{
        //                         self.resetSelection(true);
        //                     }
        //                 });
        //             });
        //         }
        //         else if(val === "crash-resolving"){
        //             CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-resolving", self.selectedCrashesIds.length), "red", function (result) {
        //                 if (!result) {
        //                     return true;
        //                 }
        //                 countlyCrashes.resolving(self.selectedCrashesIds, function(data){
        //                     if(!data){
        //                         CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
        //                     }
        //                     else{
        //                         self.resetSelection(true);
        //                     }
        //                 });
        //             });
        //         } 
        //         else if(val === "crash-delete"){
        //             CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-delete", self.selectedCrashesIds.length), "red", function (result) {
        //                 if (!result) {
        //                     return true;
        //                 }
        //                 countlyCrashes.del(self.selectedCrashesIds, function(data){
        //                     if(!data){
        //                         CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
        //                     }
        //                     else{
        //                         self.resetSelection(true);
        //                     }
        //                 });
        //             });
        //         }
        //     }
        // });  
    // },
    // resetSelection: function(flash){
    //     if(flash){
    //         this.dtable.find(".fa-check-square.check-green").parents("tr").addClass("flash");
    //     }
    //     this.selectedCrashesIds = [];
    //     this.selectedCrashes = {};
    //     this.dtable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
    //     $(".action-segmentation").addClass("disabled");
    //     this.refresh();
    // },
    renderCommon:function (isRefresh) {
        var crashData = countlyCrashes.getData();
        var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
        var dashboard = countlyCrashes.getDashboardData();
        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.title"],
            "no-data":jQuery.i18n.map["common.bar.no-data"],
            "usage":[
				{
					"title":jQuery.i18n.map["crashes.total"],
					"data":dashboard.usage['cr'],
					"id":"crash-cr",
                    "help":"crashes.help-total"
				},
				{
					"title":jQuery.i18n.map["crashes.unique"],
					"data":dashboard.usage['cru'],
					"id":"crash-cru",
                    "help":"crashes.help-unique"
				},
				{
					"title":jQuery.i18n.map["crashes.nonfatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['crnf'],
					"id":"crash-crnf",
                    "help":"crashes.help-nonfatal"
				},
				{
					"title":jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['crf'],
					"id":"crash-crf",
                    "help":"crashes.help-fatal"
				}/*,
				{
					"title":jQuery.i18n.map["crashes.resolved-users"],
					"data":dashboard.usage['crru'],
					"id":"crash-crru",
                    "help":"crashes.help-resolved-users"
				}*/
			]
			// "big-numbers":{
            //     "items":[
            //         {
            //             "title":jQuery.i18n.map["crashes.unresolved-crashes"],
            //             "total":crashData.crashes.unresolved,
            //             "help":"crashes.help-unresolved"
            //         },
            //         {
            //             "title":jQuery.i18n.map["crashes.highest-version"],
            //             "total":crashData.crashes.highest_app,
            //             "help":"crashes.help-latest-version"
            //         },
            //         {
            //             "title":jQuery.i18n.map["crashes.new-crashes"],
            //             "total":crashData.crashes.news,
            //             "help":"crashes.help-new"
            //         },
            //         {
            //             "title":jQuery.i18n.map["crashes.renew-crashes"],
            //             "total":crashData.crashes.renewed,
            //             "help":"crashes.help-reoccurred"
            //         }
            //     ]
            // },
			// "bars":[
            //     {
            //         "title":jQuery.i18n.map["crashes.resolution-status"],
            //         "data": countlyCrashes.getResolvedBars(),
            //         "help":"crashes.help-resolved"
            //     },
			// 	{
            //         "title":jQuery.i18n.map["crashes.affected-users"],
            //         "data":countlyCrashes.getAffectedUsers(),
            //         "help":"crashes.help-affected-levels"
            //     },
            //     {
            //         "title":jQuery.i18n.map["crashes.platform"],
            //         "data": countlyCrashes.getPlatformBars(),
            //         "help":"crashes.help-platforms"
            //     },
			// 	{
            //         "title":jQuery.i18n.map["crashes.fatality"],
            //         "data": countlyCrashes.getFatalBars(),
            //         "help":"crashes.help-fatals"
            //     }
            // ],
            // hasDrill: typeof this.initDrill !== "undefined",
            // "active-filter": jQuery.i18n.map["crashes.all"],
            // "active-action": jQuery.i18n.map["crashes.make-action"]
        };
        if(crashData.loss){
            this.templateData["loss"] = true;
            this.templateData["big-numbers"]["items"].push({
                "title":jQuery.i18n.map["crashes.loss"],
                "total":crashData.loss.toFixed(2),
                "help":"crashes.help-loss"
            });
        }
		var self = this;

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#total-user-estimate-ind").on("click", function() {
                CountlyHelpers.alert(jQuery.i18n.map["common.estimation"], "black");
            });

            $(".filter-segmentation").clySelectSetSelection(this.filter, jQuery.i18n.map["crashes."+this.filter.split("-").pop()]);
			countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");

            $("#crash-"+this.curMetric).parents(".big-numbers").addClass("active");

            $(".widget-content .inner").click(function () {
				$(".big-numbers").removeClass("active");
				$(".big-numbers .select").removeClass("selected");
				$(this).parent(".big-numbers").addClass("active");
				$(this).find('.select').addClass("selected");
			});

            $(".big-numbers .inner").click(function () {
				var elID = $(this).find('.select').attr("id");
                if(elID){
                    if (self.curMetric == elID.replace("crash-", "")) {
                        return true;
                    }
                    self.curMetric = elID.replace("crash-", "");
                    self.switchMetric();
                }
			});
            // if(typeof self.initDrill !== "undefined"){
            //     self.byDisabled = true;
            //     $.when(countlySegmentation.initialize("[CLY]_crash")).then(function () {
            //         self.initDrill();
            //         var lookup = {};
            //         setTimeout(function() {
            //             self.filterBlockClone = $("#filter-view").clone(true);
            //             if(self._filter){
            //                 $("#filter-view").show();
            //                 $(".filter-view-container").show();
            //                 self.adjustFilters();
            //                 var lookup = {};
            //                 for(var i in self.convertFilter){
            //                     lookup[self.convertFilter[i].prop] = i;
            //                 }
            //                 var filter = self._query;
            //                 var inputs = [];
            //                 var subs = {};
            //                 for(var i in filter){
            //                     inputs.push(i);
            //                     subs[i] = [];
            //                     for(var j in filter[i]){
            //                         if(filter[i][j].length){
            //                             for(var k = 0; k < filter[i][j].length; k++){
            //                                 subs[i].push([j, filter[i][j][k]]);
            //                             }
            //                         }
            //                         else{
            //                             subs[i].push([j, filter[i][j]]);
            //                         }
            //                     }
            //                 }
            //                 function setInput(cur, sub, total){
            //                     sub = sub || 0;
            //                     if(inputs[cur]){
            //                         var filterType = subs[inputs[cur]][sub][0];
            //                         if(filterType == "$in" || filterType == "$eq")
            //                             filterType = "=";
            //                         else if(filterType == "$nin" || filterType == "$ne")
            //                             filterType = "!=";
            //                         else if(filterType == "$exists"){
            //                             if(subs[inputs[cur]][sub][0])
            //                                 filterType = "=";
            //                             else
            //                                 filterType = "!=";
            //                         }
                
            //                         var val = subs[inputs[cur]][sub][1];
            //                         var el = $(".query:nth-child("+(total)+")");
            //                         el.find(".filter-name").trigger("click");
            //                         el.find(".filter-type").trigger("click");
            //                         var name = inputs[cur];
            //                         if(lookup[name])
            //                             name = lookup[name]
            //                         else if(name.indexOf(".") !== -1){
            //                             var parts = name.split(".");
            //                             if(lookup[parts[0]]){
            //                                 name = lookup[parts[0]];
            //                                 val = parts[1];
            //                             }
            //                         }
            //                         el.find(".filter-name").find(".select-items .item[data-value='" + name + "']").trigger("click");
            //                         el.find(".filter-type").find(".select-items .item[data-value='" + filterType + "']").trigger("click");
            //                         setTimeout(function() {
            //                             el.find(".filter-value").not(".hidden").trigger("click");
            //                             if(el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").length)
            //                                 el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").trigger("click");
            //                             else if(_.isNumber(val) && (val + "").length == 10){
            //                                 el.find(".filter-value.date").find("input").val(countlyCommon.formatDate(moment(val*1000),"DD MMMM, YYYY"));
            //                                 el.find(".filter-value.date").find("input").data("timestamp", val);
            //                             }
            //                             else
            //                                 el.find(".filter-value").not(".hidden").find("input").val(val);
                                        
            //                             if(subs[inputs[cur]].length == sub+1){
            //                                 cur++;
            //                                 sub = 0;
            //                             }
            //                             else
            //                                 sub++;
            //                             total++;
            //                             if(inputs[cur]){
            //                                 $("#filter-add-container").trigger("click");
            //                                 if(sub > 0)
            //                                     setTimeout(function() {
            //                                         var el = $(".query:nth-child("+(total)+")");
            //                                         el.find(".and-or").find(".select-items .item[data-value='OR']").trigger("click");
            //                                         setInput(cur, sub, total);
            //                                     }, 500);
            //                                 else
            //                                     setInput(cur, sub, total);
            //                             }
            //                             else{
            //                                 setTimeout(function(){
            //                                     $("#apply-filter").removeClass("disabled");
            //                                     $("#no-filter").hide();
            //                                     var filterData = self.getFilterObjAndByVal();
            //                                     $("#current-filter").show().find(".text").text(filterData.bookmarkText);
            //                                     $("#connector-container").show();
            //                                 }, 500);
            //                             }
            //                         }, 500);
            //                 }
            //                 }
            //                 setInput(0, 0, 1);
            //             }
            //         }, 0);
                    
            //         self.processData();
            //     });
            // }
            // else{
            //     $("#view-filter").hide();
            //     self.processData();
            // }

            $('.action-segmentation').attr('data-tooltip-content', "#action-segmentation-tooltip");

            $('.action-segmentation').tooltipster({
                theme: ['tooltipster-borderless'],
                contentCloning: false,
                interactive: false,
                trigger: 'hover',
                side: 'left',
                zIndex: 2,
                functionBefore: function() {
                    if (!$('.action-segmentation').hasClass("disabled")) {
                        return false;
                    }
                }
            });
        }
    },
    refresh:function () {
        var self = this;
        if(this.loaded){
            this.loaded = false;
            $.when(countlyCrashes.refresh()).then(function () {
                self.loaded = true;
                if (app.activeView != self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(".crashoveral .dashboard").replaceWith(newPage.find(".dashboard"));
                $(".crash-big-numbers").replaceWith(newPage.find(".crash-big-numbers"));
                $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
                
                $("#crash-"+self.curMetric).parents(".big-numbers").addClass("active");
                $(".widget-content .inner").click(function () {
                    $(".big-numbers").removeClass("active");
                    $(".big-numbers .select").removeClass("selected");
                    $(this).parent(".big-numbers").addClass("active");
                    $(this).find('.select').addClass("selected");
                });
                $(".big-numbers .inner").click(function () {
                    var elID = $(this).find('.select').attr("id");
        
                    if (self.curMetric == elID.replace("crash-", "")) {
                        return true;
                    }
        
                    self.curMetric = elID.replace("crash-", "");
                    self.switchMetric();
                });

                self.dtable.fnDraw(false);
                var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric]);
                countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
                //app.localize();
            });
        }
    },
	getExportQuery: function(){
        function replacer(key, value) {
            if (value instanceof RegExp)
                return ("__REGEXP " + value.toString());
            else
                return value;
        }
        var qstring = {
            api_key: countlyGlobal["member"].api_key,
            db: "countly",
            collection: "app_crashgroups"+countlyCommon.ACTIVE_APP_ID,
            query:this._query || {}
        };
        if($('.dataTables_filter input').val().length){
            qstring.query["name"] = {"$regex": new RegExp(".*"+$('.dataTables_filter input').val()+".*", 'i')};
        }
        if(this.filter && this.filter != ""){
            switch (this.filter) {
                case "crash-resolved":
                    qstring.query["is_resolved"] = true;
                    break;
                case "crash-hidden":
                    qstring.query["is_hidden"] = true;
                    break;
                case "crash-unresolved":
                    qstring.query["is_resolved"] = false;
                    break;
                case "crash-nonfatal":
                    qstring.query["nonfatal"] = true;
                    break;
                case "crash-fatal":
                    qstring.query["nonfatal"] = false;
                    break;
                case "crash-new":
                    qstring.query["is_new"] = true;
                    break;
                case "crash-viewed":
                    qstring.query["is_new"] = false;
                    break;
                case "crash-reoccurred":
                    qstring.query["is_renewed"] = true;
                    break;
                case "crash-resolving":
                    qstring.query["is_resolving"] = true;
                    break;
            }
        }
        if(this.filter !== "crash-hidden"){
            qstring.query["is_hidden"] = {$ne: true};
        }
        qstring.query["_id"] = {$ne:"meta"};
        qstring.query = JSON.stringify(qstring.query, replacer);
        return qstring;
    },
    filterCrashes: function(filter){
        this.filter = filter;  
		store.set("countly_crashfilter", filter);
		$("#"+this.filter).addClass("selected").addClass("active");
		this.dtable.fnDraw();
	},
    switchMetric:function(){
		var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
		countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
	},
    getFilters: function(currEvent) {
        var self = this;
        var usedFilters = {};

        $(".query:visible").each(function (index) {
            var filterType = $(this).find(".filter-name .text").data("type");

            // number and date types can be used multiple times for range queries
            if (filterType != "n" && filterType != "d") {
                usedFilters[$(this).find(".filter-name .text").data("value")] = true;
            }
        });

        var defaultFilters = countlySegmentation.getFilters(currEvent),
            allFilters = "";
        var filters = [];
        for(var i = 0; i < defaultFilters.length; i++){
            if(defaultFilters[i].id){
                if(self.convertFilter[defaultFilters[i].id])
                    filters.push(defaultFilters[i]);
            }
        }
        var add = {
            "is_new": jQuery.i18n.map["crashes.new-crashes"],
            "is_resolved": jQuery.i18n.map["crashes.resolved"],
            "is_hidden": jQuery.i18n.map["crashes.hidden"],
            "is_renewed": jQuery.i18n.map["crashes.renew-crashes"],
            "reports": jQuery.i18n.map["crashes.reports"],
            "users": jQuery.i18n.map["crashes.affected-users"],
            "ram_min": jQuery.i18n.map["crashes.ram"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "ram_max": jQuery.i18n.map["crashes.ram"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "bat_min": jQuery.i18n.map["crashes.battery"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "bat_max": jQuery.i18n.map["crashes.battery"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "disk_min": jQuery.i18n.map["crashes.disk"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "disk_max": jQuery.i18n.map["crashes.disk"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "run_min": jQuery.i18n.map["crashes.run"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "run_max": jQuery.i18n.map["crashes.run"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase()
        };
        
        for(var i in add){
            filters.push({id:i, name:add[i], type:(i.indexOf("is_") === 0) ? "l" : "n"});
        }

        if (filters.length == 0) {
            CountlyHelpers.alert(jQuery.i18n.map["drill.no-filters"], "black");
        }

        for (var i = 0; i < filters.length; i++) {
            if(typeof filters[i].id != "undefined"){
                if (usedFilters[filters[i].id] == true) {
                    continue;
                }
    
                var tmpItem = $("<div>");
    
                tmpItem.addClass("item");
                tmpItem.attr("data-type", filters[i].type);
                tmpItem.attr("data-value", filters[i].id);
                tmpItem.text(filters[i].name);
    
                allFilters += tmpItem.prop('outerHTML');
            }
            else{
                var tmpItem = $("<div>");
    
                tmpItem.addClass("group");
                tmpItem.text(filters[i].name);
    
                allFilters += tmpItem.prop('outerHTML');
            }
        }

        return allFilters;
    },
    setUpFilters: function(elem){
        var rootHTML = $(elem).parents(".query").find(".filter-value .select-items>div");
        if(this.convertFilter[$(elem).data("value")] && this.convertFilter[$(elem).data("value")].type === "boolsegment")
            this.setUpFilterValues(rootHTML, ["yes", "no"], ["yes", "no"]);
        else if(this.convertFilter[$(elem).data("value")] && this.convertFilter[$(elem).data("value")].type === "booltype")
            this.setUpFilterValues(rootHTML, [true, false], ["yes", "no"]);
        else
            this.setUpFilterValues(rootHTML, countlySegmentation.getFilterValues($(elem).data("value")), countlySegmentation.getFilterNames($(elem).data("value")));
    },
    generateFilter: function(filterObj, filterObjTypes) {
        var self = this;
        var dbFilter = {};
        for (var prop in filterObj) {
            var filter = (self.convertFilter[prop]) ? self.convertFilter[prop].prop : prop.replace("sg.","");
            for (var i = 0; i < filterObj[prop].length; i++) {
                if(_.isObject(filterObj[prop][i])) {
                    dbFilter[filter] = {};
                    for (var tmpFilter in filterObj[prop][i]) {
                        dbFilter[filter][tmpFilter] = filterObj[prop][i][tmpFilter];
                    }
                } else if (filterObjTypes[prop][i] == "!=") {
                    if(!self.convertFilter[prop] || self.convertFilter[prop].type === "segment" || self.convertFilter[prop].type === "boolsegment"){
                        if(filter === "os_version"){
                            filterObj[prop][i] = countlyDeviceDetails.getCleanVersion(filterObj[prop][i]);
                        }
                        dbFilter[filter+"."+filterObj[prop][i]] = {$exists:false};
                    }else if(self.convertFilter[prop].type === "booltype"){
                        if(filterObj[prop][i]==="true"){
                            dbFilter[filter] = {$ne: true};
                        }
                        else{
                            dbFilter[filter] = {$eq: true};
                        }
                    }else{
                        dbFilter[filter] = {};
                        if (!dbFilter[filter]["$nin"]) {
                            dbFilter[filter]["$nin"] = [];
                        }
                        dbFilter[filter]["$nin"].push(filterObj[prop][i]);
                    }
                } else {
                    if(!self.convertFilter[prop] || self.convertFilter[prop].type === "segment" || self.convertFilter[prop].type === "boolsegment"){
                        if(filter === "os_version"){
                            filterObj[prop][i] = countlyDeviceDetails.getCleanVersion(filterObj[prop][i]);
                        }
                        dbFilter[filter+"."+filterObj[prop][i]] = {$exists:true};
                    }else if(self.convertFilter[prop].type === "booltype"){
                        if(filterObj[prop][i]==="true"){
                            dbFilter[filter] = {$eq: true};
                        }
                        else{
                            dbFilter[filter] = {$ne: true};
                        }
                    }else{
                        dbFilter[filter] = {};
                        if (!dbFilter[filter]["$in"]) {
                            dbFilter[filter]["$in"] = [];
                        }
                        dbFilter[filter]["$in"].push(filterObj[prop][i]);
                    }
                }
            }
        }
        return dbFilter;
    },
    loadAndRefresh: function() {
        var filter = {};
        for(var i in this.filterObj){
            filter[i.replace("up.", "")] = this.filterObj[i];
        }
        this._query = filter;
        app.navigate("/crashes/filter/"+JSON.stringify(filter), false);
        this.dtable.fnPageChange(0);
        this.refresh(true);
    }
});


//register views

app.networkView = new NetworkView();
app.networkFrequencyView = new NetworkFrequencyView();
app.actionMapView = new ActionMapView();
app.networkErrorView = new NetworkErrorView();
app.networkMetric = new NetworkMetric();

app.route("/analytics/metrics", 'network', function () {
	this.renderWhenReady(this.networkMetric);
});

app.route("/analytics/network", 'network', function () {
	this.renderWhenReady(this.networkView);
});

app.route("/analytics/networkerror/:id", 'network', function (id) {
    this.networkErrorView.id=id;
	this.renderWhenReady(this.networkErrorView);
});

app.route("/analytics/view-frequency", 'network', function () {
	this.renderWhenReady(this.networkFrequencyView);
});

app.route("/analytics/network/action-map/*view", 'network', function (view) {
    this.actionMapView.view = view;
	this.renderWhenReady(this.actionMapView);
});

app.addPageScript("/drill#", function(){
    var drillClone;
    var self = app.drillView;
    if(countlyGlobal["record_views"]){
        $("#drill-types").append('<div id="drill-type-views" class="item">'+jQuery.i18n.map["network.title"]+'</div>');
        $("#drill-type-views").on("click", function() {
            if ($(this).hasClass("active")) {
                return true;
            }
    
            $("#drill-types").find(".item").removeClass("active");
            $(this).addClass("active");
            $("#event-selector").hide();
    
            $("#drill-no-event").fadeOut();
            $("#segmentation-start").fadeOut().remove();
            $(this).parents(".cly-select").removeClass("dark");
    
            $(".event-select.cly-select").find(".text").text(jQuery.i18n.map["drill.select-event"]);
            $(".event-select.cly-select").find(".text").data("value","");
    
            currEvent = "[CLY]_view";
    
            self.graphType = "line";
            self.graphVal = "times";
            self.filterObj = {};
            self.byVal = "";
            self.drillChartDP = {};
            self.drillChartData = {};
            self.activeSegmentForTable = "";
            countlySegmentation.reset();
    
            $("#drill-navigation").find(".menu[data-open=table-view]").hide();
    
            $.when(countlySegmentation.initialize(currEvent)).then(function () {
                $("#drill").replaceWith(drillClone.clone(true));
                self.adjustFilters();
                self.draw(true, false);
            });
        });
        setTimeout(function() {
            drillClone = $("#drill").clone(true);
        }, 0);
    }
});

$( document ).ready(function() {
    // if(!production){
    //     CountlyHelpers.loadJS("network/javascripts/simpleheat.js");
    // }
    // jQuery.fn.dataTableExt.oSort['view-frequency-asc']  = function(x, y) {
    //     x = countlyNetwork.getFrequencyIndex(x);
    //     y = countlyNetwork.getFrequencyIndex(y);

    //     return ((x < y) ? -1 : ((x > y) ?  1 : 0));
    // };

    // jQuery.fn.dataTableExt.oSort['view-frequency-desc']  = function(x, y) {
    //     x = countlyNetwork.getFrequencyIndex(x);
    //     y = countlyNetwork.getFrequencyIndex(y);

    //     return ((x < y) ?  1 : ((x > y) ? -1 : 0));
    // };
	// var menu = '<a href="#/analytics/network" class="item">'+
	// 	'<div class="logo-icon fa fa-eye"></div>'+
	// 	'<div class="text" data-localize="network.title"></div>'+
	// '</a>';
	// $('#web-type #analytics-submenu').append(menu);
	// $('#mobile-type #analytics-submenu').append(menu);
    
    // var menu = '<a href="#/analytics/view-frequency" class="item">'+
	// 	'<div class="logo-icon fa fa-eye"></div>'+
	// 	'<div class="text" data-localize="views.view-frequency"></div>'+
	// '</a>';
	// $('#web-type #engagement-submenu').append(menu);
	// $('#mobile-type #engagement-submenu').append(menu);
    
    // //check if configuration view exists
    // if(app.configurationsView){
    //     app.configurationsView.registerLabel("network", "network.title");
    //     app.configurationsView.registerLabel("network.view_limit", "network.view-limit");
    // }
    
    var menu = '<a class="item messaging" id="sidebar-messaging">'+
        '<div class="logo ion-chatbox-working"></div>'+
        '<div class="text" data-localize="network.title">网络</div>'+
    '</a>'+
    '<div class="sidebar-submenu" id="messaging-submenu">'+
        '<a href="#/analytics/metrics" class="item">'+
            '<div class="logo-icon fa fa-line-chart"></div>'+
            '<div class="text" data-localize="push.sidebar.overview">概要</div>'+
        '</a>'+
        '<a href="#/analytics/network" class="item">'+
            '<div class="logo-icon fa fa-line-chart"></div>'+
            '<div class="text" data-localize="network.http.overview">HTTP请求</div>'+
        '</a>'+
    '</div>';
   
    if($('#mobile-type #management-menu').length)
        $('#mobile-type #management-menu').before(menu);
    else
        $('#mobile-type').append(menu);
    

});
