//# sourceURL=MarcoPolo
class MarcoPolo {

	//-----------------------------------------------------Setup
	Setup(com, fun) {
		console.log('--MarcoPolo/Setup');
		this.Svc = {};
		if (fun)
			fun(null, com);
	}

	//-----------------------------------------------------Start
	async Start(com, fun) {
		log.i('--MarcoPolo/Start');
		let Par = this.Par;
		let Vlt = this.Vlt;
		let Svc = this.Svc;
		Vlt.Vel = 1.0;	// Meters / sec
		Vlt.Rate = 15;	// Frames / sec
		Vlt.Period = Math.floor(1000 / Vlt.Rate); // ms / frame
		Vlt.FPS = 1000 / Vlt.Period;	// Frames / sec
		Vlt.Step = Vlt.Vel / Vlt.FPS;	// Meters / frame
		Vlt.Count = 0;
		let that = this;
		log.i('Par', JSON.stringify(Par, null, 2));

		// Collect services
		if ('Services' in Par) {
			for (let is = 0; is < Par.Services.length; is++) {
				let pid = Par.Services[is];
				await service(pid);
			}
		}

		let q = {};
		q.Cmd = 'GetServices';
		this.sendLocal(q, Par.Agent, function (err, r) {
			Svc = r.Services;
			log.i('MarcoPolo/Svc', JSON.stringify(Object.keys(Svc)));
			switch (Par.Role) {
				case 'Marco':
					Svc.Subscribe('Polo', that, polo);
					Svc.Subscribe('Position', that, position);
					setInterval(function () {
						let q = {};
						q.Cmd = 'Marco';
						Svc.Dispatch(q);
						log.i('-----', Vlt.Count++);
						log.i('Marco -> Polo:Marco');
					}, 1000);
					//	Vlt.Period = 1000;
					setInterval(function () {
						if ('xPolo' in Vlt) {
							let q = {
								Cmd: 'GetUnitPosition',
								Target: 'Marco'
							};
							Svc.Dispatch(q, 'EVE');
						}
					}, Vlt.Period);
					break;
				case 'Polo':
					Svc.Subscribe('Marco', that, marco);
					Svc.Subscribe('Position', that, position);
					break;
			}
			if (fun) {
				fun(null, com);
			}
		});

		function marco(_cmd) {
			let q = {
				Cmd: 'GetUnitPosition',
				Target: 'Polo'
			};
			Svc.Dispatch(q, 'EVE');
		}

		function polo(cmd) {
			let Vlt = this.Vlt;
			Vlt.xPolo = cmd.X;
			Vlt.yPolo = cmd.Y;
		}

		function position(cmd) {
			let Vlt = this.Vlt;
			let Par = this.Par;
			let pos = cmd.Position;
			switch (Par.Role) {
				case 'Marco': {
					let x1 = pos[0];
					let y1 = pos[1];
					let x2 = Vlt.xPolo;
					let y2 = Vlt.yPolo;
					let xd = x2 - x1;
					let yd = y2 - y1;
					let r = Math.sqrt(xd * xd + yd * yd);
					let rm = r - 0.5;
					let s = Vlt.Step;
					if (s > rm)
						s = rm;
					if (s < 0)
						s = 0;
					let b = s / r;
					let a = 1 - b;
					let loc = [a * x1 + b * x2, a * y1 + b * y2, 0];
					let w = {
						Cmd: 'SetUnitPosition',
						Target: 'Marco',
						Position: loc
					};
					Svc.Dispatch(w, 'EVE');
					break;
				}
				case 'Polo':{
					let x = pos[0].toFixed(2);
					let y = pos[1].toFixed(2);
					log.i('Polo => Marco:Polo (' + x + ', ' + y + ')');
					let q = {
						Cmd: 'Polo',
						X: pos[0],
						Y: pos[1]
					};
					Svc.Dispatch(q);
					break;
				}
			}
		}

		async function service(pid) {
			log.i('service');
			return new Promise((resolve, _reject) => {
				let q = {};
				q.Cmd = 'GetServices';
				that.sendLocal(q, pid, async function (err, r) {
					log.i('r', JSON.stringify(r));
					if ('Services' in r) {
						for (let key in r.Services) {
							Svc[key] = r.Services[key];
						}
					}
					resolve();
				});
			});
		}
	}
}
