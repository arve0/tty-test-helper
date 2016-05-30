import test from 'ava';
import ttyTestHelper from './index.js';


test('ls', async (t) => {
	const app = ttyTestHelper('ls', { args: ['fixtures'], fork: false });

	await app.next();
	t.true(app.stdout.length === 1);
});
