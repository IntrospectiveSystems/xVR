//# sourceURL=CvtLwo.js
(function CvtLwo() {
	let Par;

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
		console.log('--CvtLwo/Setup');
		this.Vlt.Graph = [];
		if(fun)
			fun();
	}

	function Start(com, fun) {
		console.log('--CvtLwo/Start');
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
			if (x3d == null) {
				console.log(' ** ERR:Parse failed');
				if (fun)
					fun('Parse failed');
				return;
			}
			dump(x3d);
			x3d.Name = com.Name;
			com.X3D = x3d;
			console.log(' ** CvtLwo processing completed');
			if(fun)
				fun(null, com);
		}

		function dump(x3d) {
			if('Textures' in x3d)
				console.log('Textures', JSON.stringify(x3d.Textures));
			if('Root' in x3d) {
				// console.log('Root...');
				for(let iobj=0; iobj<x3d.Root.length; iobj++) {
					let obj = x3d.Root[iobj];
					// console.log('Object:' + obj.Name);
					// console.log('    Pivot:' + JSON.stringify(obj.Pivot));
					//	console.log(JSON.stringify(Object.keys(obj)));
					for(let iprt=0; iprt<obj.Parts.length; iprt++) {
						let part = obj.Parts[iprt];
						// console.log('    Part:' + iprt);
						for(key in part) {
							switch(key) {
								case 'Name':
									console.log('        Name:' + part.Name);
									break;
								case 'Vrt':
									console.log('        Vrt:' + part.Vrt.length/3);
									break;
								case 'UV':
									console.log('        UV:' + part.UV.length/2);
									break;
								case 'Idx':
									console.log('        Idx:' + part.Idx.length/3);
									break;
								case 'Texture':
									console.log('        Texture:' + part.Texture);
									break;
								default:
									console.log('        ' + key);
									break;
							}
						}
					}
				}
			}
		}
	}

	//-----------------------------------------------------Parse
	// Set output file
	function Parse(path, done) {
		// console.log('..CvtLwo/Parse', path);
		let Math3D = this.require('math3d');
		let earcut = this.require('earcut');
		let fs = this.require('fs');
		let Layers = [];
		let Surfs = {};
		let Clips = {};
		let Layer;
		let Tags = [];
		fs.readFile(path, function(err, buf) {
			if(err) {
				console.log(' ** ERR:' + err);
				done(err);
				return;
			}
			nsize = buf.length;
			// console.log('nsize', nsize);
			//	for(var i=0; i<20; i++)
			//		console.log(i, buf[i], buf.toString('ascii', i, i+1));
			var ix = 0;
			let form = buf.toString('ascii', ix, ix+4);
			let nform = buf.readInt32BE(ix+4);
			var ix = 12;
			var chunk;
			while(ix < nform+8) {
				let id = buf.toString('ascii', ix, ix+4);
				let nchunk = buf.readInt32BE(ix+4);
				var chunk = buf.slice(ix+8, ix+nchunk+8);
				switch(id) {
					case 'TAGS':
						tags(nchunk, chunk);
						break;
					case 'LAYR':
						layr(nchunk, chunk);
						break;
					case 'PNTS':
						pnts(nchunk, chunk);
						break;
					case 'BBOX':
						bbox(nchunk, chunk);
						break;
					case 'VMAP':
						vmap(nchunk, chunk);
						break;
					case 'VMAD':
						vmad(nchunk, chunk);
						break;
					case 'POLS':
						pols(nchunk, chunk);
						break;
					case 'PTAG':
						ptag(nchunk, chunk);
						break;
					case 'CLIP':
						clip(nchunk, chunk);
						break;
					case 'SURF':
						surf(nchunk, chunk);
						break;
					default:
						console.log(id, nchunk);
						break;
				}
				ix += nchunk + 8;
			}
			genx3d();
		});

		function tags(ndata, data) {
			let i1 = 0;
			let state = 1;
			let str;
			for(let i=0; i<ndata; i++) {
				switch(state) {
					case 0:
						if(data[i] != 0) {
							i1 = i;
							state = 1;
						}
						break;
					case 1:
						if(data[i] == 0) {
							str = data.toString('ascii', i1, i);
							Tags.push(str);
							state = 0;
						}
						break;
				}
			}
			// console.log('TAGS', ndata, Tags);
		}

		//TBD: LAYR is the equivalent of the x3d Object, and provides for
		// hierarchal articulated modules. Need to add this capability
		// at some point.
		function layr(ndata, data) {
			let n = data.readInt16BE(0);
			let flag = data.readInt16BE(2);
			let x = data.readFloatBE(4);
			let y = data.readFloatBE(8);
			let z = data.readFloatBE(12);
			let name;
			i1 = 16;
			for(let i=i1; i<ndata; i++) {
				if(data[i] == 0) {
					name = data.toString('ascii', i1, i);
					i1 = i+1;
					if(i1 % 2 == 1)
						i1++;
					break;
				}
			}
			// console.log('LAYR', ndata, 'Layer:' + n, 'Name:' + name, 'flag:' + flag);
			// console.log('     Pivot(' + x + ',' + y + ',' + z + ')');
			Layer = {};
			Layer.idLayer = n;
			Layer.Name = name;
			Layer.Flags = flag;
			Layer.Pivot = [x, y, z];
			Layer.Pnts = [];
			//			Layer.UV created later as Uint8Array
			Layer.Ply = [];
			Layer.ixPly = [];
			Layer.Clips = {};
			Layer.Surf = [];
			Layers.push(Layer);
		}

		function pnts(ndata, data) {
			let pts = Layer.Pnts;
			for(i=0; i<ndata/4; i++) {
				let val = data.readFloatBE(4*i);
				pts.push(val);
			}
			// console.log('PNTS', ndata, 'Pnts:' + pts.length/3);
			// console.log('     (' + pts[0] + ',' + pts[1] + ',' + pts[2] + ')');
			// console.log('     (' + pts[3] + ',' + pts[4] + ',' + pts[5] + ')');
			// console.log('         ...');
			let j = pts.length - 4;
			// console.log('     (' + pts[j] + ',' + pts[j+1] + ',' + pts[j+2] + ')');
		}

		function bbox(ndata, data) {
			// console.log('BBOX', ndata);
			let pts = [];
			for(let i=0; i<6; i++) {
				let val = data.readFloatBE(4*i);
				pts.push(val);
			}
			// console.log('     Min:(' + pts[0] + ',' + pts[1] + ',' + pts[2] + ')');
			// console.log('     Max:(' + pts[3] + ',' + pts[4] + ',' + pts[5] + ')');
		}

		function vmap(ndata, data) {
			let type = data.toString('ascii', 0, 4);
			let dim = data.readInt16BE(4);
			let pnts = Layer.Pnts;
			let str = '';
			let ilast;
			for(var i=6; i<ndata; i++) {
				if(data[i] == 0) {
					ilast = i+1;
					if(ilast % 2)
						ilast++;
					break;
				}
			}
			let name = data.toString('ascii', 6, ilast);
			// console.log('VMAP', ndata, 'Type:' + type, 'Dim:' + dim, 'Name:' + name);
			if(type != 'TXUV')
				return;
			let npt = pnts.length/3;
			Layer.UV = new Float32Array(2*npt);
			let uv = Layer.UV;
			let iuv = ilast;
			let ivrt;
			let u;
			let v;
			while(iuv < ndata) {
				ivrt = data.readInt16BE(iuv);
				u = data.readFloatBE(iuv+2);
				v = data.readFloatBE(iuv+6);
				uv[2*ivrt] = u;
				uv[2*ivrt+1] = v;
				iuv += 10;
			}
			for(var i=0; i<8; i++)
				console.log('      ', i, uv[2*i], uv[2*i+1]);
			console.log('           ...');
			for(var i=npt-3; i<npt; i++)
				console.log('      ', i, uv[2*i], uv[2*i+1]);
		}

		function vmad(ndata, data) {
			let type = data.toString('ascii', 0, 4);
			let dim = data.readInt16BE(4);
			let pnts = Layer.Pnts;
			let str = '';
			let ilast;
			for(let i=6; i<ndata; i++) {
				if(data[i] == 0) {
					ilast = i+1;
					if(ilast % 2)
						ilast++;
					break;
				}
			}
			let name = data.toString('ascii', 6, ilast);
			// console.log('VMAD', ndata, 'Type:' + type, 'Dim:' + dim, 'Name:' + name);
			if(type != 'TXUV')
				return;
			let npt = pnts.length/3;
			let uv = new Float32Array(2*npt);
			let iuv = ilast;
			let ivrt;
			let iply;
			let u;
			let v;
			while(iuv < ndata) {
				ivrt = data.readInt16BE(iuv);
				iply = data.readInt16BE(iuv+2);
				u = data.readFloatBE(iuv+4);
				v = data.readFloatBE(iuv+8);
				if(iuv < 100)
					console.log(iuv, ivrt, iply, u, v);
				uv[2*ivrt] = u;
				uv[2*ivrt+1] = v;
				iuv += 12;
			}
		}

		function pols(ndata, data) {
			let type = data.toString('ascii', 0, 4);
			// console.log('POLS', ndata, 'Type:' + type);
			iply = 4;
			while(iply < ndata) {
				let ply = [];
				let ival = data.readInt16BE(iply);
				let nvrt = ival & 0x03FF;
				iply += 2;
				var ix;
				for(let i=0; i<nvrt; i++) {
					ix = data.readInt16BE(iply);
					ply.push(ix);
					iply += 2;
				}
				Layer.Ply.push(ply);
			}
			for(let iply=0; iply<3; iply++)
				console.log('     ' + iply + ':' + Layer.Ply[iply]);
			console.log('        ...');
			iply1 = Layer.Ply.length - 2;
			for(var iply=iply1; iply<Layer.Ply.length; iply++)
				console.log('     ' + iply + ':' + Layer.Ply[iply]);
		}

		function ptag(ndata, data) {
			let type = data.toString('ascii', 0, 4);
			// console.log('PTAG', ndata, 'Type:' + type);
			if(type != 'SURF')
				return;
			let ix=4;
			while(ix < ndata) {
				let ixply = data.readInt16BE(ix);
				let itag = data.readInt16BE(ix+2);
				Layer.ixPly.push(ixply);
				Layer.ixPly.push(itag);
				ix += 4;
			}
			for(var i=0; i<8; i+=2)
				console.log('     ', Layer.ixPly[i], Layer.ixPly[i+1]);
			console.log('       ...');
			let nply = Layer.ixPly.length;
			for(var i=nply-8; i<nply; i+=2)
				console.log('     ', Layer.ixPly[i], Layer.ixPly[i+1]);
		}

		function clip(ndata, data) {
			let indx = data.readInt32BE(0);
			// console.log('CLIP', ndata, 'Index:' + indx);
			let isub = 4;
			while(isub < ndata) {
				let id = data.toString('ascii', isub, isub+4);
				let nsub = data.readInt16BE(isub+4);
				switch(id) {
					case 'STIL':
						var i1 = isub+6;
						var file;
						for(let i=i1; i<ndata; i++) {
							if(data[i] == 0) {
								file = data.toString('ascii', i1, i);
								console.log('     ' + id, 'File:' + file);
								break;
							}
						}
						if(file)
							Clips[indx] = file;
						break;
					case 'FLAG':
						var ival = data.readInt32BE(isub+6);
						console.log('     FLAG', ival);
						break;
					default:
						console.log('     ' + id);
						break;
				}
				isub += nsub + 6;
			}
		}

		function surf(ndata, data) {
			let i1 = 0;
			let name;
			let source;
			let blok;
			let surf = {};
			for(let i=i1; i<ndata; i++) {
				if(data[i] == 0) {
					name = data.toString('ascii', i1, i);
					Surfs[name] = surf;
					i1 = i+1;
					if(i1 % 2 == 1)
						i1++;
					break;
				}
			}
			for(let i=i1; i<ndata; i++) {
				if(data[i] == 0) {
					if(i == i1)
						source = '';
					else
						source = data.toString('ascii', i1, i);
					i1 = i+1;
					if(i1 % 2 == 1)
						i1++;
					break;
				}
			}
			// console.log('SURF Name:' + name, 'Source:' + source);
			let isub = i1;
			let rgb;
			let val;
			let ival;
			let iblk1;
			let iblk2;
			while(isub < ndata) {
				let id = data.toString('ascii', isub, isub+4);
				let nsub = data.readInt16BE(isub+4);
				switch(id) {
					case 'COLR':
						rgb = [];
						rgb.push(data.readFloatBE(isub+6));
						rgb.push(data.readFloatBE(isub+10));
						rgb.push(data.readFloatBE(isub+14));
						surf.RGB = rgb;
						console.log('     COLR', rgb);
						break;
					case 'LUMI':
					case 'DIFF':
					case 'SPEC':
					case 'REFL':
					case 'TRAN':
					case 'TRNL':
					case 'GLOS':
					case 'BUMP':
					case 'RIND':
					case 'SMAN':
						val = data.readFloatBE(isub+6);
						console.log('     ' + id, val);
						break;
					case 'SIDE':
						ival = data.readInt16BE(isub+6);
						surf.Side = ival;
						console.log('     ' + id, ival);
						break;
					case 'ALPH':
						ival = data.readInt16BE(isub+6);
						val = data.readFloatBE(isub+8);
						console.log('     ALPH Mode:', ival, 'Val:', val);
						break;
					case 'BLOK':
						console.log('     BLOK', nsub);
						blok = {};
						iblk1 = isub+6;
						iblk2 = iblk1 + nsub;
						while(iblk1 < iblk2) {
							let type = data.toString('ascii', iblk1, iblk1+4);
							let nblk = data.readInt16BE(iblk1+4);
							switch(type) {
								case 'IMAP':
									imap(nblk, data.slice(iblk1+6, iblk1+nblk+6));
									break;
								case 'TMAP':
									tmap(nblk, data.slice(iblk1+6, iblk1+nblk+6));
									break;
								case 'IMAG':
									ival = data.readInt16BE(iblk1+6);
									blok.idClip = ival;
									console.log('        ', type, nblk, 'Clip:' + ival);
									break;
								default:
									console.log('        ', type, nblk);
									break;
							}
							iblk1 += nblk + 6;
						}
						break;
					default:
						console.log('     ' + id);
						break;
				}
				isub += nsub + 6;
			}

			function imap(nbuf, buf) {
				let ord = 'Duh';
				let ibuf = 0;
				for(let i=0; i<nbuf; i++) {
					if(buf[i] == 0) {
						ord = buf.toString('ascii', 0, i);
						ibuf = i+1;
						if(ibuf % 2 == 1)
							ibuf++;
						break;
					}
				}
				console.log('         IMAP', nbuf, 'Ord:' + ord);
				while(ibuf < nbuf) {
					let type = buf.toString('ascii', ibuf, ibuf+4);
					let nprt = buf.readInt16BE(ibuf+4);
					switch(type) {
						case 'CHAN':
							var chan = buf.toString('ascii', ibuf+6, ibuf+10);
							surf[chan] = blok;
							console.log('             ' + type, 'Chan:', chan);
							break;
						default:
							console.log('             ' + type);
							break;
					}
					ibuf += nprt+6;
				}
			}

			function tmap(nbuf, buf) {
				console.log('         TMAP', nbuf);
				let ibuf = 0;
				while(ibuf < nbuf) {
					let type = buf.toString('ascii', ibuf, ibuf+4);
					let nprt = buf.readInt16BE(ibuf+4);
					console.log('             ' + type);
					ibuf += nprt+6;
				}
			}
		}

		function genx3d() {
			//TBD: This only processes the first layer. Need to introduce
			// full hierarcah layer structure of the LWO format.
			console.log('..genx3d');
			// console.log('Surfs', JSON.stringify(Surfs, null, 2));
			// console.log('Clips', JSON.stringify(Clips, null, 2));
			let x3d = {};
			let textures = [];
			let root = [];
			var part;
			for(let ilay=0; ilay<Layers.length; ilay++) {
				var layer = Layers[ilay];
				// console.log('Keys', JSON.stringify(Object.keys(layer)));
				let name = layer.Name;
				console.log('*****Layer:' + name);
				let node = {};
				node.Name = name;
				node.Pivot = layer.Pivot;
				node.Parts = [];
				let ixsrf = {};
				var ix;
				for(iply=1; iply<layer.ixPly.length; iply+=2) {
					ix = layer.ixPly[iply];
					if(ix in ixsrf)
						ixsrf[ix]++;
					else
						ixsrf[ix] = 1;
				}
				// console.log(JSON.stringify(ixsrf));
				for(key in ixsrf) {
					let itag = parseInt(key);
					var part = genpart(itag);
					if(part)
						node.Parts.push(part);
				}
				root.push(node);

				function genpart(itag) {
					console.log('..genpart', itag);
					let part = {};
					if(itag < 0 || itag >= Tags.length) {
						var err = 'Invalid tag index ' + itag;
						console.log(' ** ERR:' + err);
						done(err);
						return;
					}
					let tag = Tags[itag];
					if(!(tag in Surfs)) {
						var err = 'No surface for part';
						console.log(' ** ERR:' + err);
						done(err);
						return;
					}
					let surf = Surfs[tag];
					part.Name = tag;
					part.Diffuse = surf.RGB;
					part.Ambient = surf.RGB;
					part.Specular = surf.RGB;
					if('COLR' in surf) {
						let iclip = surf.COLR.idClip;
						let text = Clips[iclip];
						part.Texture = text;
						if(textures.indexOf(text) < 0)
							textures.push(text);
					}
					let poly;
					nply = 0;
					let vrt = [];
					let idx = [];
					let uv = [];
					let nvrt = layer.Pnts.length/3;
					let ixvrt = new Int16Array(nvrt);
					let ivrt;
					for(i=0; i<nvrt; i++)
						ixvrt[i] = -1;
					let pnts = layer.Pnts;
					for(let iply=0; iply<layer.ixPly.length; iply+=2) {
						if(layer.ixPly[iply+1] != itag)
							continue;
						ixply = layer.ixPly[iply];
						let ply = layer.Ply[ixply];
						let xyz = [];
						for(let i=0; i<ply.length; i++) {
							var ix = ply[i];
							for(var j=0; j<3; j++) {
								xyz.push(pnts[3*ix+j]);
							}
						}
						let jdx = tesselate(xyz);
						//	console.log(jdx);
						for(var i=0; i<jdx.length; i++) {
							ix = ply[jdx[i]];
							if(ixvrt[ix] < 0) {
								ivrt = vrt.length/3;
								ixvrt[ix] = ivrt;
								for(j=0; j<3; j++)
									vrt.push(pnts[3*ix+j]);
								for(j=0; j<2; j++)
									uv.push(layer.UV[2*ix+j]);
							} else {
								ivrt = ixvrt[ix];
							}
							idx.push(ivrt);
						}
					}
					part.Vrt = vrt;
					part.UV = uv;
					part.Idx = idx;
					return part;
				}
			}
			x3d.Textures = textures;
			x3d.Root = root;
			done(null, x3d);
		}

		//.............................................tesselate
		// Calculate face vertices for the tesselation
		// of a planar polygon in 3D. Input is a sequence
		// of x, y, z triples, and the output is an
		// array of face index triples for each triange.
		// Polygon orientation in 3D space is arbitary
		function tesselate(xyz) {
			let nvrt = xyz.length/3;
			switch(nvrt) {
				case 0:
				case 1:
				case 2:
					return;
				case 3:
					return [0, 1, 2];
				case 4:
					return [0, 1, 2, 0, 2, 3];
			}
			if(nvrt < 3)
				return;
			if(nvrt )
				var v1 = new Math3D.Vector3(xyz[3] - xyz[0], xyz[4] - xyz[1], xyz[5] - xyz[2]);
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
})();
