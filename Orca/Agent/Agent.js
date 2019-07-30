//# sourceURL=Agent

/**
 * The 'Agent' modules is used by every system in a system of systems to communicate
 * with each other. It is the essential API that is used to enable the system agents
 * to be commuciations modality (UDP, radio, acoustic) to be protocol agnostic. It
 * also allows systems themselves to be language agnostic as it provides a very
 * lean API that can be easiliy implemented in any language and participate in a
 * collaborative system of systems with other systems written in other languages
 * (e.g. Node.js, Pyhon, C++, etc). The 'Agent' modules is supports the interchange
 * of message between a module and the Daemon
 * 
 * Services provided (Daemon use only)
 *  Subscribe: Request mesh layer to direct messages to this system
 *  Dispatch: Send message to Daemon through mesh layer
 *  GetArg: Retrieve arguments from command used to instantiate this system
 *  GetParam: Retrieves arguments from the command line
 *
 * Services required
 * 	Mesh/Send: Used to send message to Daemon
 *  Mesh/Register: Request mesh layer to route message to this system
 * 
 * Note: The services provided here should not be called by user modules. They are
 * part of the specific mesh network being used by a mesh specific implementation
 * provided by the Agent API which is agnostic to the particular Daemon for communication
 * layer being used. For example, a mesh used to develope and test a collaborative swarm
 * of drones would use this protocol, but the deplotyment would used a radio mesh layer.
 */
class Agent {

	/** Setup
	 * Method necessary for the initial setup of the class. Standard in xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	Setup(com, fun) {
		log.v('--Agent/Setup');
		let Par = this.Par;
		let Vlt = this.Vlt;
		this.Svc = {};
		Vlt.Name = Par.Name;
		// Get Daemon host and port
		Vlt.Daemon = {};
		Vlt.Agent = {};
		Vlt.Register = {};
		Vlt.Pending = {};
		let args = process.argv;
		for (let i = 0; i < args.length; i++) {
			switch (args[i]) {
				case '--Name':
					Vlt.Name = args[i + 1];
					break;
				case '--Host':
					Vlt.Daemon.Host = args[i + 1];
					break;
				case '--Port':
					Vlt.Daemon.Port = parseInt(args[i + 1]);
					break;
				default:
					break;
			}
		}
		if (fun)
			fun(null, com);
	}

	/** Start
	 * Method for starting the module instance of this class. Standard in most xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	//-----------------------------------------------------Start
	async Start(com, fun) {
		log.v('--Agent/Start');
		this.Svc = await this.getServices();
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		let that = this;

		// Register join response
		Svc.Register('Accept', that, accept);

		// This fixes a minor race problem with modules
		// trying to Subscribe before Agent gets its
		// services from the mesh network
		for(let key in Vlt.Pending) {
			let obj = Vlt.Pending[key];
			Svc.Register(key, obj.Context, obj.Script);
		}

		// Get self host and port then send JOIN
		let timer = setInterval(function () {
			let obj = Svc.GetSolo();
			if (obj && 'Port' in obj) {
				Vlt.Host = obj.Host;
				Vlt.Port = obj.Port;
				let join = {};
				join.Cmd = 'Join';
				join.Name = Vlt.Name;
				join.Host = Vlt.Host;
				join.Port = Vlt.Port;
				Svc.Send(join, Vlt.Daemon.Host, Vlt.Daemon.Port);
				clearInterval(timer);
			}
		}, 100);
		if (fun)
			fun(null, com);


		//only support functions below

		function accept(com) {
			let Vlt = this.Vlt;
			log.v('++Agent/accept');
			log.v(JSON.stringify(com, null, 2));
			Vlt.Agent = com.Agent;
			if ('Engage' in Vlt.Register) {
				let q = {
					Cmd: 'Engage',
					Agent: Vlt.Agent
				};
				let obj = Vlt.Register['Engage'];
				obj.Script.call(obj.Context, q);
			} else {
				log.w(' ** No engage functionality provided **');
				log.w(Object.keys(Vlt.Register));
			}
		}
	}

	//-------------------------------------------------GetServices
	// Provide an object of servides tht can be used
	// directly in the system without using the usual
	// more general system to system JSON message channel
	async GetServices(com, fun) {
		log.v('--Agent/GetServices');
		let Vlt = this.Vlt;
		let that = this;
		if (!('Services' in com)) {
			com.Services = {};
		}
		com.Services.Subscribe = subscribe;
		com.Services.Dispatch = dispatch;
		com.Services.GetArg = getArg;
		com.Services.GetParam = getParam;
		if (fun) {
			fun(null, com);
		}

		// Subscribe to message sent from other agents
		// This simply remaps subscriptions into the
		// registry logic of the transport layer (e.g. Udp)
		// so that users do not need to even know that this
		// layer exists.
		// Also, some domains, like StarCraft 2 uses the mesh
		// for other purposes, and this avoids a collision with
		// those agents that need this functionality.
		// First check for local subscriptions
		//
		// Note: More comments than code =)
		function subscribe(cmd, context, script) {
			log.v('++Agent/subscribe', cmd);
			let Svc = that.Svc;
			let obj = {};
			switch (cmd) {
				case 'Engage':
					obj.Context = context;
					obj.Script = script;
					Vlt.Register[cmd] = obj;
					break;
				default:
					if('Register' in Svc) {
						Svc.Register(cmd, context, script);
					} else {
						obj.Context = context;
						obj.Script = script;
						Vlt.Pending[cmd] = obj;
					}
					break;
			}
		}

		// This is a service that can be used by a system
		// to send message down the stream. It is made availble
		// as a service through the GetStream command.
		function dispatch(com, dest) {
			// The following code suppresses a possible race condition
			let Svc = that.Svc;
			if ('Port' in Vlt) {
				disp();
			} else {
				let timer = setInterval(function () {
					if ('Port' in Vlt) {
						clearInterval(timer);
						disp();
					}
				}, 100);
			}

			function disp() {
				com.From = Vlt.Name;
				if (dest)
					com.To = dest;
				log.v('Agent :: dispatch to Daemon Communications network', JSON.stringify(Vlt.Daemon));
				if('Send' in Svc) {
					Svc.Send(com, Vlt.Daemon.Host, Vlt.Daemon.Port);
				} else {
					log.w(' ** Discarding', JSON.stringify(com));
				}
			}
		}

		/**
		 * This service is used to get parameters from the command
		 * that started this system. The value 'name' is the argument
		 * name less the initial '--' which will be appended here
		 * for system compatibility.
		 * @param {string} name 
		 */
		function getArg(name) {
			let args = process.argv;
			let arg = '--' + name;
			for (let i = 0; i < args.length; i++) {
				log.v('arg', i, name, args[i]);
				if (args[i] === arg)
					return args[i + 1];
			}
		}

		/**
		 * The 'Agent' attribute in the 'Accept' command
		 * sent from the Daemon following as a positive
		 * response to the 'Join' command is saved in
		 * Vlt.Agent in its entirety. This function can
		 * retrieve values from that object.
		 * Keep in mind that a 'Deploy' command can be
		 * sent to the Daemon from any executing agent
		 * including a 'Deploy' command that is generated
		 * by another agent in real time.
		 * @param {*} name 
		 */
		function getParam(name) {
			if (name in Vlt.Agent)
				return Vlt.Agent[name];
		}
	}

}
