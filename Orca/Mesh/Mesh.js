//# sourceURL=Mesh

/**
 * This module supports the communication layer of the Orca fraemwork. The commucications
 * protocol supported here is the UDP () protocol, but the services provided are the same
 * regardless of the protocol chosed. In terms of the vision this might be something like
 * radio links on 600 Gnz in a microgrid or drone swarm or an acoustic modem link used
 * for UUV implementations.
 * 
 * Services provided (Daemon use only)
 *	Register: Register a command as a service function
 *	GetSolo: Get host and port of current system
 *	Send: Send a message to particular host and port
 *	Share: Same but uses UDP broadcast function
 *
 * Services required
 * 	None
 * 
 * Note: The services provided here should not be called by user modules. They are
 * part of the specific mesh network being used by a mesh specific implementation
 * provided by the Agent API which is agnostic to the particular Daemon for communication
 * layer being used. For example, a mesh used to develope and test a collaborative swarm
 * of drones would use this protocol, but the deplotyment would used a radio mesh layer.
 */
class Mesh {

	/** Setup
	 * Method necessary for the initial setup of the class. Standard in xGraph systems.
	 * @param {Object} com The communication coming from the orchestrator.
	 * @param {Function} fun The function that send the callback to the place the come came from.
	 */
	async Setup(com, fun) {
		log.v('Mesh :: Setup');
		let Par = this.Par;
		let name = Par.Name || 'Minion';
		let Vlt = this.Vlt;
		let that = this;
		Vlt.Register = {};
		let solo, mesh = undefined;

		//This is an arbitrary unassigned multicast address
		let MULTICAST_ADDR = Vlt.MULTICAST_ADDR || '233.255.255.21';
		let PORT = 20000;

		let udp = this.require('dgram');

		//setup the solo for sending specific messages
		{
			solo = Vlt.Solo = udp.createSocket('udp4');
			solo.on('listening', function () {
				const address = solo.address();
				log.v('Mesh :: solo ' + name, 'listening on ' + address.address + ':' + address.port);
				Vlt.Port = address.port;
			});

			solo.on('message', function (message, remote) {
				log.v('Mesh :: solo.message ' + name, remote.address + ':' + remote.port + ' - ' + message);
				let jsn = JSON.parse(message);

				if (jsn.Cmd in Vlt.Register) {
					let obj = Vlt.Register[jsn.Cmd];
					obj.Script.call(obj.Context, jsn, remote.address, remote.port);
				} else if ('*' in Vlt.Register) {
					log.v(`Mesh:: solo Sending ${jsn.Cmd} as wildcard to registerd '*'`);
					let obj = Vlt.Register['*'];
					obj.Script.call(obj.Context, jsn, remote.address, remote.port);
				} else {
					log.v(`Mesh :: solo Cmd:${jsn.Cmd} not in Registry: `,
						JSON.stringify(Object.keys(Vlt.Register))
					);


					//TODO: Think about this hack that bypasses Register function.
					// Find anything with the unit of interest in the object contructor name
					let arr = Object.keys(Vlt.Register).filter((v, _i, _a) => {
						let name = Vlt.Register[v].Context.__proto__.constructor.name;
						return (typeof jsn.To !== 'undefined') ? name === jsn.To : name !== 'Agent';
					});

					// Get the pid if there is one for this unit
					let pid = (typeof arr !== 'undefined' && arr.length > 0) ?
						Vlt.Register[arr[0]].Context.Par.Pid : undefined;

					// Send out the command if there was a pid
					if (typeof pid !== 'undefined') that.send(jsn, pid, _ => _);
				}
			});

			solo.on('error', function (message, remote) {
				log.v('Mesh :: solo.error ' + name, remote.address + ':' + remote.port + ' - ' + message);
			});
		}

		//setup the mesh for broadcasts
		{
			mesh = Vlt.Mesh = udp.createSocket({ type: 'udp4', reuseAddr: true });
			mesh.bind(PORT);
			mesh.on('listening', function () {
				mesh.addMembership(MULTICAST_ADDR);
				const address = mesh.address();
				log.v('Mesh :: mesh', name, 'listening on ' + address.address + ':' + address.port);
			});

			mesh.on('message', function (message, remote) {
				let jsn = JSON.parse(message);
				log.d('Mesh :: mesh. We are sending out a message to everyone');
				if (jsn.Cmd in Vlt.Register) {
					let obj = Vlt.Register[jsn.Cmd];
					obj.Script.call(obj.Context, jsn, remote.address, remote.port);
				}
				if ('*' in Vlt.Register) {
					let obj = Vlt.Register['*'];
					obj.Script.call(obj.Context, jsn, remote.address, remote.port);
				}
			});

			mesh.on('error', function (message, remote) {
				log.v('Mesh :: mesh.error ' + name, remote.address + ':' + remote.port + ' - ' + message);
			});
		}

		try {
			await getLocalIP();
		} catch (err) {
			log.e(err);
		}

		if (fun) {
			fun(null, com);
		}


		// only support funtions beyond this point


		function getLocalIP() {
			return new Promise((resolve, _reject) => {
				let ifaces = that.require('os').networkInterfaces();

				Object.keys(ifaces).forEach((ifname) => {
					let alias = 0;

					ifaces[ifname].forEach((iface) => {
						if ('IPv4' !== iface.family || iface.internal !== false) {
							// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
							return;
						}

						if (alias >= 1) {
							// this single interface has multiple ipv4 addresses
							log.w('Too many ipv4 addresses : ', ifname + ':' + alias, iface.address);
						} else {
							// this interface has only one ipv4 adress
							let add = iface.address;
							let parts = add.split('.');
							Vlt.MULTICAST_ADDR = '233.255.255.' + parts[3];
							log.v(`Mesh address is ${add}`);
							Vlt.Host = add;
							Vlt.Solo.bind({
								address: Vlt.Host
							});
							resolve();
						}
						++alias;
					});
				});
			});
		}
	}

