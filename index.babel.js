const childProcess = require('child_process');

const defaults = {
	args: [],
	fork: true,
	encoding: 'utf8',
	debug: false,
	stderrThrow: true
};

/**
 * TTY test helper. Forks or spawns a process and keeps stdout history in an array. Throws by default if it receives stderr from the child.
 *
 * @param cmd {string} Which command to fork / spawn.
 * @param [opts] {object} Default options:
 *                          args: []          - Arguments for child process.
 *                          fork: true        - If child process should fork or spawn.
 *                          encoding: 'utf8'  - Encoding of stdout / stderr.
 *                          debug: false      - Print debug messages.
 *                          stderrThrow: true - Throws on stderr.
 *
 * @returns {object}
 */
export default function ttyTestHelper (cmd, opts = defaults) {
	let child;
	if (opts.fork) {
		// silent: true -> do not pipe child.stdout to process.stdout
		child = childProcess.fork(cmd, opts.args, { silent: true });
	} else {
		child = childProcess.spawn(cmd, opts.args, { silent: true });
	}

	// keep output history in an array
	const stdout = [];
	child.stdout.setEncoding(opts.encoding);
	child.stdout.on('data', (d) => {
		stdout.push(d);
		if (opts.debug) {
			console.log(`${cmd} stdout: ${d}`);
		}
	});

	const stderr = [];
	child.stderr.setEncoding(opts.encoding);
	child.stderr.on('data', (d) => {
		if (opts.debug) {
			console.log(`${cmd} stderr: ${d}`);
		}
		if (opts.stderrThrow) {
			// fail hard on stderr
			throw new Error(d);
		} else {
			stderr.push(d);
		}
	});

	/**
	 * Wait until what is found in array.
	 *
	 * @param what {string|regex} What to look for.
	 * @param [arr] {array} Defaults to stdout history of child.
	 * @param [onlyNew] {bool} Search only in newly added items in array.
	 * @param [timeout] {int} How long to wait before rejecting.
	 * @returns {Promise}
	 */
	function waitFor (what = '', arr = stdout, onlyNew = false, timeout = 1000) {
		return new Promise((resolve, reject) => {
			let timeout, interval, l;
			// check every 10 ms
			if (onlyNew) {
				l = what.length;
			}
			interval = setInterval(() => {
				if (onlyNew && what.length === l) {
					return;
				}
				if (last(arr) && last(arr).indexOf(what) !== -1) {
					clearTimeout(timeout);
					clearInterval(interval);
					resolve(last(arr));
				}
			}, 10);
			// or time out
			timeout = setTimeout(() => {
				clearInterval(interval);
				reject(`timed out after ${timeout} milliseconds, did not find "${what}" in "${last(arr)}"`);
			}, timeout);
		})
	}

	/**
	 * Get next item added to array.
	 *
	 * @param [arr] {array} Defaults to stdout history of child.
	 * @param [timeout] {int} How long to wait before rejecting.
	 * @returns {Promise}
	 */
	function next (arr = stdout, timeout = 1000) {
		// TODO: EventEmitter?
		return new Promise((resolve, reject) => {
			let _timeout, interval;
			const l = arr.length;
			// check every 10 ms
			interval = setInterval(() => {
				if (arr.length === l) {
					return;
				}
				clearTimeout(_timeout);
				clearInterval(interval);
				resolve(last(arr));
			}, 10);
			// or time out
			_timeout = setTimeout(() => {
				clearInterval(interval);
				reject(`next timed out after ${timeout} milliseconds`);
			}, timeout);
		})
	}

	return {
		child,
		stdout,
		stderr,
		stdin: child.stdin,
		waitFor,
		next,
		wait
	}
}

/**
 * Get last item of array.
 *
 * @returns `undefined` if array is empty.
 */
function last (arr) {
	return arr.slice(arr.length - 1)[0]
}

/**
 * Resolve after `time`.
 *
 * @param time {int} Milliseconds to wait before resolving.
 * @returns {Promise}
 */
function wait (time = 1) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}