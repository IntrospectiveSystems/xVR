// #sourcsURL='Remote'
class Remote {

	'Idle.LeftMouseDown.Artifact'(com, fun) { com.Cmd = "Select1"; this.dispatch(com, fun); }
	'Select1.Move'(com, fun) { com.Cmd = "Move"; this.dispatch(com, fun); }
	'Select1.Wheel'(com, fun) { com.Cmd = "Spin"; this.dispatch(com, fun); }
	'Select1.LeftMouseUp'(com, fun) { com.Cmd = "Select2"; this.dispatch(com, fun); }
	'Select2.Move'(com, fun) { com.Cmd = "Move"; this.dispatch(com, fun); }
	'Select2.Wheel'(com, fun) { com.Cmd = "Spin"; this.dispatch(com, fun); }
	'Select2.LeftMouseUp'(com, fun) { com.Cmd = "Plant"; this.dispatch(com, fun); }
	'Idle.RightMouseDown.Artifact'(com, fun) { com.Cmd = "Select3"; this.dispatch(com, fun); }
	'Select3.RightMouseUp'(com, fun) { com.Cmd = "RightUp"; this.dispatch(com, fun); }
	'Select3.Move'(com, fun) { com.Cmd = "MoveLink"; this.dispatch(com, fun); }


	Start(com, fun) {
		log.v('--EveRemote/Start');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let q = {};
		q.Cmd = 'Subscribe';
		q.Pid = Par.Pid;
		q.Commands = [];
		q.Commands.push('Idle.LeftMouseDown.Artifact');
		q.Commands.push('Select1.Move');
		q.Commands.push('Select1.Wheel');
		q.Commands.push('Select1.LeftMouseUp');
		q.Commands.push('Select2.Move');
		q.Commands.push('Select2.Wheel');
		q.Commands.push('Select2.LeftMouseUp');
		q.Commands.push('Idle.RightMouseDown.Artifact');
		q.Commands.push('Select3.Move');
		q.Commands.push('Select3.RightMouseUp');

		this.send(q, Par.View, function (err, r) {
			if ('View' in r)
				Vlt.View = r.View;
			return;
		});
		if (fun)
			fun(null, com);
	}

	Select1(com, fun) {
		log.v('--TranslateStart');
		let Vlt = this.Vlt;
		let Event = com.Event;
		if (!('Hits' in Event)) {
			log.e('No Hits in Event');
			if (fun)
				fun('No Hits in Event', com);
			return;
		}
		let hit = Event.Hits['Artifact'];
		Vlt.pidSelect = hit.Pid || hit.id;
		Vlt.SelectUnit = hit.Name || hit.name;
		com.State = 'Select1';
		if (fun)
			fun(null, com);
	}

	Select2(com, fun) {
		com.State = 'Select2';
		if (fun)
			fun(null, com);
	}

	Select3(com, fun) {
		let Vlt = this.Vlt;
		let Event = com.Event;
		if (!('Hits' in Event)) {
			log.e('No Hits in Event');
			if (fun)
				fun('No Hits in Event', com);
			return;
		}
		let hit = Event.Hits['Artifact'];
		Vlt.pidSelect = hit.Pid || hit.id;
		Vlt.SelectUnit = hit.Name || hit.name;
		com.State = 'Select3';
		if (fun) {
			fun(null, com);
		}
	}

	Move(com, fun) {
		log.v('--Move');
		let Vlt = this.Vlt;
		let Par = this.Par;
		let Event = com.Event;
		if (!('Hits' in Event)) {
			if (fun)
				fun(null, com);
			return;
		}
		if (!('Terrain' in Event.Hits)) {
			if (fun)
				fun(null, com);
			return;
		}
		let hit = Event.Hits.Terrain;
		let q = {};
		q.Cmd = 'MoveUnit';
		q.Name = Vlt.SelectUnit;
		q.Instance = Vlt.pidSelect;
		let loc = [];
		loc.push(hit.X);
		loc.push(hit.Y);
		loc.push(hit.Z);
		q.Position = loc;
		this.send(q, Par.Controller);
		if (fun)
			fun(null, com);
	}

	MoveLink(com, fun) {
		let Vlt = this.Vlt;
		let Par = this.Par;
		let Event = com.Event;
		if (!('Hits' in Event)) {
			if (fun)
				fun(null, com);
			return;
		}
		if (!('Terrain' in Event.Hits)) {
			if (fun)
				fun(null, com);
			return;
		}
		let hit = Event.Hits.Terrain;
		let q = {};
		q.Cmd = 'ActiveLink';
		if ('Mouse' in Event) {
			q.x = hit.X,
				q.y = hit.Y
		}
		q.From = Vlt.SelectUnit;
		this.send(q, Par.Controller);

		if (fun) {
			fun(null, com);
		}
	}

	Spin(com, fun) {
		let Vlt = this.Vlt;
		let Par = this.Par;
		let Event = com.Event;
		if ('Factor' in Event) {
			let q = {};
			q.Cmd = 'SpinUnit';
			q.Instance = Vlt.pidSelect;
			q.Spin = 6.0 * Event.Factor;
			q.Name = Vlt.SelectUnit;
			this.send(q, Par.Controller);
		}
		if (fun)
			fun(null, com);
	}

	Plant(com, fun) {
		log.v('--TranslateStop');
		com.State = 'Idle';
		if (fun)
			fun(null, com);
	}

	RightUp(com, fun) {
		let Vlt = this.Vlt;
		let Par = this.Par;

		com.State = 'Idle';
		let Event = com.Event;
		if ('Hits' in Event) {
			if ('Artifact' in Event.Hits) {
				let Hit = Event.Hits['Artifact'];
				if ((Vlt.SelectUnit == Hit.name) || (Vlt.SelectUnit == Hit.Name)) {
					let q = {}
					if ("responseHandler" in Hit) {
						q.Cmd = Hit.responseHandler.Cmd;
						q.mouse = com.Event.Mouse;
						q.id = Hit.name;
						this.send(q, Hit.responseHandler.Handler);
					} else {
						q.Cmd = 'Evoke';
						q.Name = Vlt.SelectUnit;
						if (Vlt.pidSelect) {
							q.Instance = Vlt.pidSelect;
						}
						this.send(q, Par.Controller);
					}
				} else {
					let q = {};
					q.Cmd = 'AddLink';
					q.From = Vlt.SelectUnit;
					q.To = Hit.Name;
					if (Vlt.pidSelect) {
						q.Instance = Vlt.pidSelect;
					}
					this.send(q, Par.Controller);
				}
			} else {
				let q = {};
				q.Cmd = 'ActiveLink';
				q.DeleteActiveLink = true;
				this.send(q, Par.Controller);
			}
		} else {
			log.w('No Hits in Event');
			if (fun)
				fun('No Hits in Event', com);
			return;
		}

		if (fun) {
			fun(null, com);
		}
	}
}
