//# sourceURL=Cvt3ds.js
(function Cvt3ds() {
	let Par;

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start,
		GetModel: GetModel,
		Convert: Convert
	};

	return {
		dispatch: dispatch
	};

	function Setup(com, fun) {
		console.log('--Cvt3DS/Setup');
		this.Vlt.Graph = [];
		if(fun)
			fun();
	}

	function Start(com, fun) {
		console.log('--Cvt3DS/Start');
		if(fun)
			fun();
	}

	//----------------------------------------------------GetModel
	function GetModel(com, fun) {
		Par = this.Par;
		let path = Par.Model;
		let x3d = Parse(path);
		if (x3d != null) {
			com.Model = {};
			com.Model.Type = 'X3D';
			com.Model.X3D = x3d;
		} else {
			console.log(' ** ERR:Parse failed');
		}
		fun();
	}

	//---------------------------------------------------------Convert
	// Convert 3ds model into x3d format
	function Convert(com, fun) {
		// console.log('--Cvt3DS/Convert', JSON.stringify(com, null, 2));
		Par = this.Par;
		let path = com.Path;
		let x3d = Parse.call(this, path);
		//	console.log('X3D', JSON.stringify(x3d, null, 2));
		if (x3d != null) {
			if ('Rig' in com) {
				Rig(x3d, com.Rig);
			}
			com.X3D = x3d;
		} else {
			console.log(' ** ERR:Parse failed');
		}
		if (fun)
			fun(null, com);
	}

	//---------------------------------------------------------Parse
	// Set output file
	function Parse(path) {
		console.log('..Parse');
		let fs = this.require('fs');
		let cvt3ds = this.require('3dstojs');
		let options = {
			logging: false,
			read: true
		};
		//		var raw = cvt3ds.parse(path, options);
		let raw = cvt3ds.parse(path);
		if (!raw) {
			console.log(' ** ERR:Cvt3DS parse failed');
			return;
		}
		//		traffic.log(JSON.stringify(raw, null, 2));
		let x3j = {};
		x3j.Name = 'Aardvark';
		let o;
		let p;
		let q;
		let r;
		let name;
		let Mat = {};
		let Obj = {};
		let Nod = [];
		let Txt;

		// Material
		q = raw.data.edit.materials;
		for (var i = 0; i < q.length; i++) {
			name = null;
			p = {};
			r = q[i];
			if ('name' in r)
				name = r.name;
			if ('diffuse' in r)
				p.diffuse = r.diffuse.color_24;
			if ('specular' in r)
				p.specular = r.specular.color_24;
			if ('shininess' in r)
				p.shininess = r.shininess;
			if ('texture_map' in r)
				p.texture = r.texture_map.file_name;
			if (name)
				Mat[name] = p;
		}

		// Objects
		q = raw.data.edit.objects;
		for (var i = 0; i < q.length; i++) {
			p = {};
			r = q[i];
			name = null;
			if ('name' in r)
				name = r.name;
			if ('mesh' in r) {
				o = r.mesh[0];
				if ('vertices' in o)
					p.vert = o.vertices.points;
				if ('mapping_coords' in o)
					p.uv = o.mapping_coords.vertex;
				if ('local_coords' in o)
					p.local = o.local_coords;
				if ('faces' in o) {
					p.face = o.faces.faces;
					if ('material' in o.faces)
						p.mat = o.faces.material[0].name;
					// Material Array
					if ('material' in o.faces) {
						let arrmat = o.faces.material;
						let parts = [];
						for (let imat = 0; imat < arrmat.length; imat++) {
							let part = {};
							let mat = arrmat[imat];
							if (mat == null)
								continue;
							part.material = mat.name;
							part.faces = mat.faces;
							parts.push(part);
						}
						p.parts = parts;
					}
					// End of Material Array
					if ('smoothing' in o.faces)
						p.smooth = o.faces.smoothing;
				}
			}
			if (name && ('vert' in p))
				Obj[name] = p;
		}

		// Nodes
		q = raw.data.keyFramer.nodes;
		if (q == null) {
			objects = raw.data.edit.objects;
			let obj;
			let node;
			let Nodes = [];
			for (var i = 0; i < objects.length; i++) {
				obj = objects[i];
				node = {};
				node.Name = obj.name;
				populate(node);
				Nodes.push(node);
			}
			x3j.Root = [];
			node = {};
			node.Nodes = Nodes;
			x3j.Root.push(node);
			if (Txt != null)
				x3j.Textures = Txt;
			return x3j;
		}

		// Generate hierarchal structure from keyframer
		for (var i = 0; i < q.length; i++) {
			p = {};
			r = q[i];
			if ('id' in r)
				p.id = r.id;
			if ('hierarch' in r) {
				p.name = r.hierarch.name;
				p.hier = r.hierarch.hierarchy;
				if (p.hier == 65535)
					p.hier = -1;
			}
			if ('pivot' in r)
				p.pivot = r.pivot;
			Nod.push(p);
		}

		// Create node tree
		//	console.log('Constructing node tree');
		let istack = 0;
		let stack = new Array(20);
		let Root = {};
		Root.Hier = -2;
		stack[0] = Root;
		let hier;
		for (var i = 0; i < Nod.length; i++) {
			p = Nod[i];
			//	console.log('nod[' + i + ']', p);
			hier = p.hier;
			while (stack[istack].Hier >= hier)
				istack--;
			r = stack[istack];
			//	console.log('istack:' + istack, ' r:' + r);
			if (!('Nodes' in r))
				r.Nodes = [];
			q = {};
			q.Name = p.name;
			q.Hier = p.hier;
			if ('pivot' in p) {
				q.Pivot = new Array(3);
				for (let j = 0; j < 3; j++)
					q.Pivot[j] = p.pivot[j];
			}
			populate(q);
			r.Nodes.push(q);
			istack++;
			stack[istack] = q;
		}
		x3j.Root = Root.Nodes;
		if (Txt != null)
			x3j.Textures = Txt;
		return x3j;

		function populate(node) {
			console.log('..populate');
			//	console.log(node);
			let name = node.Name;
			if (name == '$$$DUMMY')
				return;
			let obj = Obj[name];
			if (!obj)
				return;
			//	console.log(obj);
			let nvert = obj.vert.length;
			let vert = obj.vert;
			let uv = obj.uv;
			let face = obj.face;
			let prt;
			let mtrl;
			let mat;
			let fix;	// Face indices
			if (!('parts' in obj))
				return;
			node.Parts = [];
			for (let ipart = 0; ipart < obj.parts.length; ipart++) {
				prt = obj.parts[ipart];
				mtrl = prt.material;
				if (!mtrl)
					continue;
				mat = Mat[mtrl];
				console.log('mat', mat);
				if (!mat)
					continue;
				fix = prt.faces;
				// Construct new part for object and append to node.Parts
				let vix = new Array(vert.length / 3);
				for (var i = 0; i < vix.length; i++)
					vix[i] = -1;
				let ivrt = 0;
				let part = {};
				part.Vrt = [];
				part.Idx = [];
				part.UV = [];
				var iface;
				var ivert;
				var iVrt;
				var facei;
				var vrt;
				for (var i = 0; i < fix.length; i++) {
					iface = fix[i];
					facei = face[i];
					for (let j = 0; j < 3; j++) {
						ivert = facei[j];
						if (vix[ivert] < 0) {	// First encounter
							iVrt = part.Vrt.length / 3;
							vix[ivert] = iVrt;
							part.Vrt.push(vert[3 * ivert]);
							part.Vrt.push(vert[3 * ivert + 1]);
							part.Vrt.push(vert[3 * ivert + 2]);
							if (uv != null) {
								part.UV.push(uv[2 * ivert]);
								part.UV.push(uv[2 * ivert+1]);
							}
						} else { // Already added to vertex list
							iVrt = vix[ivert];
						}
						part.Idx.push(iVrt);
					}
				}
				//	traffic.log('Part' + JSON.stringify(part, null, 2));
				if ('diffuse' in mat) {
					part.Diffuse = new Array(3);
					for (var i = 0; i < 3; i++)
						part.Diffuse[i] = mat.diffuse[i];
				}
				if ('specular' in mat) {
					part.Specular = new Array(3);
					for (var i = 0; i < 3; i++)
						part.Specular[i] = mat.specular[i];
				}
				if ('shininess' in mat)
					part.Shininess = mat.shininess;
				if ('texture' in mat) {
					part.Texture = mat.texture;
					//	if (Txt == null)
					//		Txt = {};
					//	Txt[mat.texture] = {};
					if(!Txt)
						Txt = [];
					if(Txt.indexOf(mat.texture) < 0)
						Txt.push(mat.texture);
				}
				node.Parts.push(part);
			}
		}

	}

})();
