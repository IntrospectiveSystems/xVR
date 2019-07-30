class NavTerrain {

	'Idle.LeftMouseDown.Terrain'(com, fun) {com.Cmd = "TranslateStart"; this.dispatch(com,fun);}
	'Translate.Move'(com, fun) {com.Cmd = "Translate"; this.dispatch(com,fun);}
	'Translate.LeftMouseUp'(com, fun) {com.Cmd = "TranslateStop"; this.dispatch(com,fun);} 
	'Translate.MouseLeave'(com, fun) {com.Cmd = "TranslateStop"; this.dispatch(com,fun);} 
	'Idle.RightMouseDown.Terrain'(com, fun) {com.Cmd = "RotateStart"; this.dispatch(com,fun);} 
	'Rotate.Move'(com, fun) {com.Cmd = "Rotate"; this.dispatch(com,fun);} 
	'Rotate.RightMouseUp'(com, fun) {com.Cmd = "RotateStop"; this.dispatch(com,fun);} 
	'Rotate.MouseLeave'(com, fun) {com.Cmd = "RotateStop"; this.dispatch(com,fun);} 
	'Idle.Wheel'(com, fun) {com.Cmd = "Zoom"; this.dispatch(com,fun);} 

	Start(com, fun) {
		log.i('--NavTerrain/Start');
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
		this.send(q, Par.View, function (err, r) {
			if ('View' in r)
				Vlt.View = r.View;
		});
		if (fun)
			fun(null, com);
	}

	Zoom(com, fun) {
		let Vlt = this.Vlt;
		let View = Vlt.View;
		let Event = com.Event;
		if (!('Factor' in Event)) {
			log.e('No factor in Zoom event');
			if (fun) {
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
		if (fun)
			fun(null, com);
	}

	TranslateStart(com, fun) {
		console.log('--TranslateStart');
		let Vlt = this.Vlt;
		let Event = com.Event;
		if (!('Mouse' in Event)) {
			log.e('No Mouse in Event');
			if (fun)
				fun('No Mouse in Event', com);
			return;
		}
		Vlt.xMouse = Event.Mouse.x;
		Vlt.yMouse = Event.Mouse.y;
		com.State = 'Translate';
		if (fun)
			fun(null, com);
	}

	Translate(com, fun) {
		console.log('--Translate');
		let Vlt = this.Vlt;
		let Event = com.Event;
		let View = Vlt.View;

		if (!('Mouse' in Event)) {
			log.e('No Mouse in Event');
			if (fun)
				fun('No Mouse in Event', com);
			return;
		}
		let x = Event.Mouse.x;
		let y = Event.Mouse.y;
		let vcam = new THREE.Vector3();
		vcam.fromArray(View.Camera.position.toArray());
		let vfoc = new THREE.Vector3();
		vfoc.fromArray(View.Focus.toArray());
		let disfac = vfoc.distanceTo(vcam) / 200.0;
		let v1 = new THREE.Vector3(0.0, 0.0, 1.0);
		let v2 = vcam.clone();
		v2.sub(vfoc);
		v2.normalize();
		let v3 = new THREE.Vector3();
		v3.crossVectors(v1, v2);
		let v4 = new THREE.Vector3();
		v4.crossVectors(v1, v3);
		//			var fac = 0.5 * (mouse.x - info.Mouse.x);
		var fac = disfac * (Vlt.xMouse - x);
		v3.multiplyScalar(fac);
		vcam.add(v3);
		vfoc.add(v3);
		//			var fac = 1.0 * (mouse.y - info.Mouse.y);
		var fac = disfac * (Vlt.yMouse - y);
		v4.multiplyScalar(-fac);
		vcam.add(v4);
		vfoc.add(v4);
		View.Camera.position.fromArray(vcam.toArray());
		View.Focus.fromArray(vfoc.toArray());
		//	Grok3D.setCamera(vcam.toArray());
		//	Grok3D.setFocus(vfoc.toArray());
		Vlt.xMouse = x;
		Vlt.yMouse = y;

		if (fun)
			fun(null, com);
	}

	TranslateStop(com, fun) {
		console.log('--TranslateStop');
		com.State = 'Idle';
		if (fun)
			fun(null, com);
	}

	RotateStart(com, fun) {
		console.log('--RotateStart');
		let Vlt = this.Vlt;
		let Event = com.Event;
		if (!('Mouse' in Event)) {
			log.e('No Mouse in Event');
			if (fun)
				fun('No Mouse in Event', com);
			return;
		}
		Vlt.xMouse = Event.Mouse.x;
		Vlt.yMouse = Event.Mouse.y;
		com.State = 'Rotate';
		if (fun)
			fun(null, com);
	}

	Rotate(com, fun) {
		console.log('--Rotate');
		let Vlt = this.Vlt;
		let Event = com.Event;
		let View = Vlt.View;

		if (!('Mouse' in Event)) {
			log.e('No Mouse in Event');
			if (fun)
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

		if (fun)
			fun(null, com);
	}

	RotateStop(com, fun) {
		console.log('--RotateeStop');
		com.State = 'Idle';
		if (fun)
			fun(null, com);
	}

}