	//-----------------------------------------------------LInk
	// Add receiver to distro list
	GetServices(com, fun) {
		log.v('Mesh :: GetServices');
		let Vlt = this.Vlt;
		let PORT = 20000;
		let MULTICAST_ADDR = Vlt.MULTICAST_ADDR || '233.255.255.21';
		if (!('Services' in com)) {
			com.Services = {};
		}
		com.Services.Register = register;
		com.Services.GetSolo = solo;
		com.Services.Send = send;
		com.Services.Share = share;
		if (fun) {
			fun(null, com);
		}

		/**
		 * The 'Register' service creats a distribution mapping for
		 * incoming messages received from the Daemon and calls a
		 * function in some module on the system using the Node.js
		 * .call mechanism with the context (first argument) set
		 * to the 'this' value provided.
		 * Currently a cmd cannot be directed to more than one
		 * destination, and this is something that should be
		 * fixed in later version. This should not require a
		 * major rewrite.
		 * @param {object} cmd : Name of the command to be called
		 * @param {this} context : Context used in the .call function
		 * @param {function} script : Function to be called
		 * 
		 * Function called as script.call(context, obj, host, port)
		 * where obj is the parsed json message received from external
		 * sources with host and port sent to 
		 * 
		 */
		function register(cmd, context, script) {
			let obj = {};
			obj.Context = context;
			obj.Script = script;
			Vlt.Register[cmd] = obj;
		}

		/**
		 * This function supports the 'Send' service and is used
		 * by Daemon and Agent to send message between systems
		 * making up the systems of systems.
		 * @param {object} com Actual message to be sent
		 * @param {string} host : Destination host for message
		 * @param {integer} port : Destination port for message
		 * The host and port of the local host and rcv port
		 * for this system is added to the message in band,
		 * which is probably should be looked at.
		 */
		function send(com, host, port) {
			com.Host = Vlt.Host;
			com.Port = Vlt.Port;
			let msg = JSON.stringify(com);
			log.v('Mesh :: solo.send ', host, port, '\n', msg);
			let buf = new Buffer.from(msg);
			Vlt.Solo.send(buf, 0, buf.length, port, host);
		}

		/**
		 * This supports the 'Share' service which is currently
		 * not being used. It was implemented to support the
		 * 'StarCraft' distribution and might be used in the
		 * future for deployment toplogiies other than the
		 * pipeline distribution model being used for Orca and
		 * resulting deployments.
		 * @param {object} com : The command to be distributed
		 * The message is distributed over a local broadcast
		 * UDP portal which much be in a local LAN. There are
		 * ways of distributing broadcast UDP over a WAN but
		 * that is not what is intended in this implementation
		 * and requires registriation of intent for obvious
		 * reasons.
		 */
		function share(com) {
			com.Host = Vlt.Host;
			com.Port = Vlt.Port;
			let msg = JSON.stringify(com);
			log.v('Mesh :: mesh.send ', MULTICAST_ADDR, PORT, '\n', msg);
			let buf = new Buffer.from(msg);
			Vlt.Mesh.send(buf, 0, buf.length, PORT, MULTICAST_ADDR);
		}

		/**
		 * This routine is used by both Daemon and Solo (but not the user
		 * directly) to obtain the local IP address for subsequent 'Dispatch'
		 * message routing.
		 */
		function solo() {
			if ('Port' in Vlt) {
				let obj = {};
				obj.Host = Vlt.Host;
				obj.Port = Vlt.Port;
				return obj;
			}
		}
	}
}