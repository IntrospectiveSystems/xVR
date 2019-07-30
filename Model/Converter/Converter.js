//# sourceURL=Converter.js
(function Converter() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup: Setup,
		Start: Start
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Start(com, fun) {
		log.v('--Converter/Start');
		if(fun)
			fun();
	}

	//-----------------------------------------------------Start
	function Setup(com, fun) {
		log.v('--Converter/Setup');
		var that = this;
		let fs = this.require('fs');
		let jszip = this.require('jszip');
		let async = this.require('async');
		let Par = this.Par;
		let Models = Par.Models;
		let Stash = Models + '/stash';
		if (!fs.existsSync(Stash)){
			fs.mkdirSync(Stash);
		}
		let Textures;
		log.v('Models', Models);
		log.v('Stash', Stash);
		let Stack = [];
		let Pars = [];
		let Cvt = {};
		let Name;
		let rig = {};
		rig.Name = '';
		Stack.push(rig);
		let Vlt = this.Vlt;
		if (!('ModelIndex' in Par))
			Par.ModelIndex = {};
		let ModelIndex = Par.ModelIndex;
		Par.ModelIndex = ModelIndex;
		var that = this;		
		trav('', 0, done);

		function done() {
			generate();
		}

		function trav(dir, lev, func) {
			let path;
			path = Models;
			if(dir.length > 0)
				path += '/' + dir;
			log.v('trv', path);
			let rigfile = path + '/' + 'Rig.json';
			log.v(rigfile);
			fs.exists(rigfile, function (yes) {
				if (yes) {
					log.v(rigfile);
					fs.readFile(rigfile, readrig);
				} else {
					Stack.push(Stack[Stack.length - 1]);
					scandir();
				}
			});

			function readrig(err, data) {
				if (err) {
					log.e(' ** ERR:Cannot read rig file:' + rigfile);
					func('Cannot read rig file');
					return;
				}
				let str = data.toString();
				let jsn = JSON.parse(str);
				let top = Stack[Stack.length - 1];
				let rig = {};
				let name = top.Name;
				for (key in top)
					rig[key] = top[key];
				for (key in jsn) {
					switch (key) {
						case 'Name':
							if (name.length > 0)
								rig[key] = name + '.' + jsn[key];
							else
								rig[key] = jsn[key];
							break;
						case 'Textures':
							Textures = jsn.Textures;
						default:
							rig[key] = jsn[key];
							break;
					}
				}
				Stack.push(rig);
				scandir();
			}

			function scandir() {
				fs.readdir(path, function (err, files) {
					if (err) {
						log.e(' ** ERR:Project file err:' + err);
						func(err);
						return;
					}
					async.eachSeries(files, scan, fini);

					function fini(err) {
						Stack.pop();
						func();
					}
				});
			}

			function scan(file, funq) {
				let sub;
				if (dir.length > 0)
					sub = dir + '/' + file;
				else
					sub = file;
				let path = Models + '/' + sub;
				fs.stat(path, function (err, stats) {
					if (stats == null) {
						log.e(' ** ERR:', lev, sub, 'does not exist');
						funq('Nada');
						return;
					}
					let old = Stack[Stack.length - 1];
					if (stats.isDirectory()) {
						Name = file;
						var rig = {};
						for (key in old) {
							rig[key] = old[key];
						}
						trav(sub, lev+1, funq);
					} else {
						if(file === 'schema.json') {
							type = 'json';
						} else {
							let parts = file.split('.');
							let nparts = parts.length;
							var type;
							if (nparts > 1) {
								switch (parts[nparts - 1]) {
									case '3ds':
										type = '3ds';
										break;
									case 'obj':
										type = 'Obj';
										break;
									case 'lwo':
										type = 'Lwo';
										break;
								}
							}
						}
						// If type set, then file is viable model format
						if (type != null) {
							let par = {};
							par.Entity = 'xGraph:Scene/Cvt' + type;
							par.Rig = {};
							var rig = Stack[Stack.length - 1];
							for (key in rig)
								par.Rig[key] = rig[key];
							par.Path = Models + '/' + sub;
							let name = old['Name'] + '.' + Name;
							if (name in ModelIndex) {
								funq();
								return;
							}
							par.Name = name;
							for (key in old) {
								switch (key) {
									case 'Name':
										par[key] = name;
										break;
									default:
										par[key] = old[key];
										break;
								}
							}
							Pars.push(par);
						}
						funq();
					}
				});
			}
		}

		//-------------------------------------------------generate
		function generate() {
			log.v('..generate');
			async.eachSeries(Pars, check, pau);

			function pau(err) {
				if(fun)
					fun(err);
			}

			function check(par, func) {
				let probe = Stash + '/' + par.Name + '.zip';
				if (fs.existsSync(probe)) {
					func();
				} else {
					genx3d(par, func);
				}
			}

			function genx3d(par, func) {
				let Textures;
				let Alias;
				let path = par.Path;
				let nclip = path.lastIndexOf('/');
				let dir = path.substr(0, nclip);
				let file = path.substr(nclip + 1);
				let parts = file.split('.');
				let suffix = parts[[parts.length - 1]].toLowerCase();
				if (suffix in Par.Cvt) {
					let q = {};
					q.Cmd = 'Convert';
					q.Path = path;
					q.Name = par.Name;
					that.send(q, Par.Cvt[suffix], rigger);
				} else {
					var err = 'Unknown model type <' + suffix + '>';
					log.e(' ** ERR:' + err);
					func(err);
				}

				//.........................................rigger
				// Apply scaling, orientation and animation
				function rigger(err, q) {
					if (err) {
						log.e(' ** ERR:' + err);
						func(err);
						return;
					}
					let Scale;
					let Process;
					let rig = par.Rig;
					if (err) {
						log.e(' ** ERR:' + err);
						func(err);
						return;
					}
					if (!('X3D' in q)) {
						log.e(' ** ERR:No model returned for', q.Name);
						func();
						return;
					}
					let x3d = q.X3D;
					log.v(JSON.stringify(x3d, null, 2));
					if ('Units' in rig) {
						Scale = null;
						let units = rig.Units;
						switch (units) {
							case 'Inch':
								Scale = 0.0254;
								break;
							case 'Cm':
								Scale = 0.01;
								break;
							case 'Mm':
								Scale = 0.001;
								break;
							default:
								break;
						}
						if (Scale === null) {
							log.e(' ** ERR:Invalid units <' + units + '>');
							funz(err);
							return;
						} else {
							Process = scale;
							traverse();
						}
					}
					if('Scale' in rig) {
						Scale = rig.Scale;
						Process = scale;
						traverse();
					}
					if('Marlin' in rig && rig.Marlin == true) {
						Process = marlin;
						traverse();
					}
					if('Textures' in rig) {
						Textures = rig.Textures;
					}
					if('Alias' in rig) {
						log.v('--- Alias ---');
						Alias = rig.Alias;
						Process = alias;
						traverse();
						if('Textures' in x3d) {
							let obj = x3d.Textures;
							log.v(JSON.stringify(x3d.Textures, null, 2));
							if(Array.isArray(obj)) {
								for(let itxt=0; itxt<obj.length; itxt++) {
									let text = obj[itxt];
									if(text in Alias)
										obj[itxt] = Alias[text];
								}
							} else {
								let keys = Object.keys(obj);
								for(let ikey=0; ikey<keys.length; ikey++) {
									let key = keys[ikey];
									if(key in Alias) {
										delete obj[key];
										obj[Alias.key] = {};
									}
								}
							}
							log.v(JSON.stringify(x3d.Textures, null, 2));
						}
					}

					//	if ('Scale' in rig) {
					//		Scale = rig.Scale;
					//		Process = scale;
					//		traverse();
					//	}
					if ('FlipYZ' in rig && rig.FlipYZ == true) {
						Process = flipyz;
						traverse();
					}
					if('Ground' in rig && rig.Ground == true)
						ground(1);
					if ('Base' in rig && rig.Base == true)
						ground(2);
					textures(par, x3d);

					//.....................................scale
					// Scale model
					function scale(comp, arr) {
						switch (comp) {
							case 'Pivot':
							case 'Vertex':
								for (let i = 0; i < arr.length; i++)
									arr[i] *= Scale;
								break;
						}
					}

					//.....................................flipyz
					// Reverse y and z coordinates with
					// handedness correction
					function flipyz(comp, arr) {
						let tmp;
						switch (comp) {
							case 'Pivot':
								tmp = arr[2];
								arr[2] = arr[1];
								arr[1] = -tmp;
								break;
							case 'Vertex':
							case 'Normal':
								for (let i = 0; i < arr.length; i+=3) {
									tmp = arr[i + 2];
									arr[i + 2] = arr[i + 1];
									arr[i + 1] = -tmp;
								}
								break;
						}
					}

					//.....................................marlin
					function marlin(comp, arr) {
						log.v('comp', comp);
						switch(comp) {
							case 'Diffuse':
								log.v('Diffuse', arr);
								arr[0] = 255;
								arr[1] = 255;
								arr[2] = 255;
								break;
						}
					}

					//.....................................ground
					// Shift model so lowest z is 0.0
					// mode=1 - Shift model z=0
					// mode=2 - Same as 1 but center xy
					function ground(mode) {
						let xyz = [100000.0, -100000.0, 100000.0,
							-100000.0, 100000.0, -100000.0];
						Process = range;
						traverse();
						let cntr = [0, 0, 0];
						for (let i = 0; i < 3; i++)
							cntr[i] = 0.5 * (xyz[2 * i] + xyz[2 * i + 1]);
						Process = shift;
						traverse();

						function range(comp, arr) {
							if(comp == 'Vertex') {
								let nvrt = arr.length;
								let iarr;
								let ixyz;
								for (let ivrt = 0; ivrt < nvrt; ivrt += 3) {
									for (let i = 0; i < 3; i++) {
										iarr = 3 * ivrt + i;
										ixyz = 2 * i;
										if (arr[iarr] < xyz[ixyz])
											xyz[ixyz] = arr[iarr];
										if (arr[iarr] > xyz[ixyz + 1])
											xyz[ixyz + 1] = arr[iarr];
									}
								}
							}
						}

						function shift(comp, arr) {
							let zmin = 10000.0;
							if (comp == 'Vertex') {
								switch (mode) {
									case 1: // Make base level with ground
										for (var i = 2; i < arr.length; i += 3)
											arr[i] -= xyz[4];
										break;
									case 2: // Center as well as mode 1
										var n = arr.length;
										for (var i = 0; i < n; i += 3) {
											arr[i] -= cntr[0];
											arr[i+1] -= cntr[1];
											arr[i+2] -= xyz[4];
										}
										break;
								}
							}
						}
					}

					//.....................................alias
					// Replaces texture files with different ones
					function alias(comp, part) {
						if(comp == 'Part') {
							if('Texture' in part) {
								if(part.Texture in Alias) {
									log.v(part.Texture, '<=', Alias[part.Texture]);
									part.Texture = Alias[part.Texture];
								}
							}
						}
					}

					function traverse() {
						let arr = x3d.Root;
						for (let i = 0; i < arr.length; i++)
							trv(arr[i], 0);

						function trv(obj, lev) {
							if ('Pivot' in obj)
								Process('Pivot', obj.Pivot);
							if ('Parts' in obj) {
								var arr = obj.Parts;
								for (var i = 0; i < arr.length; i++) {
									let part = arr[i];
									Process('Part', part);
									if ('Vrt' in part)
										Process('Vertex', part.Vrt);
									if ('Nrm' in part)
										Process('Normal', part.Nrm);
									if('Diffuse' in part)
										Process('Diffuse', part.Diffuse);
								/*	if('Texture' in part) {
										if(!('Textures' in par))
											par.Textures = [];
										if(par.Textures.indexOf(part.Texture) < 0)
											par.Textures.push(part.Texture);
									} */
								}
							}
							if ('Nodes' in obj) {
								var arr = obj.Nodes;
								for (var i = 0; i < arr.length; i++)
									trv(arr[i], lev + 1);
							}
						}
					}

				}

				//.........................................textures
				// Load textures from filenames stored by
				// conversion loaders (CvtXXX)
				function textures(par, x3d) {
					let zip = new jszip();
					zip.file('Type', 'X3D');
					zip.file('X3D', JSON.stringify(x3d));
					if('Textures' in x3d) {
						log.v(JSON.stringify(x3d, null, 2));
						log.v(JSON.stringify(x3d.Textures, null, 2));
						async.eachSeries(x3d.Textures, function(file, func) {
							let path;
							var file;
							log.v('Alias', Alias);
							if(Alias && file in Alias) {
								text = Alias[file];
							} else {
								text = file;
							}
							log.v('Textures:', Textures);
							log.v('text', text);
							if(Textures) {
								path = Models + '/' + Textures + '/' + text;
							} else {
								let slash = par.Path.lastIndexOf('/');
								let base = par.Path.substr(0, slash+1);
								path = base + text;
							}
							log.v('Texture path:' + path);
							fs.readFile(path, function(err, data) {
								if (err) {
									log.e(' ** ERR:' + err);
									func();
									return;
								}
								zip.file(text, data);
								func();
							});
						}, save);
					} else {
						save();
					}

					function save() {
						if(err) {
							log.e(' ** ERR:' + err);
							func(err);
							return;
						}
						let path = Stash + '/' + par.Name + '.zip';
						zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
							.pipe(fs.createWriteStream(path))
							.on('finish', function () {
								func();
							});
					}
				}

			}
		}
	}

})();
