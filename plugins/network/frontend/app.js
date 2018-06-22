var plugin = {};

(function (plugin) {
	var crypto = require('crypto');
	plugin.init = function(app, countlyDb){
		function md5Hash(str) {
			return crypto.createHash('md5').update(str + "").digest('hex');
		}
	};
}(plugin));

module.exports = plugin;