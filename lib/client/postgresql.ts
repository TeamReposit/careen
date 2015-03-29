'use strict';

import R = require('ramda');
import Promise = require('bluebird');
import Hemp = require('hemp');
import pg = require('pg');
Promise.promisifyAll(pg.Client.prototype);

import client = require('./index');

export interface Config extends pg.ClientConfig {
  url?: string
}

export function connect(config: Config): Promise<pg.Client> {
  var db = config.url
    ? new pg.Client(config.url)
    : new pg.Client(config);
  return db.connectAsync().return(db);
}

export function disconnect(db: pg.Client) {
  return Promise.resolve(db.end());
}

function runQuery(db: pg.Client, sql: string, values?: any[]): Promise<pg.QueryResult> {
  var query = db.query(sql, values);
  query.on('row', (row, result) => result.addRow(row));
  return new Promise(function(resolve: (result: pg.QueryResult) => void, reject) {
    query.once('error', reject);
    query.once('end', resolve);
  });
}

export function beginTransaction(db: pg.Client) {
  return runQuery(db, 'BEGIN;');
}

export function commitTransaction(db: pg.Client) {
  return runQuery(db, 'COMMIT;');
}

export function rollbackTransaction(db: pg.Client) {
  return runQuery(db, 'ROLLBACK;');
}

export function ensureJournal(db: pg.Client, tableName: string) {
  var sql = Hemp(' ', null, ';')
    ('CREATE TABLE IF NOT EXISTS', tableName, '(')
      ('timestamp TIMESTAMP PRIMARY KEY,')
      ('operation TEXT NOT NULL,')
      ('migration_id TEXT NOT NULL,')
      ('migration_name TEXT NOT NULL')
    (')');
  return runQuery(db, sql.toString());
}

export function appendJournal(db: pg.Client, tableName: string, entry: client.JournalEntryIn) {
  var sql = Hemp(' ', null, ';')
    ('INSERT INTO', tableName)
    ('(timestamp, operation, migration_id, migration_name)')
    ('VALUES')
    ('(now(), $1, $2, $3)');
  return runQuery(db, sql.toString(), [
    client.Operation[entry.operation],
    entry.migrationID,
    entry.migrationName
  ]);
}

export function readJournal(db: pg.Client, tableName: string) {
  var sql = Hemp(' ', null, ';')
    ('SELECT * FROM', tableName)
    ('ORDER BY timestamp');
  return runQuery(db, sql.toString())
    .then((result) => result.rows)
    .map(function(row: any): client.JournalEntry {
      return {
        timestamp: new Date(row.timestamp),
        operation: client.Operation[<string> row.operation],
        migrationID: <string> row.migration_id,
        migrationName: <string> row.migration_name
      };
    });
}

export function runMigrationSQL(db: pg.Client, sql: string) {
  return runQuery(db, sql);
}