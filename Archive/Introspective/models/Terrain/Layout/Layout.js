//# sourceURL=Maker
(function Maker() {

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
		log.v('--Layout/Setup');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	function Start(com, fun) {
		log.v('--Layout/Start');
		//	await Earth2D('')
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Convert
	function Generate(com, fun) {
		log.v('--Layout/Generate');
		let Par = this.Par;
		log.v('..Generate');
		let w = Par.Grid[0];
		let h = Par.Grid[1];
		let vrt = [];
		vrt.push(-w/2, -h/2, 0);
		vrt.push( w/2, -h/2, 0);
		vrt.push( w/2,  h/2, 0);
		vrt.push(-w/2,  h/2, 0);
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
		x3d.Name = 'Board';
		let node = {};
		node.Name = 'Nada';
		node.Pivot = [0, 0, 0];
		node.Parts = [];
		let part = {};
		part.Vrt = vrt;
		part.Nrm = nrm;
		part.UV = uv;
		part.Idx = idx;
		part.Diffuse = [160, 120, 90];
		part.Ambient = [96,96,96];
		part.Specular = [96,96,96];
		part.Specular = [0,0,0];
		node.Parts.push(part);
		x3d.Root = [];
		x3d.Root.push(node);
		log.v('x3d', JSON.stringify(x3d, null, 2));
		com.X3D = x3d;
		if(fun)
			fun(null, com);
	}

})();
