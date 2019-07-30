class Server {
	async Start(com, fun) {
		log.v('GridServer :: Start');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let Svc = this.Svc = {};
		Vlt.Units = {};
		if ('Services' in Par) {
			for (let pid of Par.Services) {
				try {
					await new Promise((resolve, _reject) => {
						log.v('Service');
						this.sendLocal({
							Cmd: 'GetServices'
						}, pid, async function (_err, cmd) {
							if ('Services' in cmd) {
								for (let key in cmd.Services) {
									Svc[key] = cmd.Services[key];
								}
							}
							resolve();
						});
					});
				}
				catch (error) {
					log.e(`${Par.Entity} encountered an error: ${error}`);
				}
			}
		}

		Svc.Subscribe('Engage', this, this.Engage);
		fun(null, com);
	}

	Engage(com) {
		let Vlt = this.Vlt;
		let Par = this.Par;
		let Svc = this.Svc;

		log.v('Grid :: Engage', JSON.stringify(com, null, 2));
		let fs = this.require('fs');
		let path = 'Grid.json';
		if ('GridPlan' in Par)
			path = Par.GridPlan;
		Vlt.Agent = com.Agent;
		if ('GridPlan' in Vlt.Agent)
			path = Vlt.Agent.GridPlan;

		fs.readFile(path, function (error, data) {
			if (error) {
				log.e(' ** Cannot read file', path);
			} else {
				let grid = JSON.parse(data.toString());
				Vlt.GridPlan = grid;
				log.v('GridPlan: ' + JSON.stringify(grid, null, 2));
				parse(grid);
			}
		});

		function parse(Path) {
			for (let i = 0; i < Path.length; i++) {
				let obj = Path[i];
				Vlt.Units[obj.Name] = obj;
				if ('Deploy' in obj) {
					let agent = {};
					for (let key in obj.Deploy)
						agent[key] = obj.Deploy[key];
					agent.Name = obj.Name;
					Svc.Dispatch({
						Cmd: 'Deploy',
						Agent: agent
					}, 'Orca');
				}
				if ('Links' in obj) {
					for (let i = 0; i < obj.Links.length; i++) {
						Svc.Dispatch({
							Cmd: 'AddLink',
							Link: [obj.Name, obj.Links[i]]
						}, 'Orca');
					}
				}
			}
		}
	}
}