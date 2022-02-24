import { promisify } from 'util';

export const awaitAsync = promisify(setTimeout);
