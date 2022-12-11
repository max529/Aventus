export const INJECTED_CODE = `<script type="text/javascript">
if ('WebSocket' in window) {
	(function() {
		var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
		var address = protocol + window.location.host + window.location.pathname + '/ws';
		var socket = new WebSocket(address);
		socket.onmessage = function(msg) {
			
			console.log(msg);
		};
	})();
}
</script>`;