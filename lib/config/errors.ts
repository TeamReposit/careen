'use strict';

import * as R from 'ramda';

import StandardError from '../standard-error';

export class ConfigError extends StandardError {
  key: string;
  expected: string;
  actual: string;
}

export class ConfigTypeError extends ConfigError {
  constructor(key: string, expected: string, actual: string) {
    super(`Expected ${key} to have type ${expected}, got ${actual}`);
    this.key = key;
    this.expected = expected;
    this.actual = actual;
  }

  static assert(key: string, expected: string, value: any): void {
    let actual = typeof value;
    if (actual !== expected) throw new ConfigTypeError(key, expected, actual);
  }
}

function enumStrings(enumObject: any) {
  return R.filter(k => isNaN(parseInt(k)), R.keys(enumObject));
}

export class ConfigEnumError extends ConfigError {
  constructor(key: string, enumObject: any, actual: string) {
    var expected = enumStrings(enumObject).join(', ');
    super(`Expected ${key} to be one of ${expected}; got ${actual}`);
    this.key = key;
    this.expected = expected;
    this.actual = actual;
  }
}

export class ConfigOptionError extends ConfigError {
  constructor(public option: string) {
    super(`Unrecognized command line option: ${option}`);
  }
}
