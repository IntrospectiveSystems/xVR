// #sourcsURL='NavSphere'
(function NavSphere() {

	//-----------------------------------------------------dispatch
	let dispatch = {
		Start: Start,
		'Idle.LeftMouseDown.Terrain': Probe,
		'Idle.RightMouseDown.Terrain': RotateStart,
		'Rotate.Move': Rotate,
		'Rotate.RightMouseUp': RotateStop,
		'Rotate.MouseLeave': RotateStop,
		'Idle.Wheel': Zoom
	};

	return {
		dispatch: dispatch
	};

	function Start(com, fun) {
		log.i('--NavSphere/Start');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let q = {};
		q.Cmd = 'Subscribe';
		q.Pid = Par.Pid;
		q.Commands = [];
		q.Commands.push('Idle.Wheel');
		q.Commands.push('Idle.LeftMouseDown.Terrain');
		q.Commands.push('Translate.Move');
		q.Commands.push('Translate.LeftMouseUp');
		q.Commands.push('Translate.MouseLeave');
		q.Commands.push('Idle.RightMouseDown.Terrain');
		q.Commands.push('Rotate.Move');
		q.Commands.push('Rotate.RightMouseUp');
		q.Commands.push('Rotate.MouseLeave');
		this.send(q, Par.View, function(err, r) {
			if('View' in r)
				Vlt.View = r.View;
			return;
		});
		if(fun)
			fun(null, com);
	}

	function Zoom(com, fun) {
		console.log('--Zoom');
		let Vlt = this.Vlt;
		let View = Vlt.View;
		let Event = com.Event;
		if(!('Factor' in Event)) {
			log.e('No factor in Zoom event');
			if(fun) {
				fun('No factor in Event', com);
			}
			return;
		}
		let v = new THREE.Vector3();
		v.fromArray(View.Camera.position.toArray());
		let vfoc = new THREE.Vector3();
		vfoc.fromArray(View.Focus.toArray());
		v.sub(vfoc);
		let fac;
		if (Event.Factor > 0)
			fac = 0.95 * Event.Factor;
		else
			fac = -1.05 * Event.Factor;
		v.multiplyScalar(fac);
		let vcam = vfoc.clone();
		vcam.add(v);
		View.Camera.position.fromArray(vcam.toArray());
		View.Camera.lookAt(View.Focus);
		View.Camera.updateProjectionMatrix();
		console.log('Camera', View.Camera.position.length());
		if(fun)
			fun(null, com);
	}

	function Probe(com, fun) {
		console.log('..Probe', JSON.stringify(com, null, 2));
		let Par = this.Par;
		if('Terrain' in com.Event.Hits) {
			let hit = com.Event.Hits.Terrain;
			let x = hit.X;
			let y = hit.Y;
			let z = hit.Z;
			let r = Math.sqrt(x * x + y * y + z * z);
			let lat = 180.0 * Math.asin(z / r) / Math.PI;
			let lon = 180.0 * Math.atan2(y, x) / Math.PI;
			if ('LonCor' in Par) {
				lon += Par.LonCor;
				if (lon > 180)
					lon -= 360;
				if (lon < -180)
					lon += 360;
			}
			console.log('x, y, z, r, lat, lon', x, y, z, ':', r, lat, lon);
		} else {
			console.log(' ** No runs, no hits, no errors **');
		}
		/*		var x = info.Point.x;
		var y = info.Point.y;
		var z = info.Point.z;
		var r = Math.sqrt(x * x + y * y + z * z);
		var lat = 180.0 * Math.asin(z / r) / Math.PI;
		var lon = 180.0 * Math.atan2(y, x) / Math.PI;
		if ('LonCor' in __Config) {
			lon += __Config.LonCor;
			if (lon > 180)
				lon -= 360;
			if (lon < -180)
				lon += 360;
		}
		console.log('r, lat, lon', r, lat, lon); */
		if(fun)
			fun(null, com);
	}

	function RotateStart(com, fun) {
		console.log('--RotateStart');
		let Vlt = this.Vlt;
		let Event = com.Event;
		if(!('Mouse' in Event)) {
			log.e('No Mouse in Event');
			if(fun)
				fun('No Mouse in Event', com);
			return;
		}
		Vlt.xMouse = Event.Mouse.x;
		Vlt.yMouse = Event.Mouse.y;
		com.State = 'Rotate';
		if(fun)
			fun(null, com);
	}

	function Rotate(com, fun) {
		console.log('--Rotate');
		let Vlt = this.Vlt;
		let Event = com.Event;
		let View = Vlt.View;

		if(!('Mouse' in Event)) {
			log.e('No Mouse in Event');
			if(fun)
				fun('No Mouse in Event', com);
			return;
		}
		let x = Event.Mouse.x;
		let y = Event.Mouse.y;
		let vcam = new THREE.Vector3();
		vcam.fromArray(View.Camera.position.toArray());
		let vfoc = new THREE.Vector3();
		vfoc.fromArray(View.Focus.toArray());
		let v1 = new THREE.Vector3(0.0, 0.0, 1.0);
		let v2 = vcam.clone();
		v2.sub(vfoc);
		let v3 = new THREE.Vector3();
		v3.crossVectors(v1, v2);
		v3.normalize();
		let ang = 0.003 * (Vlt.xMouse - x);
		v2.applyAxisAngle(v1, ang);
		ang = 0.003 * (Vlt.yMouse - y);
		v2.applyAxisAngle(v3, ang);
		vcam.copy(vfoc);
		vcam.add(v2);
		View.Camera.position.fromArray(vcam.toArray());
		View.Camera.lookAt(View.Focus);
		Vlt.xMouse = x;
		Vlt.yMouse = y;

		if(fun)
			fun(null, com);
	}

	function RotateStop(com, fun) {
		console.log('--RotateeStop');
		com.State = 'Idle';
		if(fun)
			fun(null, com);
	}

})();
