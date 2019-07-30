//# sourceURL=EveServer.js
class EveServer {
	'*'(com, fun) { com.Cmd = "DispUnit"; this.dispatch(com, fun); }

	async Start(com, fun) {
		log.v('--EveServer/Start');
		
		let Par = this.Par;
		let Vlt = this.Vlt;
		this.Svc = {};
		let Svc = this.Svc;
		let that = this;
		Vlt.Models = {};
		Vlt.Units = {};
		let models = [];
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}
		Svc.Subscribe('GetUnitPosition', that, getUnitPosition);
		Svc.Subscribe('SetUnitPosition', that, setUnitPosition);
		Svc.Subscribe('Engage', that, engage);
		log.v(JSON.stringify(Par, null, 2));
		fun();

		async function service(pid) {
			log.v('service');
			return new Promise((resolve, _reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, async function (err, r) {
					log.v('r', JSON.stringify(r));
					if ('Services' in r) {
						for (let key in r.Services) {
							Svc[key] = r.Services[key];
						}
					}
					resolve();
				});
			});
		}

		function engage(com) {
			log.v('..engage', JSON.stringify(com, null, 2));
			let fs = this.require('fs');
			let path = 'scene.json';
			if ('SceneGraph' in Par)
				path = Par.SceneGraph;
			Vlt.Agent = com.Agent;
			if ('SceneGraph' in Vlt.Agent)
				path = Vlt.Agent.SceneGraph;
			fs.readFile(path, function (err, data) {
				if (err) {
					log.e(' ** Cannot read file', path);
				} else {
					let sg = JSON.parse(data.toString());
					Vlt.SceneGraph = sg;
					log.v('Scene:' + JSON.stringify(sg, null, 2));
					parse(sg);
				}
			});

			function parse(arr) {
				for (let i = 0; i < arr.length; i++) {
					let obj = arr[i];
					Vlt.Units[obj.Name] = obj;
					if ('Deploy' in obj) {
						let q = {};
						q.Cmd = 'Deploy';
						let agent = {};
						for (let key in obj.Deploy)
							agent[key] = obj.Deploy[key];
						agent.Name = obj.Name;
						q.Agent = agent;
						Svc.Dispatch(q, 'Orca');
					}
					if ('Links' in obj) {
						for (let i = 0; i < obj.Links.length; i++) {
							let q = {};
							q.Cmd = 'AddLink';
							q.Link = [obj.Name, obj.Links[i]];
							Svc.Dispatch(q, 'Orca');
						}
					}
					if ('Model' in obj && models.indexOf(obj.Model < 0)) {
						let q = {};
						q.Cmd = 'GetModel';
						q.Name = obj.Model;
						models.push(obj.Model);
						that.send(q, Par.ModelServer, function (err, r) {
							if (err) {
								log.e('Model ' + obj.Model + ' Err:' + err);
							} else {
								Vlt.Models[r.Name] = r.Model;
								// log.v('Model ' + obj.Model + ' Retrieved');
							}
						});
					}
					if ('Children' in obj) {
						parse(obj.Children);
					}
				}
			}
		}

		function setUnitPosition(com) {
			let Vlt = this.Vlt;
			let Par = this.Par;
			if (com.Target in Vlt.Units) {
				let unit = Vlt.Units[com.Target];
				unit.Position = com.Position;
				let q = {
					Cmd: 'SetUnitPosition',
					Name: com.Target,
					Position: com.Position
				};
				this.send(q, Par.Server);
			}
		}

		function getUnitPosition(com) {
			let Vlt = this.Vlt;
			log.v('--EVE/getPosition');
			log.v(JSON.stringify(com, null, 2));
			if (com.Target in Vlt.Units) {
				let q = {};
				q.Cmd = 'Position';
				q.Position = Vlt.Units[com.Target].Position;
				Svc.Dispatch(q, com.From); // Return to sender
			} else {
				log.e(' ** Target:' + com.Target + ' unknown');
			}
		}
	}

	//-----------------------------------------------------Register
	async Register(com, fun) {
		log.i(' -- EveServer/Register');
		let Vlt = this.Vlt;
		Vlt.Browser = com.Pid;
		com.Commands = [];
		let links = [];
		if ('SceneGraph' in Vlt) {
			parse(Vlt.SceneGraph, 'Root');
			for (let i = 0; i < links.length; i++) {
				com.Commands.push(links[i]);
			}
		}
		if (fun) {
			//log.i(JSON.stringify(com));
			fun(null, com);
		}

		function parse(arr, parent) {
			let cmd = {};
			cmd.Cmd = 'AddUnit';
			for (let i = 0; i < arr.length; i++) {
				let cmd = {};
				let unit = {};
				cmd.Cmd = 'AddUnit';
				let obj = arr[i];
				let keys = Object.keys(obj);
				unit.Parent = parent;
				for (let j = 0; j < keys.length; j++) {
					let key = keys[j];
					if (key === 'Children')
						continue;
					unit[key] = obj[key];
				}
				cmd.Unit = unit;
				com.Commands.push(cmd);
				if ('Links' in obj) {
					for (let i = 0; i < obj.Links.length; i++) {
						let q = {};
						q.Cmd = 'AddLink';
						q.From = obj.Name;
						q.To = obj.Links[i];
						links.push(q);
					}
				}
				if ('Children' in obj) {
					parse(obj.Children, obj.Name);
				}
			}
		}
	}

	//-----------------------------------------------------GetModel
	// This is called from individual browser code to retreive
	// model from vault model arkive
	//
	// Cmd: GetModel
	// Model: Name of model in model server
	GetModel(com, fun) {
		log.v('--EveServer/GetModel');
		log.v(JSON.stringify(com));
		let Vlt = this.Vlt;
		log.v(JSON.stringify(Object.keys(Vlt.Models)));
		if ('Model' in com && com.Model in Vlt.Models) {
			com.Model = Vlt.Models[com.Model];
		} else {
			log.e(' ** Model', com.Model, ' not available');
		}
		if (fun)
			fun(null, com);
	}

	//-----------------------------------------------------GetUnit
	GetUnit(com, fun) {
		log.v('--GetUnit', JSON.stringify(com));
		let Vlt = this.Vlt;
		let name = com.Name;
		if (name in Vlt.Units) {
			let unit = Vlt.Units[name];
			if ('Mod' in unit) {
				com.Unit = {};
				com.Unit.Mod = unit.Mod;
				com.Unit.Parent = 'Board';
				com.Unit.Name = name;
				com.Unit.Type = 'Artifact';
				com.Unit.Title = name;
				if ('Position' in Vlt.Plexus[name])
					com.Unit.Position = Vlt.Plexus[name].Position;
			}
		}
		if (fun) {
			fun(null, com);
		}
	}

	DispUnit(com, fun) {
		let Vlt = this.Vlt;
		if ('Name' in com && com.Name in Vlt.Units) {
			let unit = Vlt.Units[com.Name];
			let pid = unit.Pid;
			this.send(com, pid, function (err, r) {
				fun(null, r);
			});
			return;
		}
		if (fun) {
			log.w(' ** Return to sender');
			fun(null, com);
		} else {
			log.e(' ** No return address');
		}
	}

	SetUnitPosition(com, fun) {
		let Par = this.Par;
		let Vlt = this.Vlt;
		let name = com.Name;
		if (name in Vlt.Units) {
			let unit = Vlt.Units[name];
			if ('Position' in com)
				unit.Position = com.Position;
		}
		this.send(com, Par.Server);
		if (fun)
			fun(null, com);
	}

	SaveImage(com, fun) {
		let path = require('path');
		let fs = require('fs');
		let renderFolder = path.join(process.cwd(), 'renders');
		log.v('Saving image to', renderFolder);
		if (!fs.existsSync(renderFolder)) fs.mkdirSync(renderFolder);
		let imagepath = path.join(renderFolder, com.Name + '.png');
		fs.writeFile(imagepath, new Buffer(com.Image.split(',')[1], 'base64'), (err) => {
			if (fun)
				fun(err, com);
		});
	}

	AddLink(com, fun) {
		log.i('EveServer:AddLink');		
		let Par = this.Par;
		let Svc = this.Svc;

		let r = {};
		r.Cmd = 'ActiveLink';
		r.DeleteActiveLink = true;
		this.send(r, Par.Server);

		let q = {};
		q.Cmd = 'AddLink';
		q.From = com.From;
		q.To = com.To;

		this.send(q, Par.Server);
		Svc.Dispatch({
			Cmd: 'AddLink',
			Link: [com.From, com.To]
		}, 'Orca');

		if ('SceneGraph' in this.Vlt) {
			// Add to SceneGraph
			ScanLink(this.Vlt.SceneGraph, com.From, com.To);			
		}
		if (fun) {
			fun(null, com);
		}

		
		function ScanLink(arr, linkFrom, linkTo) {
			for (let i in arr) {
				let obj = arr[i];
				if ('Name' in obj && obj.Name == linkFrom) {
					if (!('Links' in obj)) {
						obj.Links = [];
					}
					log.i(obj);
					obj.Links.push(linkTo);
					return;
				}
				if ('Children' in obj) {
					ScanLink(obj.Children, linkFrom, linkTo);
				}				
			}
		}
	}

	ActiveLink(com, fun) {
		let Par = this.Par;

		let q = {};
		q.Cmd = 'ActiveLink';
		if ('DeleteActiveLink' in com) {
			q.DeleteActiveLink = true;
			this.send(q, Par.Server);
		} else {
			q.From = com.From;
			q.x = com.x;
			q.y = com.y;
			q.Status = com.Status;
			this.send(q, Par.Server);
		}


		if (fun) {
			fun(null, com);
		}


	}

	Evoke(com, fun) {
		log.i(JSON.stringify(com));
		if (fun) {
			fun(null, com);
		}
	}

	MoveUnit(com, fun) {
		let Vlt = this.Vlt;
		let Par = this.Par;
		let q = {};
		q.Cmd = 'SetUnitPosition';
		q.Name = com.Name;
		if ('Position' in com)
			q.Position = com.Position;
		if (q.Name in Vlt.Units) {
			let obj = Vlt.Units[q.Name];
			obj.Position = q.Position;
		}
		this.send(q, Par.Server);
		if (fun)
			fun(null, com);
	}

	SpinUnit(com, fun) {
		log.v('EveServer/SpinUnit', JSON.stringify(com, null, 2));
		if (fun)
			fun(null, com);
	}

	SaveUnit(com, fun) {
		log.v(' -- EveServer/SaveUnit');
		let Vlt = this.Vlt;
		if ('Name' in com && com.Name in Vlt.Units) {
			let unit = Vlt.Units[com.Name];
			let pid = unit.Pid;
			this.send(com, pid);
		}
		if (fun)
			fun(null, com);
	}
	
}