//# sourceURL=3DView

/**
 * The 3DView entity is the Apex and only entity of the 3DView Module.
 * This entity requires the Setup function invoked during the Setup phase of Nexus startup. As well as its
 * Start function invoked during the Start phase of Nexus startup.
 *
 * The main capability of this entity is to add and render a Three.js scene on the div provided by
 * the Viewify class (which is stored in this.Vlt.div). Currently only Three.js primitives and generative
 * object3D models can be added to the scene/rendered.
 */
Viewify(class _EVE3D {

	/**
	 * Create the Three.js pieces:
	 * - THREE.Raycaster() saved at this.Vlt.View.Ray
	 * - THREE.WebGLRenderer() saved at this.Vlt.View.Renderer
	 * - THREE.Scene() saved at this.Vlt.View.Scene
	 * - THREE.PerspectiveCamera() saved at this.Vlt.View.Camera
	 * Next append the rendered canvas to the div
	 * Finnish setting up the 3DView and set a loop to check for updates and render them.
	 * @param {Object} com
	 * @callback fun
	 */
	async Setup(com, fun) {
		log.i('--EVE3D/Setup');
		await this.asuper(com);
		this.Vlt.Registry = {};
		this.Vlt.Units = {};
		this.Vlt.Links = [];
		this.Vlt.State='Idle';
		let div = this.Par.$.Canvas;
		//log.w(div);

		//set live for true for the example of an updating system
		let live = false;

		this.Vlt.View = {};
		let View = this.Vlt.View;
		View.Geometries = {};
		View.Pivots = [];
		View.Meshs = {};
		View.ResponseHandlers = {};

		div.width(window.innerWidth);
		div.height(window.innerHeight);

		View.Ray = new THREE.Raycaster();
		View.Renderer = new THREE.WebGLRenderer({ canvas: this.Par.$.Canvas[0], antialias: true });
		View.Renderer.setClearColor(0xBEDCF7, 1);
		View.Renderer.setSize(div.width(), div.height());
		View.Scene = new THREE.Scene();
		View.Focus = new THREE.Vector3(0.0, 0.0, 0.0);
		//log.i('Window: ', window.innerHeight, window.innerWidth);
		View.Camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 4000 );
		View.Light = new THREE.DirectionalLight(0xFFFFFF);
		View.Light.position.set(-40, 60, 100);
		View.Scene.add(View.Light);
		View.Ambient = new THREE.AmbientLight(0x808080);
		View.Scene.add(View.Ambient);	


		// Create the Root object to which all units are appended.
		this.Vlt.Root = new THREE.Object3D();
		this.Vlt.Root.name = 'Root';
		View.Scene.add(this.Vlt.Root);
		
		View.Camera.position.x = 0;
		View.Camera.position.y = -50;
		View.Camera.position.z = 50;
		View.Camera.up.set(0.0, 0.0, 1.0);
		View.Camera.lookAt(View.Focus);
		div.width(window.innerWidth);
		div.height(window.innerHeight);
		$(window).on('resize', (evt) => {
			div.width(window.innerWidth);
			div.height(window.innerHeight);
			View.Camera.aspect = div.width() / div.height();
			View.Camera.updateProjectionMatrix();
		});
	
		this.genModule({
			"Module": 'xVR.Web.Mouse',
			"Par": {
				"Handler": this.Par.Pid
			}
		}, (err, pidApex) => {
			this.send({
				Cmd: "SetDomElement",
				"DomElement": this.Par.$.Canvas
			}, pidApex, (err, cmd) => {
				log.v("GenModded the Mouse and set the DomElement");
			});
		});

		View.RenderLoop = setInterval(_ => {


			// TODO simplify into utility functions
			let xd = View.Camera.position.x - View.Focus.x;
			let yd = View.Camera.position.y - View.Focus.y;
			let zd = View.Camera.position.z - View.Focus.z;
			let angle = -Math.atan2(xd, yd);
			let qazm = new THREE.Quaternion();
			qazm.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
			let r = Math.sqrt(xd*xd + yd*yd);
			let elev = Math.atan2(zd, r);
			let qelv = new THREE.Quaternion();
			qelv.setFromAxisAngle(new THREE.Vector3(1, 0, 0), elev);
			let qbb = new THREE.Quaternion();
			qbb.multiplyQuaternions(qazm, qelv);
			for(let i=0; i<View.Pivots.length; i++) {
				let pivot = View.Pivots[i];
				pivot.setRotationFromQuaternion(qbb);
				pivot.updateMatrix();
			}
			View.Renderer.render(View.Scene, View.Camera);
		}, 20);  // updates roughly every 20 milliseconds




		fun(null, com);
	}

	/**
	 * Subscribes to the server to allow for server communications to reach this module.
	 * If there was a controller defined we also register with that.
	 * @param {Object} com
	 * @callback fun
	 */
	async  Start(com, fun) {
		let that = this;
		com = await this.asuper(com);

		this.Vlt.View.Renderer.domElement.addEventListener("webglcontextlost", function (event) {
			event.preventDefault();
		}, false);


		this.Vlt.View.Renderer.domElement.addEventListener(
			"webglcontextrestored", () => {
				log.w('context restored');
			}, false);

		log.i('--3DView/Start');
		
		/*
		if ("Server" in this.Par) {
			this.send({ Cmd: "Subscribe", Pid: this.Par.Pid, Link: "EVE3D" }, this.Par.Server, (err, com) => {
				log.v("Subscribed with Server");
			});
		}*/

		if ("Controller" in this.Par) {
			this.send({ Cmd: "Register", Pid: this.Par.Pid }, this.Par.Controller, async (err, r) => {
				for(let icom=0; icom<r.Commands.length; icom++) {
					let cmd = r.Commands[icom];
					console.log('==========================================', cmd.Cmd);
					await proc(cmd);
				}
				log.v("Registered with Controller");
			});
		
		}
		fun(null, com);

		async function proc(cmd) {
			console.log('..initialize');
			return new Promise((resolve, reject) => {
				that.send(cmd, that.Par.Pid, function(err, r) {
					if(err) {
						console.log('Command', r.Cmd, ' err:' + err);
					}
					resolve();
				});
			});
		}
	}

	//-----------------------------------------------------Subscribe
	Subscribe(com, fun) {
		let Vlt = this.Vlt;
		let reg = Vlt.Registry;
		log.v(' -- Unit/Subscribe', JSON.stringify(com, null, 2));
		if('Pid' in com) {
			if('Command' in com) {
				reg[com.Command] = com.Pid;
			}
			if('Commands' in com) {
				for(let i=0; i<com.Commands.length; i++) {
					let cmd = com.Commands[i];
					reg[cmd] = com.Pid;
				}
			}
		}
		if(fun) {
			com.View = Vlt.View;
			fun(null, com);
		}
	}


	//-----------------------------------------------------AddUnit
	// Cmd: AddUnit
	// Parent: <Name of parentfeature>
	// Name: <Unique name of feature
	// Type: <e.g. 'Terrain', 'Artifact', 'Link', 'Fixed'>
	// Model: <Name in model server>
	// Title: <title> Optional, billboard above object if present
	//
	// Actual model module is retrieved from the model server
	// based on provided name
	AddUnit(com, fun) {
		console.log('--AddUnit', com.Unit);
		let Par = this.Par;
		let Vlt = this.Vlt;
		let that = this;
		let unit;
		if('Unit' in com) {
			unit = com.Unit;
			console.log('Unit', unit);
			if(unit.Name in Vlt.Units) {
				if(fun)
					fun(null, com);
				return;
			}
			if('Model' in unit) {
				let q = {};
				q.Cmd = 'GetModel';
				q.Model = unit.Model;
				this.send(q, Par.Controller, function(err, r) {
					if(err) {
						if(fun)
							fun(err);
						return;
					} else {
						q = {};
						q.Cmd = 'GenModel';
						q.Model = r.Model;
						if('Scale' in unit)
							q.Scale = unit.Scale;
						that.send(q, Par.Model3D, function(err, r) {
							if(err) {
								log.e(' ** Model ' + q.Model + ' conversion err:' + err);
								if(fun)
									fun(err);
								return;
							}
							console.log('r.Obj3d', typeof r.Obj3d);
							let inst = addUnit(r.Obj3d);
							Vlt.Units[unit.Name] = inst;
							if(fun)
								fun(null, com);
						});
					}
					return;
				});
			} else {
				console.log(' ** No model in unit');
				fun('No model');
				return;
			}
		}

		//model is base64 zip file from ModelServer
		function addUnit(obj3d) {
			console.log('..addUnit');
			let inst = new THREE.Object3D();
			inst.name = unit.Name;
			inst.userData = {};
			inst.userData.Name = unit.Name;
			inst.userData.Type = unit.Type;
			inst.userData.Parent = unit.Parent;
			if('Position' in unit) {
				inst.position.x = unit.Position[0];
				inst.position.y = unit.Position[1];
				inst.position.z = unit.Position[2];
			}
			inst.add(obj3d);
			if('Title' in unit) {
				let box = new THREE.Box3().setFromObject(inst);
				console.log('box', box);
				let title3d = title(box.max.z, unit.Title);
				if(title3d) {
					let pivot = new THREE.Object3D();
					let quat = new THREE.Quaternion();
					pivot.position.z = box.max.z + 1.0;
					//	quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/4);
					//	pivot.setRotationFromQuaternion(quat);
					pivot.add(title3d);
					inst.add(pivot);
					Vlt.View.Pivots.push(pivot);
				}
				else
					console.log(' ** ERR:Bad title');
			}
			let parent = Vlt.View.Scene.getObjectByName(unit.Parent);
			if(parent) {
				parent.add(inst);
				return inst;
			} else {
				console.log(' ** ERR:Cannot find parent', unit.Parent);
			}
		}

		function title(ht, text) {
			// Text is constructed centered at origin and facing in the
			// positive Y direction (due North)
			console.log('...title', text);
			let font = that.getFont('Helvetiker.Bold');
			console.log(font);
			let mesh;
			let size = 0.5;
			let height = 0.25 * size;
			let clr = 0x000000;
			let geo = new THREE.TextGeometry(text, {
				font: font,
				size: size,
				height: height
			});
			geo.computeBoundingBox();
			geo.computeVertexNormals();
			let mat = new THREE.MeshPhongMaterial({ color: clr, shading: THREE.FlatShading });
			mesh = new THREE.Mesh(geo, mat);
			let box = geo.boundingBox;
			let pivot = new THREE.Object3D();
			mesh.position.x = -0.5 * (box.max.x + box.min.x);
			mesh.position.y = -0.5 * (box.max.y + box.min.y);
			mesh.position.z = -0.5 * (box.max.z + box.min.z);
			let rot = new THREE.Object3D();
			rot.add(mesh);
			let qz = new THREE.Quaternion();
			qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
			let qx = new THREE.Quaternion();
			qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2);
			let qt = new THREE.Quaternion();
			qt.multiplyQuaternions(qz, qx);
			rot.setRotationFromQuaternion(qt);
			//	rot.rotateX(Math.PI/2);
			//	rot.rotateZ(3*Math.PI/2);
			return rot;
		}
	}


	//-----------------------------------------------------AddLink
	AddLink(com, fun) {
		console.log('--AddLink', JSON.stringify(com, null, 2));		
		let Par = this.Par;
		let Vlt = this.Vlt;
		if(!(com.From in Vlt.Units)) {
			let err = 'From:' + com.From + ' not in Units';
			log.e(' ** Err:' + err);
			if(fun)
				fun(err);
			return;
		}
		if(!(com.To in Vlt.Units)) {
			let err = 'To:' + com.To + ' not in Units';
			log.e(' ** Err:' + err);
			if(fun)
				fun(err);
			return;
		}
		let unit1 = Vlt.Units[com.From];
		let user1 = unit1.userData;
		let unit2 = Vlt.Units[com.To];
		let user2 = unit2.userData;
		if(user1.Parent !== user2.Parent) {
			let err = 'Link parents do not match';
			log.e(' ** Err:' + err);
			if(fun)
				fun(err);
			return;
		}
		//		link.Obj3d = Vlt.Link.clone();
		let link = genLink();		
		let objpar = Vlt.Units[user1.Parent];
		objpar.add(link.Base);
		Vlt.Links.push(link);
		let q = {};
		q.Cmd = 'SetUnitPosition';
		q.Name = com.From;
		let pos = unit1.position;
		q.Position = [pos.x, pos.y, pos.z];
		this.send(q, Par.Pid);
		if(fun)
			fun(null, com);

		// Generate template link for later cloning
		function genLink() {
			let h = 0.5;
			let line = arc(h);
			let tilt = 5.0*Math.PI/180.0;
			line.rotateX(tilt);
			let base = new THREE.Object3D();
			//			let geo = new THREE.ConeGeometry(0.25, .35, 12);
			let geo = new THREE.ConeGeometry(0.5, .7, 12);
			let mat = new THREE.MeshBasicMaterial({ color:0x000000 });
			let head = new THREE.Mesh(geo, mat);
			head.rotateZ(-Math.PI/2);
			head.position.set(0.5, 0, h);
			base.add(line);
			line.add(head);
			let link = {};
			link.From = com.From;
			link.To = com.To;
			link.H = h;
			link.Base = base;
			link.Head = head;
			link.Line = line;
			return link;
	
			// This function creates a unit length arch of height h in the
			// x direction.
			function arc(h) {
				let geo = new THREE.Geometry;
				for(let x=0; x<=1; x+=0.05) {
					let z = 4*h*(x - x*x);
					geo.vertices.push(new THREE.Vector3(x, 0, z));
				}
				let mat = new THREE.LineBasicMaterial({
					linewidth: 4,
					color: 0x000000
				});
				return new THREE.Line(geo, mat);
			}
		}
	}

	//-----------------------------------------------------SetUnitPosition
	// The message is intercepted and sent to a subscribed
	// module if entry in Vlt.Registry.
	SetUnitPosition(com, fun) {
		//	console.log('--SetUnitPosition', JSON.stringify(com));
		let Vlt = this.Vlt;
		let root = this.Vlt.Root;
		let obj = root.getObjectByName(com.Name);
		if(!obj) {
			log.e('Object', com.Target, 'not found');
			if(fun)
				fun('Unknown object <' + com.Target + '>');
			return;
		}
		if('Position' in com) {
			let loc = com.Position;
			obj.position.x = loc[0];
			obj.position.y = loc[1];
			obj.position.z = loc[2];
			adjustLinks(com.Name);
			//			adjustLinks.call(this, com.Name);
			//			var pid = obj.userData.Pid;
			//			update = true;
		}
		if(fun) {
			fun(null, com);
		}

		function adjustLinks(name) {
		//	log.v('..adjustLinks', name);
		//	let plexus = Vlt.Plexus;
			let links = Vlt.Links;
			let root = Vlt.Root;
			for(let i=0; i<links.length; i++) {
				let link = links[i];
				//	console.log(i, link.From, link.To);
				if(link.From === name || link.To === name) {
					let inst1 = root.getObjectByName(link.From);
					let inst2 = root.getObjectByName(link.To);
					let pos1 = [];
					pos1.push(inst1.position.x);
					pos1.push(inst1.position.y);
					let pos2 = [];
					pos2.push(inst2.position.x);
					pos2.push(inst2.position.y);
					adjustLink(link, pos1, pos2);
				}
			}

			function adjustLink(link, pos1, pos2) {
			//	console.log('..adjustLink', pos1, '|', pos2);
				let x1 = pos1[0];
				let y1 = pos1[1];
				let x2 = pos2[0];
				let y2 = pos2[1];
				let xd = x2 - x1;
				let yd = y2 - y1;
				let scale = Math.sqrt(xd*xd + yd*yd);
				link.Line.scale.set(scale, scale, scale);
				link.Head.scale.set(1/scale, 1/scale, 1/scale);
				let angle = Math.atan2(yd, xd);
				link.Base.setRotationFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
				//				link.Head.position.set(scale/2, 0, scale*link.H);
				link.Base.position.set(x1, y1, 0);
			}
		}
	}

	/**
	 * This is an example of an Evoke handler. This particular example
	 * generates a popup module containing a 3DView module or the one set in
	 * Par.EvokeView. In deployment this code can be removed and EvokeExample
	 * removed from the dispatch table.
	 * @param {Object} 		com
	 * @param {String}		com.id			the id of the object being evoked
	 * @param {Object}		com.mouse 	 the coordinates of the mouse when evoked {x:_x,y:_y}
	 * @callback 	fun
	 */
	EvokeExample(com, fun = _ => _) {
		log.v("EVOKE EXAMPLE", com.id);

		log.v("Popup");
		this.genModule({
			"Module": "xGraph.Popup",
			"Par": {
				Left: com.mouse.x,
				Top: com.mouse.y,
				"View": this.Par.EvokeView || "xGraph.3DView",
				"Width": 800,
				"Height": 600
			}
		}, () => { })
		fun(null, com)
	}

	/**
	 * Removes the render loop, so the scene will no longer look for updates.
	 * @param {Object} com
	 * @callback fun
	 */
	Cleanup(com, fun = _ => _) {
		log.v("--3DView/Cleanup", this.Par.Pid.substr(30));

		clearInterval(this.Vlt.View.RenderLoop);
		fun(null, com);
	}
	
	/**
	 * Captures the canvas as a base64 data url, saves the data url to the "Image"
	 * attribute and the index of the image to the "Name" attribute, sends a
	 * "SaveImage" command to the controller if implemented, and then returns
	 * the "Image" and "Name" attributes with the command in the callback function.
	 * @param {Object} com
	 * @callback fun
	 * @returns {com.Image} the base 64 of the image
	 * @returns {com.Name}	the image count
	 */
	ImageCapture(com, fun) {
		if (this.Vlt.Count)
			this.Vlt.Count++
		else
			this.Vlt.Count = 1;

		this.Vlt.View.Renderer.render(View.Scene, View.Camera);

		let b64 = this.Vlt.View.Renderer.domElement.toDataURL();

		com.Image = b64;
		com.Name = this.Vlt.Count;

		if ("Controller" in this.Par) {
			com.Cmd = "SaveImage";
			this.send(com, this.Par.Controller);
		}

		fun(null, com);
	}

	ActiveLink(com, fun) {
		let Vlt = this.Vlt;
		let root = this.Vlt.Root;		

		if ('DeleteActiveLink' in com && com.DeleteActiveLink == true) {			
			if ('ActiveLink' in Vlt) {				

				let unit1 = Vlt.Units[Vlt.ActiveLink.From];
				let user1 = unit1.userData;
				let objpar = Vlt.Units[user1.Parent];
				objpar.remove(Vlt.ActiveLink.Base);							
				delete Vlt.ActiveLink;
			}			
			if (fun) {
				fun(null, com);
			}
			return;
		}

		if (!('ActiveLink' in Vlt)) {			
			Vlt.ActiveLink = genLink();
		}

		let unit1 = Vlt.Units[com.From];
		let user1 = unit1.userData;

		let objpar = Vlt.Units[user1.Parent];
		objpar.add(Vlt.ActiveLink.Base);
		
		
		let inst1 = root.getObjectByName(Vlt.ActiveLink.From);
		let inst2 = {
			position: {
				x: com.x,
				y: com.y
			}
		};	
		
		let pos1 = [];
		pos1.push(inst1.position.x);
		pos1.push(inst1.position.y);
		let pos2 = [];
		pos2.push(inst2.position.x);
		pos2.push(inst2.position.y);
		adjustLink(Vlt.ActiveLink, pos1, pos2);
		
	

		function adjustLink(link, pos1, pos2) {
		//	console.log('..adjustLink', pos1, '|', pos2);
			let x1 = pos1[0];
			let y1 = pos1[1];
			let x2 = pos2[0];
			let y2 = pos2[1];
			let xd = x2 - x1;
			let yd = y2 - y1;
			let scale = Math.sqrt(xd*xd + yd*yd);
			link.Line.scale.set(scale, scale, scale);
			link.Head.scale.set(1/scale, 1/scale, 1/scale);
			let angle = Math.atan2(yd, xd);
			link.Base.setRotationFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
			//				link.Head.position.set(scale/2, 0, scale*link.H);
			link.Base.position.set(x1, y1, 0);
		}		


		// TODO:: Move to Utility function
		// Generate template link for later cloning
		function genLink() {
			let h = 0.5;
			let line = arc(h);
			let tilt = 5.0*Math.PI/180.0;
			line.rotateX(tilt);
			let base = new THREE.Object3D();			
			let geo = new THREE.ConeGeometry(0.5, .7, 12);
			let mat = new THREE.MeshBasicMaterial({ color:0x000000 });
			let head = new THREE.Mesh(geo, mat);
			head.rotateZ(-Math.PI/2);
			head.position.set(0.5, 0, h);
			base.add(line);
			line.add(head);
			let link = {};
			link.name = 'ActiveLink';			
			link.H = h;
			link.From = com.From;
			link.Base = base;
			link.Head = head;
			link.Line = line;
			return link;
		
			function arc(h) {
				let geo = new THREE.Geometry;
				for(let x=0; x<=1; x+=0.05) {
					let z = 4*h*(x - x*x);
					geo.vertices.push(new THREE.Vector3(x, 0, z));
				}
				let mat = new THREE.LineBasicMaterial({
					linewidth: 4,
					color: 0x000000
				});
				return new THREE.Line(geo, mat);
			}
		}
	}


	/**
	 * Used by the mouse module to propagate interactions.
	 * @param {Object} com
	 * @param {Object} com.info 	the interaction info
	 * @param {String} com.info.Action The interaction action "ex. LeftMouseDown
	 */
	DispatchEvent(com) {
		log.v('DispatchEvent', JSON.stringify(com));
		let info = com.info;
		let Vlt = this.Vlt;
		Vlt.Mouse = com.mouse;
		let Event = {};
		Event.Action = info.Action;
		if('Mouse' in info) {
			Event.Mouse = info.Mouse;
			let hits = mouseRay(info, Vlt, this.Par.$.Canvas);			
			let list = Object.keys(hits);
			if(list.length > 0) {
				Event.Hits = hits;
				list.sort(function(a, b) {
					let ob1 = hits[a];
					let ob2 = hits[b];
					return ob1.Dist - ob2.Dist;
				});
				Event.HitList = list;
			}
		}
		if('CharKey' in info)
			Event.CharKey = info.CharKey;
		if('Factor' in info)
			Event.Factor = info.Factor;
		let code = Vlt.State + '.' + Event.Action;
		switch(Event.Action) {
			case 'KeyDown':
				if('CharKey' in Event)
					code += '.' + Event.CharKey;
				break;
			case 'Wheel':
			case 'Move':
			case 'LeftMouseUp':
			case 'RightMouseUp':
			case 'MouseLeave':
				break;
			default:
				if('HitList' in Event && Event.HitList.length > 0)
					code += '.' + Event.HitList[0];
				break;
		}		
		if(code in Vlt.Registry) {
			let cmd = {};
			cmd.Cmd = code;
			cmd.Event = Event;
			this.dispatch(cmd, function(err, r) {
				if('State' in r)
					Vlt.State = r.State;
			});
		}

		/**
		 * Perform a raycast to see if any of the objects in the scene graph were hit
		 *
		 * @param {Object} info  the interaction info
		 * @param {Object} info.Mouse The coordinates of the click {x:_x,y:_y}
		 * @param {Object} Vlt
		 * @param {Object} Vlt.View
		 */
		function mouseRay(info, Vlt, div) {
			let View = Vlt.View;
			let container = div;
			var w = container.width();		
			var h = container.height() - 2 * container.offset().top;
			var vec = new THREE.Vector2();
			vec.x = 2 * (info.Mouse.x - container.offset().left) / w - 1;
			vec.y = 1 - 2 * (info.Mouse.y - container.offset().top) / h;
			View.Ray.linePrecision = 0.03;
			View.Ray.setFromCamera(vec, View.Camera);
			let hits = View.Ray.intersectObjects(View.Scene.children, true);			
			let hit;
			let Hits = {};			
			for(let i=0; i<hits.length; i++) {
				hit = hits[i];
				if('object' in hit) {
					ancestry(hit, hit.object);
				}
			}
			return Hits;


			// Recursively travel up through all units intersected by mouse ray and return those with unit Types.
			function ancestry(hit, obj) {
				if(!obj) {
					return null;
				}
				if('userData' in obj && 'Type' in obj.userData) {
					let type = obj.userData;
					if(!(type in Hits)) {
						let pnt = {};
						pnt.Name = obj.userData.Name;
						pnt.Type = obj.userData.Type;
						pnt.Pid = obj.userData.Pid;
						pnt.Dist = hit.distance;
						pnt.X = hit.point.x;
						pnt.Y = hit.point.y;
						pnt.Z = hit.point.z;
						Hits[pnt.Type] = pnt;
					}
					return;
				}
				ancestry(hit, obj.parent);
			}
		}		
	}

	//-----------------------------------------------------Dispatch
	'*'(com, fun) {
		let Vlt = this.Vlt;
		if(com.Cmd in Vlt.Registry) {
			this.send(com, Vlt.Registry[com.Cmd], function(err, r) {
				if(fun)
					fun(err, r);
				return;
			});
		} else {
			console.log(' ** Command:' + com.Cmd, 'ignored');
			if(fun)
				fun('Not found', com);
		}
	}

})