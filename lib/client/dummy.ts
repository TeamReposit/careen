'use strict';

import * as R from 'ramda';
import * as Promise from 'bluebird';

import { JournalEntryIn, JournalEntry } from './index';

// Optional defaults for the live dataset.
export interface Config {
  tables?: {[s: string]: Object[]};
  sql?: string[];
}

// Dummy dataset containing a dictionary of tables and SQL history.
interface DataSet {
  tables: {[s: string]: Object[]};
  sql: string[];
}

// Database with live and transaction datasets.
interface DB {
  live: DataSet;
  transaction?: DataSet;
  rollback?: DataSet;
}

export function connect(config: Config): Promise<DB> {
  return Promise.resolve({
    live: {
      tables: config.tables || {},
      sql: config.sql || []
    }
  });
}

export function disconnect(db: DB) {
  return Promise.resolve();
}

export function beginTransaction(db: DB) {
  db.rollback = R.clone(db.live);
  db.transaction = R.clone(db.live);
  return Promise.resolve();
}

export function commitTransaction(db: DB) {
  db.live = db.transaction;
  db.transaction = null;
  db.rollback = null;
  return Promise.resolve();
}

export function rollbackTransaction(db: DB) {
  db.live = db.rollback;
  db.transaction = null;
  db.rollback = null;
  return Promise.resolve();
}

export function ensureJournal(db: DB, tableName: string) {
  let tables = (db.transaction || db.live).tables;
  if (!tables[tableName]) tables[tableName] = [];
  return Promise.resolve();
}

export function appendJournal(db: DB, tableName: string, entry: JournalEntryIn) {
  let journal = (db.transaction || db.live).tables[tableName];
  journal.push(R.assoc('timestamp', new Date(), entry));
  return Promise.resolve();
}

export function readJournal(db: DB, tableName: string) {
  let entries = (db.transaction || db.live).tables[tableName];
  return Promise.resolve(<JournalEntry[]> entries);
}

export function runMigrationSQL(db: DB, sql: string) {
  // Special-case used in tests for error handling.
  if (sql.indexOf('ERROR') === 0) {
    return Promise.reject(new Error(sql));
  }
  (db.transaction || db.live).sql.push(sql);
  return Promise.resolve();
}
