//# sourceURL=Sphere3D
(function Sphere3D() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup,
		Start,
		Subscribe,
		AddUnit,
		AddLink,
		SetUnitPosition,
		ImageCapture,
		Resize,
		Render,
		DOMLoaded,
		Cleanup,
		DispatchEvent,
		'*': Dispatch
	};

	return Viewify(dispatch, '3.1');

	//-----------------------------------------------------rgbToHex
	function rgbToHex(r, g, b) {
		return (r << 16) + (g << 8) + b;
	}

	function Setup(com, fun) {
		let Par = this.Par;
		let Vlt = this.Vlt;
		Vlt.Units = {};
		Vlt.Links = [];
		Vlt.State = 'Idle';
		this.super(com, (err, cmd) => {
			console.log('--3DView/Setup');
			console.log('Par', JSON.stringify(this.Par, null, 2));
			let div = this.Vlt.div;
			this.Vlt.View = {};
			this.Vlt.Registry = {};
			View = this.Vlt.View;
			View.Geometries = {};
			View.Meshs = {};
			View.Pivots = [];
			View.ResponseHandlers = {};
			View.Ray = new THREE.Raycaster();
			View.Renderer = new THREE.WebGLRenderer({ antialias: true });
			let clear;
			clear = 0xBEDCF7;
			clear = 0xA0785A;
			clear = 0xFF0000;
			if('Clear' in Par)
				clear = rgbToHex(Par.Clear);
			View.Renderer.setClearColor(clear, 1);
			View.Renderer.setSize(div.width(), div.height());
			View.Scene = new THREE.Scene();
			if('Focus' in Par)
				View.Focus = new THREE.Vector3(...Par.Focus);
			else
				View.Focus = new THREE.Vector3(0.0, 0.0, 0.0);
			if('Perspective' in Par) {
				let per = Par.Perspective;
				View.Camera = new THREE.PerspectiveCamera(per[0],
					div.width / div.height, per[1], per[2]);
			} else {
				View.Camera = new THREE.PerspectiveCamera(45,
					div.width / div.height, 0.1, 40000);
			}
			div.append(View.Renderer.domElement);
			let ltclr = 0xFFFFFF;
			let ltpos = [-40, 60, 100];
			if('Light' in Par) {
				ltpos = [Par.Light[0], Par.Light[1], Par.Light[2]];
				if(Par.Light.length === 4)
					ltclr = parseInt(Par.Light[3].substr(1), 16);
			}
			View.Light = new THREE.DirectionalLight(ltclr);
			View.Light.position.set(...ltpos);
			//			View.Scene.add(View.Light);
			let ambient = 0x808080;
			if('Ambient' in Par)
				ambient = rgbToHex(Par.Ambient);
			ambient = 0xFFFFFF;
			View.Ambient = new THREE.AmbientLight(ambient);
			View.Scene.add(View.Ambient);
			let root = new THREE.Object3D();
			root.name = 'Root';
			View.Scene.add(root);
			View.Root = root;
			Vlt.Root = root;
			if('Camera' in Par) {
				View.Camera.position.x = Par.Camera[0];
				View.Camera.position.y = Par.Camera[1];
				View.Camera.position.z = Par.Camera[2];
			} else {
				View.Camera.position.x = 0;
				View.Camera.position.y = -50;
				View.Camera.position.z = 50;
				View.Camera.position.x = 0;
				View.Camera.position.x = 20000;
				View.Camera.position.z = 0;
			}
			View.Camera.up.set(0.0, 0.0, 1.0);
			View.Camera.lookAt(View.Focus);
			View.Camera.updateProjectionMatrix();
			View.RenderLoop = setInterval(_ => {
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
			}, 20);

			document.addEventListener('contextmenu', function(e) {
				e.preventDefault();
			});
			fun(null, com);

		});
	}

	 async function Start(com, fun) {
		console.log('--3DView/Start');
		let Vlt = this.Vlt;
		let Par = this.Par;
		let that = this;

		if ('Controller' in this.Par) {
			let q = {};
			q.Cmd = 'Register';
			q.Pid = Par.Pid;
			this.send(q, Par.Controller, async function(err, r) {
				if(err) {
					console.log('Registration failed, err:' + err);
				} else {
					console.log('Registered with Controller');
				}
				console.log('Register return', JSON.stringify(r, null, 2));
				if('Commands' in r) {
					for(let icom=0; icom<r.Commands.length; icom++) {
						let cmd = r.Commands[icom];
						console.log('==========================================', cmd.Cmd);
						await proc(cmd);
					}
				}
			});
		}
		fun(null, com);

		async function proc(cmd) {
			console.log('..initialize');
			return new Promise((resolve, reject) => {
				that.send(cmd, Par.Pid, function(err, r) {
					if(err) {
						console.log('Command', r.Cmd, ' err:' + err);
					}
					resolve();
				});
			});
		}
	}

	//-----------------------------------------------------Subscribe
	function Subscribe(com, fun) {
		console.log('--Subscribe', JSON.stringify(com));
		let Vlt = this.Vlt;
		let reg = Vlt.Registry;
		//		log.v(' -- Unit/Subscrdibe', JSON.stringify(com, null, 2));
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

	//-----------------------------------------------------Dispatch
	function Dispatch(com, fun) {
		console.log('--Dispatch', com.Cmd);
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
	function AddUnit(com, fun) {
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
					View.Pivots.push(pivot);
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
			console.log('box', box);
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
	function AddLink(com, fun) {
		console.log('--AddLink');
		console.log(JSON.stringify(com));
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
		console.log('unit1', JSON.stringify(user1, null, 2));
		console.log('Units', Object.keys(Vlt.Units));
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
	function SetUnitPosition(com, fun) {
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
		//	log.i('..adjustLinks', name);
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

	function DOMLoaded(com, fun) {
		console.log('--3DView/DOMLoaded');
		this.super(com, fun);
		let div = this.Vlt.div;
		div.append(this.Vlt.View.Renderer.domElement);
		let View = this.Vlt.View;
		View.Renderer.setSize(div.width(), div.height());
		View.Camera.aspect = div.width() / div.height();
		View.Camera.updateProjectionMatrix();
		let q = {};
		q.Cmd = 'SetDomElement',
		q.DomElement = this.Vlt.div;
		this.send(q, this.Par.Navigation, function(err, r) {
			console.log('..Mouse in attack mode');
		});
	}

	function Cleanup(com, fun) {
		console.log('--3DView/Cleanup', this.Par.Pid.substr(30));
		clearInterval(this.Vlt.View.RenderLoop);
		if (fun)
			fun(null, com);
	}

	function Render(com, fun) {
		console.log('--3DView/Render', this.Par.Pid.substr(30));
		this.Vlt.div.append(this.Vlt.View.Renderer.domElement);
		this.super(com, fun);
	}

	function Resize(com, fun) {
		//console.log("--3DView/Resize")
		this.super(com, (err, cmd) => {
			let View = this.Vlt.View;
			View.Renderer.setSize(cmd.width, cmd.height);
			View.Camera.aspect = cmd.width / cmd.height;
			View.Camera.updateProjectionMatrix();
			fun(null, com);
		});
	}

	function ImageCapture(com, fun) {
		if (this.Vlt.Count)
			this.Vlt.Count++;
		else
			this.Vlt.Count = 1;
		View.Renderer.render(View.Scene, View.Camera);
		let b64 = this.Vlt.View.Renderer.domElement.toDataURL();
		com.Image = b64;
		com.Name = this.Vlt.Count;
		if ('Controller' in this.Par) {
			com.Cmd = 'SaveImage';
			this.send(com, this.Par.Controller);
		}
		fun(null, com);
	}

	//-----------------------------------------------------Dispatch
	function DispatchEvent(com) {
		let info = com.info;
		//	console.log('info', JSON.stringify(info, null, 2));
		let Vlt = this.Vlt;
		let that = this;
		Vlt.Mouse = com.mouse;
		let Event = {};
		Event.Action = info.Action;
		if('Mouse' in info) {
			Event.Mouse = info.Mouse;
			let hits = mouseRay(info, Vlt);
			let list = Object.keys(hits);
			if(list.length > 0) {
				Event.Hits = hits;
				list.sort(function(a, b) {
					let ob1 = hits[a];
					let ob2 = hits[b];
					return ob1.Dist - ob2.Dist;
				});
				Event.HitList = list;
			//	console.log(JSON.stringify(Event.HitList));
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
		//		console.log(code);
		if(code in Vlt.Registry) {
			let cmd = {};
			cmd.Cmd = code;
			cmd.Event = Event;
			Dispatch.call(this, cmd, function(err, r) {
				if('State' in r)
					Vlt.State = r.State;
			});
		}
	}

	//-----------------------------------------------------mouseRay
	function mouseRayOld(evt) {
		let info = {};
		let vlt = Vault;
		vlt.Ray.precision = 0.00001;
		container = document.getElementById('Grok');
		let w = container.clientWidth;
		let h = container.clientHeight - 2 * container.clientTop;
		let vec = new THREE.Vector2();
		vec.x = 2 * (evt.clientX - container.offsetLeft) / w - 1;
		vec.y = 1 - 2 * (evt.clientY - container.offsetTop) / h;
		vlt.Ray.setFromCamera(vec, vlt.Camera);
		let hits = vlt.Ray.intersectObjects(vlt.Scene.children, true);
		let hit;
		let obj;
		//	console.log('Hits length is', hits.length);
		for (let i = 0; i < hits.length; i++) {
			hit = hits[i];
			obj = hit.object;
			var data;
			var pt;
			while (obj != null) {
				if ('userData' in obj) {
					data = obj.userData;
					//	console.log('hit', hit);
					//	console.log('mouseRay', data);
					if ('Type' in data) {
						switch (data.Type) {
							case 'Terrain':
								//	if(!('Type' in info))
								//		info.Type = 'Terrain';
								info.Type = 'Terrain';
								info.Terrain = data.Pid;
								info.Point = hit.point;
								break;
							case 'Thing':
								info.Type = 'Thing';
								info.pidThing = data.pidThing;
								info.pidAgent = data.pidAgent;
								break;
						}
						pt = hit.point;
					}
				}
				if ('Type' in info)
					return info;
				obj = obj.parent;
			}
		}
	}

	//-----------------------------------------------------mouseRay
	function mouseRayTmp(info, Vlt) {
		console.log('mouseRay', JSON.stringify(info));
		let View = Vlt.View;
		let Hits = {};
		View.Ray.linePrecision = 0.03;
		container = Vlt.div;
		let w = container.width();
		let h = container.height() - 2 * container.offset().top;
		let vec = new THREE.Vector2();
		vec.x = 2 * (info.Mouse.x - container.offset().left) / w - 1;
		vec.y = 1 - 2 * (info.Mouse.y - container.offset().top) / h;
		// console.log(vec);
		View.Ray.setFromCamera(vec, View.Camera);
		let hits = View.Ray.intersectObjects(View.Scene.children, true);
		let hit;
		console.log('hits length =', hits.length);
		for(let i=0; i<hits.length; i++) {
			hit = hits[i];
			let obj = hit.object;
			//	let keys = Object.keys(hit);
			if('userData' in obj) {
				console.log(i, JSON.stringify(obj.userData));
			}
			//	console.log('hit', i, JSON.stringify(keys));
			if('userData' in obj && 'Type' in obj.userData) {
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
			}
		}
		console.log(JSON.stringify(Hits));
		return Hits;
	}

	//-----------------------------------------------------mouseRay
	function mouseRay(info, Vlt) {
		let View = Vlt.View;
		let Hits = {};
		View.Ray.linePrecision = 0.03;
		container = Vlt.div;
		let w = container.width();
		let h = container.height() - 2 * container.offset().top;
		let vec = new THREE.Vector2();
		vec.x = 2 * (info.Mouse.x - container.offset().left) / w - 1;
		vec.y = 1 - 2 * (info.Mouse.y - container.offset().top) / h;
		// console.log(vec);
		View.Ray.setFromCamera(vec, View.Camera);
		let hits = View.Ray.intersectObjects(View.Scene.children, true);
		let hit;
		for(let i=0; i<hits.length; i++) {
			hit = hits[i];
			if('object' in hit) {
				ancestry(hit, hit.object);
			}
		}
		return Hits;

		// find first ancestor with an attribute 'name'
		function ancestry(hit, obj) {
			if(!obj) {
				return null;
			}
			if('userData' in obj && 'Type' in obj.userData) {
				let type = obj.userData.Type;
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

})();

