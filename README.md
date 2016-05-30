[![npm version](https://badge.fury.io/js/tty-test-helper.svg)](https://badge.fury.io/js/tty-test-helper)
# tty-test-helper
Helper for testing interactive console applications.

```js
import test from 'ava';
import ttyTestHelper from './index.js';

test('ls', async (t) => {
	const app = ttyTestHelper('ls', { args: ['fixtures'], fork: false });

	await app.next();  // waits for next stdout
	t.true(app.stdout.length === 1);
});

```