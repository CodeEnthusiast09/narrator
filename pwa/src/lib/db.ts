import { openDB, type IDBPDatabase } from 'idb';

let _db: Promise<IDBPDatabase> | null = null;

export function getDb() {
  if (!_db) {
    _db = openDB('narrator', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) db.createObjectStore('progress');
        if (oldVersion < 2) db.createObjectStore('library');
      },
    });
  }
  return _db;
}
