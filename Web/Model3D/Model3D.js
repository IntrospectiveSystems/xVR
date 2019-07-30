//# sourceURL=Model/Model3D
(function Model3D() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Start,
		GenModel
	};

	return {
		dispatch: dispatch
	};


	//-----------------------------------------------------rgbToHex
	function rgbToHex(r, g, b) {
		return (r << 16) + (g << 8) + b;
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log('--Model3D/Start');
		fun();
	}

	//-----------------------------------------------------GenModel
	function GenModel(com, fun) {
		console.log('--Model3D/GenModel');
		let modx3d = com.Model;
		let Scale;
		if('Scale' in com)
			Scale = com.Scale;
		let zipx3d = new JSZip();
		let Zip;
		zipx3d.loadAsync(modx3d, {base64: true}).then(function(zip ){
			Zip = zip;
			Zip.file('Type').async('string').then(function(type) {
				console.log('Type', type);
				let obj3d;
				switch(type) {
					case 'X3D':
						obj3d = X3D();
						break;
					default:
						console.log(' ** Invalid model type:', type);
						if(fun)
							fun(err);
						return;
				}
			});		
		});

		async function X3D() {
			console.log('..X3D');
			let Textures = {};
			console.log('..textures');
			let dir = Zip.file(/.*./);
			for(let i=0; i<dir.length; i++) {
				let obj = dir[i];
				let file = obj.name;
				await texture(file);
			}
			return genmod();

			async function texture(file) {
				return new Promise((resolve, reject) => {
					let parts = file.split('.');
					if(parts.length < 2) {
						resolve();
						return;
					}
					let mime;
					let suffix = parts[parts.length-1];
					switch(suffix) {
						case 'png':
							mime = 'image/png';
							break;
						case 'jpg':
							mime = 'image/jpeg';
							break;
						default:
							resolve();
							return;
					}
					Zip.file(file).async('uint8array').then(function(img) {
						let blob = new Blob([img], {type: mime});
						let url = URL.createObjectURL(blob);
						let image = document.createElement('img');
						image.src = url;
						let tex = new THREE.Texture(image);
						tex.wrapS = THREE.RepeatWrapping;
						tex.wrapT = THREE.RepeatWrapping;
						tex.needsUpdate = true;
						Textures[file] = tex;
						resolve();
					});
				});
			}

			function genmod() {
				//debugger;
				console.log('..genmod');
				Zip.file('X3D').async('string').then(function(str) {
				//	console.log('X3D', str);
					let x3d = JSON.parse(str);
					//	dump(x3d);
					//	console.log(JSON.stringify(x3d, null, 2));
					if (!('Root' in x3d)) {
						console.log(' ** ERR: No root in x3d object');
						if(fun)
							fun('No root in x3d object');
						return;
					}
					let root = new THREE.Object3D();
					trv(x3d.Root, root, 0);
					if(Scale)
						root.scale.set(Scale, Scale, Scale);
					console.log('root', typeof root);
					if(fun) {
						com.Obj3d = root;
						fun(null, com);
					}
	
					function trv(nodes, par, lev) {
						console.log('trv', lev, typeof par);
						//	console.log('trv', lev, nodes.length);
						let obj;
						let part;
						for (let i = 0; i < nodes.length; i++) {
							obj = nodes[i];
							console.log('Name', obj.Name);
							let obj3d = new THREE.Object3D();
							obj3d.castShadow = true;
							if ('Parts' in obj) {
								for (let ipart = 0; ipart < obj.Parts.length; ipart++) {
									part = obj.Parts[ipart];
									let type = 'Surface';
									if('Type' in part)
										type = part.Type;
									console.log('part type', ipart, type);
									switch(type) {
										case 'Surface':
											var geo = new THREE.BufferGeometry();
											geo.castShadow = true;
											var vrt = new Float32Array(part.Vrt.length);
											for (var j = 0; j < vrt.length; j++) {
												vrt[j] = part.Vrt[j];
											}
											geo.addAttribute('position', new THREE.BufferAttribute(vrt, 3));
											if ('UV' in part) {
												let nuv = part.UV.length;
												let uv = new Float32Array(nuv);
												for (j = 0; j < nuv; j++)
													uv[j] = part.UV[j];
												geo.addAttribute('uv', new THREE.BufferAttribute(uv, 2));
											}
											if ('Idx' in part) {
												let ndx = part.Idx.length;
												let idx = new Uint16Array(ndx);
												for (var j = 0; j < ndx; j++)
													idx[j] = part.Idx[j];
												geo.setIndex(new THREE.BufferAttribute(idx, 1));
											}
											if ('Nrm' in part) {
												let nrm = new Float32Array(part.Nrm.length);
												for (var j = 0; j < nrm.length; j++)
													nrm[j] = part.Nrm[j];
												geo.addAttribute('normal', new THREE.BufferAttribute(nrm, 3));
											} else {
												geo.computeVertexNormals();
											}
											var color = 0xFFFFFF;
											if ('Diffuse' in part) {
												let diff = part.Diffuse;
												if (typeof diff == 'string') {
													let clr = parseInt(diff);
													if (clr != null)
														color = clr;
												}
												if (Array.isArray(diff)) {
													if(diff.length == 3)
														color = rgbToHex(diff[0], diff[1], diff[2]);
												}
											}
											var opt = {};
											opt.color = color;
											//opt.color = #FFFFFF;
											opt.side = THREE.DoubleSide;
											if ('UV' in part && 'Texture' in part) {
												opt.map = Textures[part.Texture];
											}
											var mat = new THREE.MeshPhongMaterial(opt);
											mat.transparent = true;
											mat.alphaTest = 0.5;
											//mesh.castShadow = true;
											var mesh = new THREE.Mesh(geo, mat);
											obj3d.add(mesh);
											//obj3d.castShadow = true;
											break;
										case 'Lines': // Seriies of line segments (e.g. gl_Lines)
											console.log('Lines');
											var geo = new THREE.Geometry();
											var vrt = part.Vrt;
											for (var j = 0; j < vrt.length; j+=3) {
												geo.vertices.push(new THREE.Vector3(vrt[j], vrt[j+1], vrt[j+2]));
											}
											var opt = {};
											opt.color = 0x000000; // Black
											//	if('Color' in part) {
											//		var clr = part.Color;
											//		opt.color = rgbToHex(clr[0], clr[1], clr[2]);
											//	}	
											var mat = new THREE.LineBasicMaterial(opt);
											var lines = new THREE.LineSegments(geo, mat);
											obj3d.add(lines);
											break;
									}
								}
							}
							if ('Nodes' in obj) {
								trv(obj.Nodes, obj3d, lev + 1);
							}
							obj3d.castShadow = true;
							if (par) {
								par.castShadow = true;
								par.add(obj3d);
							} else {
								console.log('returning', typeof obj3d);
								return obj3d;
							}
						}
					}
				});
			}
		}
		/*
		function textures() {
			//debugger;

			console.log('..textures');
			var dir = Zip.file(/.*./);
			var ifile = -1;
			texture();
//			async.eachSeries(dir, texture, genmod);

			function texture() {
				ifile++;
				if(ifile >= dir.length) {
					genmod();
					return;
				}
				var obj = dir[ifile];
				var file = obj.name;
				var parts = file.split('.');
				if(parts.length < 2) {
					texture();
					return;
				}
				var suffix = parts[parts.length-1];
				switch(suffix) {
					case 'png':
						mime = 'image/png';
						break;
					case 'jpg':
						mime = 'image/jpeg';
						break;
					default:
						texture();
						return;
				}
				Zip.file(file).async('uint8array').then(function(img) {
					var blob = new Blob([img], {type: mime});
					var url = URL.createObjectURL(blob);
					var image = document.createElement('img');
					image.src = url;
					var tex = new THREE.Texture(image);
					tex.wrapS = THREE.RepeatWrapping;
					tex.wrapT = THREE.RepeatWrapping;
					tex.needsUpdate = true;
					Textures[file] = tex;
					texture();
				});
			}
		}
*/
	}

	function dump(x3d) {
		console.log(' ** Dump **');
		if('Textures' in x3d)
			console.log('Textures', JSON.stringify(x3d.Textures));
		if('Root' in x3d) {
			console.log('Root...');
			for(let iobj=0; iobj<x3d.Root.length; iobj++) {
				let obj = x3d.Root[iobj];
				console.log('Object:' + obj.Name);
				console.log('    Pivot:' + JSON.stringify(obj.Pivot));
				// console.log(JSON.stringify(Object.keys(obj)));
				if(!('Parts' in obj))
					continue;
				for(let iprt=0; iprt<obj.Parts.length; iprt++) {
					let part = obj.Parts[iprt];
					console.log('    Part:' + iprt);
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

})();
