const sandbox = require('@architect/sandbox');

beforeAll(async () => {
  await sandbox.start({ quient: true });
  console.log('[Before All] started sandbox.');
});

afterAll(async () => {
  await sandbox.end();
  console.log('[After All] started sandbox.');
});

test('Index', () => {

});