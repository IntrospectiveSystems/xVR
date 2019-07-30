//# sourceURL=Daemon

/**
 * Daemon is a surrogate for the more general ochestration daemon running and
 * load balancing on a cluster of computing resources (CPUs) that form is called
 * a Pod (for more or less obvious reasons). The function of the more general
 * instrumentation is to transparently balance load, start and stop systems,
 * spin up new computing resources and keep track of where resources are located.
 * 
 * Systems are identified by an arbitrary string which might in small instances
 * be meaningful but in general might be arbitrary as in a GUID. The Daemon/Agent
 * system is agnostic to the structure of the system identifier.
 * 
 * Services provided:
 * 
 * Designed as part of the xEnergy ICD to provide an interface between any Gateway
 * and the controllers below this interface. Receives pricing data as some form
 * of communication (power-line communication, modbus, etc...) and translates it
 * into an xGraph message. Also handles the receival of simulation commands.
 */
class Daemon {

	/** Setup
	 * Method necessary for the initial setup of the class. Standard in xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	Setup(com, fun) {
		log.i('--Daemon/Setup');
		let Vlt = this.Vlt;
		this.Svc = {};
		Vlt.Agents = {};
		Vlt.Links = {};
		Vlt.Fifo = [];
		Vlt.Initialized = false;
		Vlt.Args = [];
		if (fun)
			fun(null, com);
	}

	/** Start
	 * Method for starting the module instance of this class. Standard in most xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	async Start(com, fun) {
		log.i('--Daemon/Start');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		let that = this;

		//load required libraries
		Vlt.Fs = require('fs');
		let fs = Vlt.Fs;
		Vlt.Spawn = this.require('child_process').spawn;
		Vlt.Zip = require('jszip');

		//TODO get the pars from the process, think about this 
		let args = process.argv;
		log.v('args', JSON.stringify(args, null, 2));
		log.v('Par', JSON.stringify(Par, null, 2));

		//print out the args that will be used for ALL subsystems
		for (let i = 3; i < args.length; i++) {
			Vlt.Args.push(args[i]);
		}
		log.v('Vlt.Args', JSON.stringify(Vlt.Args, null, 2));

		//check for subsystem files make a tempdir if not availible
		let files = fs.readdirSync(Par.SystemDir);
		log.v(JSON.stringify(files));
		Vlt.TempDir = Par.SystemDir + '/temp';
		if (files.indexOf('temp') < 0) fs.mkdirSync(Vlt.TempDir);

		//load services object from other modules (example Register from Mesh)
		await getServices();

		//register the catch_all function for mesh services
		Svc.Register('*', this, this.Dispatch);

		//get the Daemons host and port for spawning new subprocesses
		await getHostPort();

		//deploy a Par defined system that will initiate the deploy of new subsystems
		if ('Deploy' in Par) {
			let dep = {};
			dep.Cmd = 'Deploy';
			dep.Name = Par.Deploy.Name;
			dep.Agent = Par.Deploy;
			this.Deploy(dep);
		}

		if (fun) {
			fun(null, com);
		}

		//support functons below here

		//loop over all services (Modules) listed in Par.Services array and get each service
		async function getServices() {
			return new Promise(async (resolve, _reject) => {
				if ('Services' in Par) {
					for (let is = 0; is < Par.Services.length; is++) {
						let pid = Par.Services[is];
						await service(pid);
					}
				}
				resolve();
			});
		}

		//load the service from a particular pid (module in this system)
		async function service(pid) {
			return new Promise((resolve, _reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, function (err, r) {
					if ('Services' in r) {
						let keys = Object.keys(r.Services);
						for (let i = 0; i < keys.length; i++) {
							let key = keys[i];
							Svc[key] = r.Services[key];
						}
					}
					resolve();
				});
			});
		}

		//wait for the host and port to become available in the Mesh Module (or other module 
		//that is providing the communications)
		async function getHostPort() {
			return new Promise((resolve, _reject) => {
				let timer = setInterval(function () {
					let obj = Svc.GetSolo();
					if (obj && 'Port' in obj) {
						Vlt.Host = obj.Host;
						Vlt.Port = obj.Port;
						clearInterval(timer);
						log.v('Daemon Host, Port', Vlt.Host, Vlt.Port);
						Vlt.Initialized = true;
						resolve();
					} else {
						log.v(' ** Waiting for host and port');
					}
				}, 1000);
			});
		}
	}

	//-----------------------------------------------------Dispatch
	// The remaining functionality is dispatched over the
	// current mesh network
	Dispatch(com) {
		log.v('Daemon :: Dispatch', JSON.stringify(com));
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		let cmd = com.Cmd;
		switch (cmd) {
			case 'Deploy':
				this.Deploy(com);
				break;
			case 'AddLink':
				this.AddLink(com);
				break;
			case 'Join':
				this.Join(com);
				break;
			default:
				// Security: Must be registered to send
				// Add public/private key to message
				if (!(com.From in Vlt.Agents)) {
					log.e(' ** .From address not in Vlt.Agents:' + JSON.stringify(com));
					return;
				}
				if ('To' in com) {
					sendit(com.To);
					return;
				}
				log.v('Units and their Links', JSON.stringify(Vlt.Links));
				if (com.From in Vlt.Links) {
					let links = Vlt.Links[com.From];
					log.v(`Sending ${cmd} to Links:`, JSON.stringify(links));
					for (let i = 0; i < links.length; i++) sendit(links[i]);
				}
				break;
		}

		function sendit(dest) {
			if (dest in Vlt.Agents) {
				let agent = Vlt.Agents[dest];
				if (agent.hasOwnProperty('Port')) {
					if (agent.Port){
						log.v(`Daemon :: Dispatch.sending ${
							JSON.stringify(com)} to ${agent.Host} ${agent.Port}`);
						Svc.Send(com, agent.Host, agent.Port);
					}
				}
			}else{
				log.v(`Daemon :: Dispatch. ${dest} not registered in Vlt.Agents`);
			}
		}
	}

	//-----------------------------------------------------AddLink
	AddLink(com) {
		log.i('Daemon :: AddLink', com.From, '=>', com.To);
		log.v('com', JSON.stringify(com));
		let Vlt = this.Vlt;
		let link = com.Link;
		let from = link[0];
		let to = link[1];
		let links;
		if (from in Vlt.Links) {
			links = Vlt.Links[from];
		} else {
			links = [];
			Vlt.Links[from] = links;
		}
		links.push(to);
		log.i('Vlt.Links', JSON.stringify(Vlt.Links, null, 2));
	}

	DeleteLink(com) {
		log.i('Daemon :: DeleteLink', com.From, '=>', com.To);

	}

	//-----------------------------------------------------Deploy
	Deploy(com) {
		log.v('Daemon :: Deploy', com.Agent.Name|| 'NEMO');
		log.v(JSON.stringify(com, null, 2));
		let Par = this.Par;
		let Vlt = this.Vlt;
		let that = this;
		if ('Agent' in com) {
			Vlt.Fifo.push(com.Agent);
		} else {
			log.e(' ** No Agent in Deploy command');
			log.e(JSON.stringify(com, null, 2));
		}


		//keep deploying
		//TODO think about this more
		if (Vlt.Initialized) {
			while (Vlt.Fifo.length > 0) {
				deploy();
			}
		} else {
			if (Vlt.Fifo.length < 2) {
				let timer = setInterval(function () {
					if (Vlt.Initialized) {
						while (Vlt.Fifo.length > 0) {
							deploy();
						}
						clearInterval(timer);
					}
				}, 100);
			}
		}

		function deploy() {
			let agent = Vlt.Fifo.shift();
			if (agent.Name in Vlt.Agents) {
				log.e(' ** Duplicate deployment:' + agent.Agent);
				return;
			}
			Vlt.Agents[agent.Name] = agent;
			let q = {};
			q.Cmd = 'GetAgent';
			q.Name = agent.Agent;
			that.send(q, Par.AgentServer, spawn);

			async function spawn(err, r) {
				log.i('..spawning', agent.Agent, 'as', agent.Name);
				if (err) {
					log.e(' ** Deployment Err:' + err);
					return;
				}

				let mode = 'd';
				let workdir = Vlt.TempDir + '/' + agent.Name;
				let cache = workdir + '/cache';
				let fs = Vlt.Fs;
				if (!fs.existsSync(workdir)) {
					fs.mkdirSync(workdir);
					let zip = new Vlt.Zip();
					await new Promise((res, rej) => {
						zip.loadAsync(r.Agent, { base64: true })
							.then(function (zip) {
								zip.forEach(function (path, file) {
									file.async('nodebuffer')
										.then(function success(buf) {
											log.i('Success', agent.Name, path);
											fs.writeFileSync(workdir + '/' + path, buf);
											res();
										}, function error(e) {
											log.e('**Error', path, e);
											rej();
										});
								});
							});
					});

				}
				if (!fs.existsSync(cache)) {
					mode = 'r';
				}

				// Orca spawning grounds
				let args = [];
				for (let i = 0; i < Vlt.Args.length; i++)
					args.push(Vlt.Args[i]);
				args.unshift(mode, '--cwd', workdir);
				args.push('--Name', agent.Name);
				if ('Host' in Vlt)
					args.push('--Host', Vlt.Host);
				if ('Port' in Vlt)
					args.push('--Port', Vlt.Port.toString());
				if ('Args' in agent) {
					for (let key in agent.Args) {
						args.push('--' + key);
						args.push(agent.Args[key]);
					}
				}
				log.v('args', JSON.stringify(args, null, 2));

				log.i('\n\n====================');
				let name = agent.Agent;
				log.i('Spawning', name);
				log.v('args', args);
				let child = Vlt.Spawn((process.platform == 'win32') ? 'xgraph.cmd' : 'xgraph', args,
					{ cwd: workdir, env: Object.assign(process.env, { FORCE_COLOR: 1 }) });
				child.stdout.on('data', (data) => {
					process.stdout.write(`${name}: ${data.toString()}`);
				});
				child.stderr.on('data', (data) => {
					process.stderr.write(`${name}/stderr: ${data.toString()}`);
				});
				child.on('close', (code) => {
					log.e(`${name}/close with code ${code}`);
				});
			}
		}
	}

	//-------------------------------------------------Join
	// This is a message from mesh layer
	Join(com) {
		log.v('Daemon :: Join', JSON.stringify(com));
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		let agent;
		if (com.Name in Vlt.Agents) {
			agent = Vlt.Agents[com.Name];
		} else {
			agent = {};
			agent.Name = com.Name;
			Vlt.Agents[com.Name] = agent;
		}
		agent.Host = com.Host;
		agent.Port = com.Port;
		let accept = {
			Cmd: 'Accept'
		};
		accept.Agent = agent;
		Svc.Send(accept, agent.Host, agent.Port);
	}
}