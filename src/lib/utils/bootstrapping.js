export function bind (targetId, Component, props = {}) {
	const target = document.getElementById(targetId);
	const instance = new Component({ target, props });
	return instance;
}
