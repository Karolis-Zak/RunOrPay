import { readFile } from 'node:fs/promises';
import { reportPeriod } from './report.js';

try {
  if (process.argv.length !== 3) throw new Error('Usage: node src/preview.js path/to/example.json');
  const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
  console.log(JSON.stringify(reportPeriod(input.date, input.activities, input.verified), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
