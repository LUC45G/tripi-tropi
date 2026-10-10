import test from 'node:test';
import assert from 'node:assert/strict';
import { sum } from './sum.mjs';

test('positive integer sum', () => assert.equal(sum(2, 3), 5));
test('negative integer sum', () => assert.equal(sum(-2, -3), -5));
test('fractional input rejected', () => assert.throws(() => sum(1.5, 2), TypeError));
