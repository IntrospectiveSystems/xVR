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
		let grid = Par.Grid[2];
		let vrt = [];
		for(let x=-w/2; x<w/2 + 0.01; x+=grid) {
			vrt.push(x, -h/2, 0);
			vrt.push(x,  h/2, 0);
		}
		for(let y=-h/2; y<h/2 + 0.01; y+=grid) {
			vrt.push(-w/2, y, 0);
			vrt.push( w/2, y, 0);
		}
		let x3d = {};
		x3d.Name = 'Grid';
		let node = {};
		node.Name = 'Nada';
		node.Pivot = [0,0,0];
		node.Parts = [];
		let part = {};
		part.Type = 'Lines';
		part.Vrt = vrt;
		part.Color = [0,0,0];
		node.Parts.push(part);
		x3d.Root = [];
		x3d.Root.push(node);
		log.v('x3d', JSON.stringify(x3d, null, 2));
		com.X3D = x3d;
		if(fun)
			fun(null, com);
	}

})();
