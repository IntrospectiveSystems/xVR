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
		log.v('--Generate/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		log.v('--Generate/Start');
		//	await Earth2D('')
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Convert
	function Generate(com, fun) {
		log.v('--Generate/Generate');
		let Par = this.Par;
		log.v('..Generate');
		let w = 360;
		let vrt = [];
		vrt.push(-w/2, -w/4, 0);
		vrt.push( w/2, -w/4, 0);
		vrt.push( w/2,  w/4, 0);
		vrt.push(-w/2,  w/4, 0);
		let nrm = [];
		nrm.push(0, 0, 1);
		nrm.push(0, 0, 1);
		nrm.push(0, 0, 1);
		nrm.push(0, 0, 1);
		let uv = [];
		uv.push(0, 0);
		uv.push(1, 0);
		uv.push(1, 1);
		uv.push(0, 1);
		let idx = [];
		idx.push(0, 1, 2);
		idx.push(0, 2, 3);

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
		log.v('x3d', JSON.stringify(x3d, null, 2));
		com.X3D = x3d;
		if(fun)
			fun(null, com);
	}

})();
