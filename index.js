'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = ttyTestHelper;
var childProcess = require('child_process');

var defaults = {
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
function ttyTestHelper(cmd) {
	var opts = arguments.length <= 1 || arguments[1] === undefined ? defaults : arguments[1];

	var child = void 0;
	if (opts.fork) {
		// silent: true -> do not pipe child.stdout to process.stdout
		child = childProcess.fork(cmd, opts.args, { silent: true });
	} else {
		child = childProcess.spawn(cmd, opts.args, { silent: true });
	}

	// keep output history in an array
	var stdout = [];
	child.stdout.setEncoding(opts.encoding);
	child.stdout.on('data', function (d) {
		stdout.push(d);
		if (opts.debug) {
			console.log(cmd + ' stdout: ' + d);
		}
	});

	var stderr = [];
	child.stderr.setEncoding(opts.encoding);
	child.stderr.on('data', function (d) {
		if (opts.debug) {
			console.log(cmd + ' stderr: ' + d);
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
	function waitFor() {
		var what = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
		var arr = arguments.length <= 1 || arguments[1] === undefined ? stdout : arguments[1];
		var onlyNew = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];
		var timeout = arguments.length <= 3 || arguments[3] === undefined ? 1000 : arguments[3];

		return new Promise(function (resolve, reject) {
			var timeout = void 0,
			    interval = void 0,
			    l = void 0;
			// check every 10 ms
			if (onlyNew) {
				l = what.length;
			}
			interval = setInterval(function () {
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
			timeout = setTimeout(function () {
				clearInterval(interval);
				reject('timed out after ' + timeout + ' milliseconds, did not find "' + what + '" in "' + last(arr) + '"');
			}, timeout);
		});
	}

	/**
  * Get next item added to array.
  *
  * @param [arr] {array} Defaults to stdout history of child.
  * @param [timeout] {int} How long to wait before rejecting.
  * @returns {Promise}
  */
	function next() {
		var arr = arguments.length <= 0 || arguments[0] === undefined ? stdout : arguments[0];
		var timeout = arguments.length <= 1 || arguments[1] === undefined ? 1000 : arguments[1];

		// TODO: EventEmitter?
		return new Promise(function (resolve, reject) {
			var _timeout = void 0,
			    interval = void 0;
			var l = arr.length;
			// check every 10 ms
			interval = setInterval(function () {
				if (arr.length === l) {
					return;
				}
				clearTimeout(_timeout);
				clearInterval(interval);
				resolve(last(arr));
			}, 10);
			// or time out
			_timeout = setTimeout(function () {
				clearInterval(interval);
				reject('next timed out after ' + timeout + ' milliseconds');
			}, timeout);
		});
	}

	return {
		child: child,
		stdout: stdout,
		stderr: stderr,
		stdin: child.stdin,
		waitFor: waitFor,
		next: next,
		wait: wait
	};
}

/**
 * Get last item of array.
 *
 * @returns `undefined` if array is empty.
 */
function last(arr) {
	return arr.slice(arr.length - 1)[0];
}

/**
 * Resolve after `time`.
 *
 * @param time {int} Milliseconds to wait before resolving.
 * @returns {Promise}
 */
function wait() {
	var time = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

	return new Promise(function (resolve) {
		setTimeout(resolve, time);
	});
}
