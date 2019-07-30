//# sourceURL=Test
(function Test() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Setup,
		Start
	};

	return {
		dispatch: dispatch
	};

	//-----------------------------------------------------Setup
	function Setup(com, fun) {
		console.log('--Test/Setop');
		if(fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async function Start(com, fun) {
		console.log('--Test/Start');
		let iter = 0;
		let plo = 10;
		let phi = 20;
		let pd = 5;
		let np = (phi - plo)/pd + 1;
		let bat = 320;
		let dbat = 40;
		let nbat = bat/dbat + 1;
		let nv = dbat * np;
		let load = 50;
		let v1 = [];
		v1.length = np * nbat;
		let v2 = [];
		v2.length = nv;
		for(let i=0; i<nv; i++) {
			v2[i] = 0;
		}
		let sum = 0;
		for(thr=0; thr<24.5; thr+=1) {
			sum += cost(thr);
		}
		console.log('sum', sum);
		if(fun) {
			fun(null, com);
		}

		function cost(thr) {
			p = 0.5*(plo + phi) + 0.5*(phi - plo)*Math.sin(2.0*Math.PI*thr/24);
			console.log(p);
			return p*load;
		}

		function cycle() {
			for(let i=0; i<nv; i++)
				v1[i] = v2[i];
		}
	}

})();
