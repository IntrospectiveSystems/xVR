(function FlatLand() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		GetModel: GetModel
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------GetModel
	// Generate X3D represenation of Terrain
	function GetModel(com, fun) {
		console.log('--Globe/GetModel');
		let that = this;
		let Par = this.Par;
		let Ent = this.Ent;
		let degree = 0;
		if ('Degree' in Par)
			degree = Par.Degree;
		if ('Degree' in __Config)
			degree = __Config.Degree;
		let r = 6371.0;
		if ('Radius' in __Config)
			r = __Config.Radius;
		let Facets = [];
		let facet;
		for (var i = 0; i < 4; i++) {
			facet = {};
			facet.A = [0.0, i*90.0];
			facet.B = [0.0, (i+1)*90.0];
			facet.C = [90.0, 0.0];
			Facets.push(facet);
		}
		for (var i = 0; i < 4; i++) {
			facet = {};
			facet.A = [-90.0, 0.];
			facet.B = [0.0, (i + 1)*90.0];
			facet.C = [0.0, i * 90.0];
			Facets.push(facet);
		}
		let nfacet = Facets.length;
		for (var i = 0; i < nfacet; i++)
			fractal(Facets[i], degree);
		let vrt = [];
		let nrm = [];
		let uv = [];
		let idx = [];
		let btex = false;
		if ('Texture' in Par)
			btex = true;
		for (let ifacet = 0; ifacet < nfacet; ifacet++) {
			facet = Facets[ifacet];
			drawFacet(facet);
		}
		if ('Texture' in Par)
			loadTexture(generate);
		else
			generate();
		return;

		function interp(geo1, geo2) {
			let rlat;
			let rlon;
			rlat = Math.PI * geo1[0] / 180.0;
			rlon = Math.PI * geo1[1] / 180.0;
			let z1 =  Math.sin(rlat);
			var rxy = Math.cos(rlat);
			let x1 = rxy * Math.cos(rlon);
			let y1 = rxy * Math.sin(rlon);
			rlat = Math.PI * geo2[0] / 180.0;
			rlon = Math.PI * geo2[1] / 180.0;
			let z2 = Math.sin(rlat);
			var rxy = Math.cos(rlat);
			let x2 = rxy * Math.cos(rlon);
			let y2 = rxy * Math.sin(rlon);
			let x = (x1 + x2) / 2;
			let y = (y1 + y2) / 2;
			let z = (z1 + z2) / 2;
			let rl = Math.sqrt(x * x + y * y + z * z);
			x /= rl;
			y /= rl;
			z /= rl;
			let geo = [];
			geo.push(180.0 * Math.asin(z) / Math.PI);
			geo.push(180.0 * Math.atan2(y, x) / Math.PI);
			let lon = geo[1];
			if (geo[1] < 0.0)
				geo[1] += 360.0;
			return geo;
		}

		function fractal(facet, degree) {
			if (degree < 1)
				return;
			facet.Facet = [];
			let a = facet.A;
			let b = facet.B;
			let c = facet.C;
			let ab = interp(a, b);
			let bc = interp(b, c);
			let ca = interp(c, a);
			var fact;
			var fact = {};
			fact.A = a;
			fact.B = ab;
			fact.C = ca;
			facet.Facet.push(fact);
			fractal(fact, degree - 1);
			var fact = {};
			fact.A = b;
			fact.B = bc;
			fact.C = ab;
			facet.Facet.push(fact);
			fractal(fact, degree - 1);
			var fact = {};
			fact.A = c;
			fact.B = ca;
			fact.C = bc;
			facet.Facet.push(fact);
			fractal(fact, degree - 1);
			var fact = {};
			fact.A = ab;
			fact.B = bc;
			fact.C = ca;
			facet.Facet.push(fact);
			fractal(fact, degree - 1);
		}

		function vertex(latlon) {
			let lat = latlon[0];
			let lon = latlon[1];
			if (lon < 0.0 || lon > 360)
				console.log('A bad lon', lon);
			rlat = Math.PI * lat / 180.0;
			rlon = Math.PI * lon / 180.0;
			let z = r * Math.sin(rlat);
			let rxy = r * Math.cos(rlat);
			let x = rxy * Math.cos(rlon);
			let y = rxy * Math.sin(rlon);
			vrt.push(x);
			vrt.push(y);
			vrt.push(z);
			nrm.push(x / r);
			nrm.push(y / r);
			nrm.push(z / r);
			if (btex) {
				let v = (lat + 90.0) / 180.0;
				let u = lon / 360.0;
				uv.push(u);
				uv.push(1-v);
			}
		}

		function drawFacet(facet) {
			if ('Facet' in facet) {
				for (let ifac = 0; ifac < 4; ifac++)
					drawFacet(facet.Facet[ifac]);
				return;
			}
			// Leaf facet, draw it
			let ivrt = vrt.length / 3;
			vertex(facet.A);
			vertex(facet.B);
			vertex(facet.C);
			idx.push(ivrt, ivrt + 1, ivrt + 2);
		}

		function generate(tex) {
			let x3d = {};
			x3d.Name = 'Globe';
			x3d.Root = [];
			let node = {};
			node.Name = 'Earth';
			node.Hier = -1;
			node.Pivot = [0,0,0];
			let parts = [];
			let part = {};
			part.Diffuse = [255, 255, 255];
			part.Vrt = vrt;
			part.Nrm = nrm;
			part.Idx = idx;
			if (tex != null) {
				part.UV = uv;
				let name = Par.Texture;
				x3d.Textures = {};
				x3d.Textures[name] = tex;
				part.Texture = name;
			}
			parts.push(part);
			node.Parts = parts;
			x3d.Root.push(node);
			let model = {};
			model.Type = 'X3D';
			model.X3D = x3d;
			com.Model = model;
			if (fun)
				fun();
		}

		function loadTexture(func) {
			let q = {};
			q.Cmd = 'GetTexture';
			let pidtxt = Par.Texture;
			that.send(q, pidtxt, pau);

			function pau() {
				if ('Texture' in q) {
					let txt = q.Texture;
					let keys = Object.keys(txt);
					for (i = 0; i < keys.length; i++) {
						let key = keys[i];
						switch (key) {
							case 'Img':
								console.log('  Img:' + txt['Img'].length);
								break;
							default:
								console.log('  ' + key + ':' + txt[key]);
								break;
						}
					}
					func(txt);
					return;
				}
				console.log(' ** ERR:No texture returned');
				func();
			}
		}
	}

})();
