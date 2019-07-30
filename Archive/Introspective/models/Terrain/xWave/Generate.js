//# sourceURL=Generate
(function Generate() {

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
		console.log("--Generate/Setup");
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		console.log("--Generate/Start");
	//	await Earth2D('')
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Convert
	function Generate(com, fun) {
		console.log('--Generate/Generate');
		let Par = this.Par;
		log.i('..Generate');
		var w = 360;
		var h = 180;
		var vrt = [];
		vrt.push(-w/2, -h/2, 0);
		vrt.push( w/2, -h/2, 0);
		vrt.push( w/2,  h/2, 0);
		vrt.push(-w/2,  h/2, 0);
		var nrm = [];
		nrm.push(0, 0, 1);
		nrm.push(0, 0, 1);
		nrm.push(0, 0, 1);
		nrm.push(0, 0, 1);
		var uv = [];
		uv.push(0, 0);
		uv.push(1, 0);
		uv.push(1, 1);
		uv.push(0, 1);
		var idx = [];
		idx.push(0, 1, 2);
		idx.push(0, 2, 3);

		var x3d = {};
		x3d.Name = 'xWave';
		x3d.Textures = [];
		x3d.Textures.push(Par.Texture);
		var node = {};
		node.Name = "Nada";
		node.Pivot = [0, 0, 0];
		node.Parts = [];
		var part = {};
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
	}

})();
