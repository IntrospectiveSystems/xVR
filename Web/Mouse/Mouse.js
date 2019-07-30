//# sourceURL=Mouse

/**
 * The Mouse entity is the Apex and only entity of the Mouse Module.

 * The main capability of this entity is to add a mouse (&keydown) listener to the canvas that is provided
 * when the SetDomElement command is called. Currently MouseEnter, MouseLeave, Wheel, LeftMouseDown, 
 * RightMouseDown, LeftMouseUp, RightMouseUp, and KeyDown events are captured.
 */
class Mouse {

	/**
	 * The only received command of the mouse module. SetDomElement provides the canvas (domElement) to 
	 * the mouse module. On this element it appends its event listeners.
	 * @param {Object} com 
	 * @param {Object} com.DomElement  	the canvas that the listeners should be appended to
	 * @param {Function=} fun 
	 */
	SetDomElement(com, fun = _ => log.e(_)) {
		log.v('--Mouse/SetDomElement');
		let Vlt = this.Vlt;
		if (!com.DomElement) {
			fun("No DOM Element provided in com (com.DomElement)", com);
			return;
		}

		let domElement = this.Vlt.domElement = ("length" in com.DomElement) ? com.DomElement : $(com.DomElement);

		//needed these to get the focus to work for keydown events
		domElement.parent().attr('tabindex', 0);
		domElement.parent().focus();


		//stop the popup context menu unless shift is held
		domElement.on('contextmenu', (evt) => {
			if (!evt.shiftKey) {
				evt.preventDefault();
			}
		});

		domElement.on("mouseenter", (evt) => {
			let info = {};
			info.Action = 'MouseEnter';
			info.InPanel = true;
			info.Mouse = {};
			info.Mouse.x = evt.clientX;
			info.Mouse.y = evt.clientY;
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		domElement.on("mouseleave", (evt) => {
			let info = {};
			info.InPanel = false;
			info.Action = 'MouseLeave';
			info.Mouse = {};
			info.Mouse.x = evt.clientX;
			info.Mouse.y = evt.clientY;
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		domElement.on("wheel", (evt) => {
			log.v("Handler ", this.Par.Handler.substr(30));
			let info = {};
			info.Mouse = {};
			info.Mouse.x = evt.clientX;
			info.Mouse.y = evt.clientY;
			evt = evt.originalEvent;
			let fac = (evt.detail < 0 || evt.wheelDelta > 0) ? 1 : -1;
			info.Action = 'Wheel';
			info.Factor = fac;
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		domElement.on("mousedown", (evt) => {
			log.v("Handler ", this.Par.Handler.substr(30));
			let info = {};
			info.Mouse = {};
			info.Mouse.x = evt.clientX;
			info.Mouse.y = evt.clientY;
			switch (evt.which) {
				case 1:	// Left mouse
					info.Action = 'LeftMouseDown';
					break;
				case 3: // Right mouse
					info.Action = 'RightMouseDown';
					break;
				default:
					log.v(`mousedown : ${evt.which}`);
					return;
			}
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		domElement.on("mousemove", (evt) => {
			let info = {};
			info.Action = 'Move';
			info.Mouse = {};
			info.Mouse.x = evt.clientX;
			info.Mouse.y = evt.clientY;
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		domElement.on("mouseup", (evt) => {
			let info = {};
			info.Mouse = {};
			info.Mouse.x = evt.clientX;
			info.Mouse.y = evt.clientY;
			switch (evt.which) {
				case 1:	// Left mouse
					info.Action = 'LeftMouseUp';
					break;
				case 3: // Right mouse
					info.Action = 'RightMouseUp';
					break;
				default:
					log.v(`mousedown : ${evt.which}`);
					return;
			}
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		domElement.parent().on("keydown", (evt) => {
			let info = {};
			info.Action = 'KeyDown';
			info.CharKey = evt.key;
			this.send({ Cmd: "DispatchEvent", info: info }, this.Par.Handler);
			evt.preventDefault();
		});

		fun(null, com);
	}
}