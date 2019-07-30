//# sourceURL=Globe
(function Globe() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup,
		Start,
		Generate
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Globe/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log('--Globe/Start');
		//	await Earth2D('')
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Convert
	function Generate(com, fun) {
		console.log('--Globe/Generate');
		let Par = this.Par;
		let degree = 4;
		if ('Degree' in Par)
			degree = Par.Degree;
		let r = 6371.0;
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
		let x3d = {};
		x3d.Name = 'Earth2D';
		x3d.Textures = [];
		x3d.Textures.push(Par.Texture);
		let node = {};
		node.Name = 'Nada';
		node.Pivot = [0, 0, 0];
		node.Parts = [];
		let part = {};
		part.Vrt = vrt;
		part.Nrm = nrm;
		part.UV = uv;
		part.Idx = idx;
		part.Diffuse = [204,204,204];
		part.Diffuse = [128, 128, 128];
		part.Diffuse = [140, 140, 140];
		part.Ambient = [96,96,96];
		part.Specular = [96,96,96];
		part.Specular = [0,0,0];
		part.Texture = Par.Texture;
		node.Parts.push(part);
		x3d.Root = [];
		x3d.Root.push(node);
		console.log('x3d', JSON.stringify(x3d, null, 2));
		com.X3D = x3d;
		if(fun)
			fun(null, com);


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
				uv.push(v-1);
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
	}

})();
