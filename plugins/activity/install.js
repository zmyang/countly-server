var async = require('async'),
    pluginManager = require('../pluginManager.js'),
	countlyDb = pluginManager.dbConnection();
console.log("Installing activity plugin");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
        return;
    }
	function upgrade(app, done){
		var cnt = 0;
		console.log("Adding activity collections to " + app.name);
		function cb(){
			cnt++;
			if(cnt == 6)
				done();
		}        
		countlyDb.collection('app_activitygroups' + app._id).insert({_id:"meta"},cb);
		countlyDb.collection('app_activityusers' + app._id).ensureIndex({"group":1, "uid":1}, {unique:true}, cb);
        countlyDb.collection('app_activityusers' + app._id).ensureIndex({"group":1, "activities":1, "fatal":1}, {sparse:true}, cb);
        countlyDb.collection('app_activityusers' + app._id).ensureIndex({"uid":1}, cb);
		countlyDb.collection('app_activities' + app._id).ensureIndex({"group":1},cb);
		countlyDb.collection('app_activities' + app._id).ensureIndex({"uid":1},cb);
	}
	async.forEach(apps, upgrade, function(){
		console.log("activity plugin installation finished");
		countlyDb.close();
	});
});