if ('WebSocket' in window) {
	(function () {
		var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
		var address = protocol + window.location.host + window.location.pathname + '/ws';
		var socket = new WebSocket(address);
		socket.onmessage = function (content) {
			try {
				let message = JSON.parse(content);
				if (message.cmd == "reload") {
					window.location.reload(true);
				}
				else if(message.cmd == "update_css"){

				}
				else if(message.cmd == "update_component"){
					
				}
			}
			catch (e) { }
		};
	})();
}