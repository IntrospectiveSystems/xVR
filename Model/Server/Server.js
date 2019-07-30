//# sourceURL=ModelServer.js
(function ModelServer() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start,
		GetModel: GetModel
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		log.v('--Model/Server/Setup');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let fs = this.require('fs');
		Vlt.fs = fs;
		Vlt.Models = {};
		let archive = Par.Archive;
		log.v('Archive:' + archive);
		scandir(archive, 0);
		if(fun)
			fun();
		
		function scandir(dir, lev) {
			let files = fs.readdirSync(dir);
			let lead = '';
			for(let i=0; i<lev; i++) {
				lead += '|   ';
			}
			for(let i=0; i<files.length; i++) {
				let file = files[i];
				let path = dir + '/' + file;
				let stats = fs.statSync(path);
				if(stats.isDirectory()) {
					log.v(lead + 'Dir:' + path);
					if(file === 'stash') {
						stash(path);
						return;
					}
					scandir(path, lev+1);
				} else {
					log.v(lead + 'File:' + path);
				}
			}
		}

		function stash(dir) {
			let files = fs.readdirSync(dir);
			for(let i=0; i<files.length; i++) {
				let file = files[i];
				let ix = file.lastIndexOf('.');
				if(ix < 0)
					continue;
				if(ix >= file.length)
					continue;
				let suffix = file.substr(ix+1);
				let body = file.substr(0, ix);
				if(suffix === 'zip')
					Vlt.Models[body] = dir + '/' + file;
				log.v(body, suffix);
			}
		}
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		log.v('--Model/Server/Setup');
		log.v(JSON.stringify(this.Vlt.Models, null, 2));
		if(fun)
			fun();
	}

	//-----------------------------------------------------GetModel
	function GetModel(com, fun) {
		log.v('--Model/Server/GetModel', com.Name);
		if(!fun) {
			log.e('Request has no fun');
			return;
		}
		if(!('Name' in com)) {
			log.e('No model name provided');
			fun('No model name');
			return;
		}
		let Vlt = this.Vlt;
		let name = com.Name;
		if(name in Vlt.Models) {
			let path = Vlt.Models[name];
			Vlt.fs.readFile(path, function(err, data) {
				if(err) {
					if(fun) {
						fun(err, com);
					}
					return;
				}
				com.Model = data.toString('base64');
				log.v('  GetModel succeeded');
				fun(null, com);
				return;
			});
		} else {
			let err = 'Model ' + name + ' not in archive';
			log.e(err);
			fun(err);
		}
	}

})();
