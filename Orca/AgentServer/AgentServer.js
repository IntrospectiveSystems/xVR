//# sourceURL=AgentServer
class AgentServer {

	//-----------------------------------------------------Setup
	Setup(com, fun) {
		log.v('--AgentServer/Setup');
		let Vlt = this.Vlt;
		Vlt.Zip = require('jszip');
		Vlt.Path = require('path');
		Vlt.Fs = require('fs');
		if (fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	Start(com, fun) {
		log.v('--AgentServer/Start');
		if (fun)
			fun(null, com);
	}

	//-----------------------------------------------------GetAgent
	// Cmd: GetSystem
	// Name: <Name of system, xQuake.Associator.Darwin>
	// Returns:
	// Agent: <base64 of zip file containing system including files
	async GetAgent(com, fun) {
		log.v('--AgentServer/GetAgent');
		log.v(JSON.stringify(com, null, 2));
		let Par = this.Par;
		let Vlt = this.Vlt;
		let Files = [];
		let fs = Vlt.Fs;
		let config = {};
		config.Sources = {};
		config.Modules = {};
		config.Modules.Deferred = [];
		let browser = {};
		browser.Sources = {};
		browser.Modules = {};
		browser.Modules.Deferred = [];
		let web = false;
		let parts = com.Name.split('.');
		await gather(Par.Agents, parts);
		log.v('Files', JSON.stringify(Files, null, 2));
		log.v('config', JSON.stringify(config, null, 2));
		genzip.call(this, config, Files, function (zip) {
			com.Agent = zip;
			let _buff = new Buffer.from(zip, 'base64');
			//	Vlt.Fs.writeFileSync('temp.zip', buff);
			if (fun)
				fun(null, com);
		});

		async function gather(path, parts) {
			log.v('Gather', path, parts);
			if (!fs.existsSync(path)) {
				log.e(' ** Directory <' + path + '> does not exist');
				return;
			}
			let files = fs.readdirSync(path);
			for (let i = 0; i < files.length; i++) {
				let file = files[i];
				let next = path + '/' + file;
				let stat = fs.statSync(next);
				if (stat.isDirectory())
					continue;
				let jsn, obj;
				switch (file) {
					case 'config.json':
						jsn = fs.readFileSync(next).toString();
						obj = JSON.parse(jsn);
						log.v('Adding', JSON.stringify(obj, null, 2));
						if ('Sources' in obj) {
							for (let key in obj.Sources) {
								config.Sources[key] = obj.Sources[key];
							}
						}
						if ('Modules' in obj) {
							for (let key in obj.Modules) {
								if (key === 'Deferred') {
									for (let j = 0; j < obj.Modules.Deferred.length; j++) {
										config.Modules.Deferred.push(obj.Modules.Deferred[j]);
									}
								} else {
									config.Modules[key] = obj.Modules[key];
								}
							}
						}
						break;
					case 'browser.json':
						web = true;
						jsn = fs.readFileSync(next).toString();
						obj = JSON.parse(jsn);
						log.v('Adding', JSON.stringify(obj, null, 2));
						if ('Sources' in obj) {
							for (let key in obj.Sources) {
								browser.Sources[key] = obj.Sources[key];
							}
						}
						if ('Modules' in obj) {
							for (let key in obj.Modules) {
								if (key === 'Deferred') {
									for (let j = 0; j < obj.Modules.Deferred.length; j++) {
										browser.Modules.Deferred.push(obj.Modules.Deferred[j]);
									}
								} else {
									browser.Modules[key] = obj.Modules[key];
								}
							}
						}
						break;
					default:
						Files.push(next);
						break;
				}
			}
			if (parts.length < 1)
				return;
			let part = parts.shift();
			await gather(path + '/' + part, parts);
		}

		function genzip(config, files, func) {
			log.v('..genzip');
			let Vlt = this.Vlt;
			let zip = new Vlt.Zip();
			zip.file('config.json', JSON.stringify(config, null, 2));
			if (web)
				zip.file('browser.json', JSON.stringify(browser, null, 2));
			for (let i = 0; i < files.length; i++) {
				let path = files[i];
				let buf = fs.readFileSync(path);
				let file = Vlt.Path.basename(path);
				zip.file(file, buf);
			}
			zip.generateAsync({ type: 'base64' })
				.then(function (content) {
					func(content);
				});
		}

	}

}