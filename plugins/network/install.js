var async = require('async'),
    pluginManager = require('../pluginManager.js'),
	countlyDb = pluginManager.dbConnection();
console.log("Installing network plugin");
countlyDb.collection('apps').find({}).toArray(function (err, apps) {

    if (!apps || err) {
        return;
    }
	function upgrade(app, done){
		var cnt = 0;
		console.log("Adding network collections to " + app.name);
		function cb(){
			cnt++;
			if(cnt == 1)
				done();
		}        
		countlyDb.collection('app_network' + app._id).ensureIndex({"uid":1},cb);
		countlyDb.collection('app_networkerror' + app._id).createIndex( { "createdAt": 1 }, { expireAfterSeconds: 3600 } )
	}
	async.forEach(apps, upgrade, function(){
		console.log("Network plugin installation finished");
		countlyDb.close();
	});
});