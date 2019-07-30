//# sourceURL=CvtObj.js
(function CvtObj() {
	let Par;
	let MtlLib;

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start,
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

	//---------------------------------------------------------Convert
	// Convert obj model into x3d format
	function Convert(com, fun) {
		Par = this.Par;
		let path = com.Path;
		Parse.call(this, path, done);

		function done(err, x3d) {
			if (x3d === null) {
				console.log(' ** ERR:Parse failed');
				if (fun)
					fun('Parse failed');
				return;
			}
			x3d.Name = com.Name;
			com.X3D = x3d;
			//			console.log('x3d', JSON.stringify(x3d, null, 2));
			console.log(' ** CvtObj processing completed');
			if (fun)
				fun(null, com);
		}
	}

	//-----------------------------------------------------Parse
	// Set output file
	async function Parse(path, done) {
		// console.log('..CvtObj/Parse', path);
		let Math3D = this.require('math3d');
		let earcut = this.require('earcut');
		let fs = this.require('fs');
		let readline = this.require('readline');
		let V = [];
		let Vt = [];
		let Vn = [];
		let Mat;
		let Mats = {};
		let Objects = [];
		let Object = {};
		let Text;
		await scan(path, geometry);
		// console.log('MtlLiv', MtlLib);
		if (MtlLib === null) {
			genx3d(done);
			return;
		}
		let last = path.lastIndexOf('/');
		let mtl = path.substr(0, last + 1) + MtlLib;
		// console.log('mtl path is', mtl);
		await scan(mtl, material);
		genx3d(done);

		async function scan(path, proc) {
			let parts;
			return new Promise((resolve, reject) => {
				const rl = readline.createInterface({
					input: fs.createReadStream(path),
					crlfDelay: Infinity
				});

				rl.on('line', (line) => {
					//	console.log(`Line from file: ${line}`);
					parts = line.split(/[ ,]+/);
					//	for(var i=0; i<parts.length; i++)
					//		parts[i] = parts[i].trim();
					proc(parts);
				});

				rl.on('close', function() {
					console.log('..close');
					resolve();
				});

			});
		}

		function geometry(fld) {
			//			log.v('obj', fld);
			switch (fld[0]) {
				case '#':
					console.log('comment');
					break;
				case 'o':
				case 'g':
					Object = {};
					Object.Name = fld[1];
					Object.Vrt = [];
					Object.Nrm = [];
					Object.UV = [];
					Object.Idx = [];
					Objects.push(Object);
					break;
				case 'v':
					V.push(parseFloat(fld[1]));
					V.push(parseFloat(fld[2]));
					V.push(parseFloat(fld[3]));
					break;
				case 'vt':
					Vt.push(parseFloat(fld[1]));
					Vt.push(parseFloat(fld[2]));
					break;
				case 'vn':
					Vn.push(parseFloat(fld[1]));
					Vn.push(parseFloat(fld[2]));
					Vn.push(parseFloat(fld[3]));
					break;
				case 'f':
					face(fld);
					break;
				case 'mtllib':
					MtlLib = fld[1];
					console.log('MtlLib <=', MtlLib);
					break;
				case 'usemtl':
					Object.Mat = fld[1];
					break;
				case 's':
					break;
				default:
					console.log(' ** Unknown <' + fld[0] +'>');
					break;
			}

			function face(fld) {
				let nvrt = Object.Vrt.length/3;
				let ivrt;
				var iuv;
				var inrm;
				let uv0;
				let uv1;
				let nfld = fld.length;
				let xyz = [];
				for (let ifld = 1; ifld < nfld; ifld++) {
					let v = fld[ifld].split('/');
					ivrt = parseInt(v[0]) - 1;
					xyz.push(V[3 * ivrt], V[3 * ivrt + 1], V[3 * ivrt + 2]);
					Object.Vrt.push(V[3 * ivrt], V[3 * ivrt + 1], V[3 * ivrt + 2]);
					if(v.length > 1) {
						var iuv = parseInt(v[1]) - 1;
						Object.UV.push(Vt[2*iuv], Vt[2*iuv+1]);
					}
					if (v[1].length > 0) {
						iuv = parseInt(v[1]) - 1;
						uv0 = Vt[2 * iuv];
						if (uv0 < 0.0)
							uv0 += 1.0;
						uv1 = Vt[2 * iuv + 1];
						if (uv1 < 0.0)
							uv1 += 1.0;
						Object.UV.push(uv0, uv1);
					}
					if(v.length > 2) {
						var inrm = parseInt(v[2]) - 1;
						Object.Nrm.push(Vn[3*inrm], Vn[3*inrm+1], Vn[3*inrm+2]);
					}
				}
				let idx = tesselate(xyz);
				//	console.log('idx', idx);
				for (let i = 0; i < idx.length; i++)
					Object.Idx.push(nvrt + idx[i]);
			}

			//.............................................tesselate
			// Calculate face vertices for the tesselation
			// of a planar polygon in 3D. Input is a sequence
			// of x, y, z triples, and the output is an
			// array of face index triples for each triange.
			// Polygon orientation in 3D space is arbitary
			function tesselate(xyz) {
				let v1 = new Math3D.Vector3(xyz[3] - xyz[0], xyz[4] - xyz[1], xyz[5] - xyz[2]);
				let v2 = new Math3D.Vector3(xyz[6] - xyz[0], xyz[7] - xyz[1], xyz[8] - xyz[2]);
				let v3 = v1.cross(v2);
				//	console.log('Normal', v3.x, v3.y, v3.z);
				let ang;
				let vax;
				if (v3.z > 0.9999) {
					ang = 0.0;
					vax = new Math3D.Vector3(1, 0, 0);
				} else {
					if (v3.z < -0.9999) {
						ang = Math.PI;
						vax = new Math3D.Vector3(1, 0, 0);
					} else {
						ang = Math.acos(v3.z);
						vup = new Math3D.Vector3(0.0, 0.0, 1.0);
						vax = v3.cross(vup); // forward is z in real coordinates
					}
				}
				let deg = 180.0 * ang / Math.PI;
				//	console.log('ang', deg, 'vax', vax.x, vax.y, vax.z);
				let q = Math3D.Quaternion.AngleAxis(vax, deg);
				let vxyz;
				let xy = [];
				for (let i = 0; i < xyz.length; i += 3) {
					vxyz = q.mulVector3(new Math3D.Vector3(xyz[i], xyz[i + 1], xyz[i + 2]));
					//	console.log('vxyz', vxyz.x, vxyz.y, vxyz.z);
					xy.push(vxyz.x, vxyz.y);
				}
				let idx = earcut(xy, null, 2);
				//	console.log('idx', idx);
				return idx;
			}
		}

		function material(fld) {
			console.log('mlt', fld);
			if (fld[0] === 'newmtl') {
				let name = fld[1];
				Mat = {};
				Mats[name] = Mat;
			}
			if (!Mat)
				return;
			switch (fld[0]) {
				case '#':
					break;
				case 'Ka':
					Mat.Ambi = [];
					Mat.Ambi.push(parseFloat(Math.round(255 * fld[1])));
					Mat.Ambi.push(parseFloat(Math.round(255 * fld[2])));
					Mat.Ambi.push(parseFloat(Math.round(255 * fld[3])));
					console.log(' ++ Ambi', Mat.Ambi);
					break;
				case 'Kd':
					Mat.Diff = [];
					Mat.Diff.push(parseFloat(Math.round(255 * fld[1])));
					Mat.Diff.push(parseFloat(Math.round(255 * fld[2])));
					Mat.Diff.push(parseFloat(Math.round(255 * fld[3])));
					console.log(' ++ Diff', Mat.Diff);
					break;
				case 'Ks':
					Mat.Spec = [];
					Mat.Spec.push(parseFloat(Math.round(255 * fld[1])));
					Mat.Spec.push(parseFloat(Math.round(255 * fld[2])));
					Mat.Spec.push(parseFloat(Math.round(255 * fld[3])));
					console.log(' ++ Spec', Mat.Spec);
					break;
				case 'map_Kd':
					Mat.Text = fld[1];
					break;
			}
		}

		function genx3d(wrap) {
			console.log('..genx3d');
			for (key in Objects) {
				console.log('Material', key);
				var obj = Objects[key];
				for (att in obj) {
					switch (att) {
						case 'Vrt':
						case 'Nrm':
						case 'UV':
						case 'Idx':
							console.log(att + ':' + obj[att].length);
							break;
						default:
							console.log(att + ':' + obj[att]);
							break;
					}
				}
			}
			log.v('Mats', JSON.stringify(Mats, null, 2));
			let x3d = {};
			let root = [];
			let node = {};
			node.Name = 'Nada';
			node.Pivot = [0, 0, 0];
			node.Parts = [];
			for (name in Objects) {
				var obj = Objects[name];
				if (obj.Idx.length < 3)
					continue;
				let part = {};
				part.Vrt = obj.Vrt;
				if (obj.Nrm.length > 0)
					part.Nrm = obj.Nrm;
				if (obj.UV.length > 0)
					part.UV = obj.UV;
				part.Idx = obj.Idx;
				if('Mat' in obj && obj.Mat in Mats) {
					let mat = Mats[obj.Mat];
					log.v('mat', JSON.stringify(mat, null, 2));
					if (mat.Diff.length > 0)
						part.Diffuse = mat.Diff;
					if (mat.Ambi.length > 0)
						part.Ambient = mat.Ambi;
					if (mat.Spec.length > 0)
						part.Specular = mat.Spec;
					if ('Text' in mat) {
						part.Texture = mat.Text;
						if(!('Textures' in x3d))
							x3d.Textures = [];
						if(x3d.Textures.indexOf(mat.Text) < 0)
							x3d.Textures.push(mat.Text);
						/*	if ('Textures' in x3d) {
						 x3d.Textures[mat.Text] = {};
						 } else {
						 x3d.Textures = {};
						 x3d.Textures[mat.Text] = {};
						 } */
					}
				}
				node.Parts.push(part);
			}
			root.push(node);
			x3d.Root = root;
			wrap(null, x3d);
		}
	}
})();
