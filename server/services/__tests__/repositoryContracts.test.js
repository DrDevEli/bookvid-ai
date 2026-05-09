const databaseManager = require('../../config/database');
const BookRepository = require('../../models/Book');
const VideoRepository = require('../../models/Video');
const UserRepository = require('../../models/User');
const fs = require('fs');
const path = require('path');

describe('Repository contract compatibility', () => {
  let userRepo;
  let bookRepo;
  let videoRepo;
  let user;
  let bookA;
  let bookB;
  let video;

  beforeAll(async () => {
    databaseManager.initialize(':memory:');
    const db = databaseManager.getDatabase();
    const schemaPath = path.join(__dirname, '..', '..', '..', 'scripts', 'db-migrations', 'schema.sql');
    const seedPath = path.join(__dirname, '..', '..', '..', 'scripts', 'db-migrations', 'seed-templates.sql');

    db.exec(fs.readFileSync(schemaPath, 'utf8'));
    db.exec(fs.readFileSync(seedPath, 'utf8'));
  });

  beforeEach(async () => {
    const db = databaseManager.getDatabase();
    db.prepare('DELETE FROM videos').run();
    db.prepare('DELETE FROM books').run();
    db.prepare('DELETE FROM users').run();

    userRepo = new UserRepository();
    bookRepo = new BookRepository();
    videoRepo = new VideoRepository();

    user = await userRepo.createUser({
      username: 'repo_user',
      email: 'repo_user@example.com',
      password: 'StrongP4ssword'
    });

    bookA = bookRepo.createBook({
      user_id: user.id,
      title: 'Alpha Book',
      author: 'Author A',
      genre: 'Fantasy',
      description: 'First description'
    });

    bookB = bookRepo.createBook({
      user_id: user.id,
      title: 'Beta Book',
      author: 'Author B',
      genre: 'Sci-Fi',
      description: 'Second description'
    });

    video = videoRepo.createVideo({
      user_id: user.id,
      book_id: bookA.id,
      title: 'Video Contract Test',
      script: 'Initial script'
    });
  });

  afterAll(() => {});

  test('BookRepository.searchBooks aliases searchUserBooks', () => {
    const results = bookRepo.searchBooks(user.id, 'Alpha', { limit: 10 });
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Alpha Book');
  });

  test('BookRepository.updateBook supports (bookId, updateData) route signature', () => {
    const updated = bookRepo.updateBook(bookA.id, {
      title: 'Alpha Book Updated'
    });

    expect(updated).not.toBeNull();
    expect(updated.title).toBe('Alpha Book Updated');
  });

  test('BaseRepository page+limit pagination works through getUserBooks', () => {
    const pageOne = bookRepo.getUserBooks(user.id, { page: 1, limit: 1 });
    const pageTwo = bookRepo.getUserBooks(user.id, { page: 2, limit: 1 });

    expect(pageOne).toHaveLength(1);
    expect(pageTwo).toHaveLength(1);
    expect(pageOne[0].id).not.toBe(pageTwo[0].id);
  });

  test('BaseRepository rejects invalid page values', () => {
    expect(() => bookRepo.getUserBooks(user.id, { page: 0, limit: 1 })).toThrow('Invalid page value');
  });

  test('VideoRepository.getVideoWithDetails works with optional user scoping', () => {
    const unscoped = videoRepo.getVideoWithDetails(video.id);
    const scoped = videoRepo.getVideoWithDetails(video.id, user.id);
    const denied = videoRepo.getVideoWithDetails(video.id, 'other-user');

    expect(unscoped).not.toBeNull();
    expect(scoped).not.toBeNull();
    expect(denied).toBeNull();
  });

  test('VideoRepository.updateVideo supports route updates and cancelled mapping', () => {
    const updated = videoRepo.updateVideo(video.id, {
      status: 'cancelled',
      script: 'Updated script'
    });

    expect(updated).not.toBeNull();
    expect(updated.status).toBe('failed');
    expect(updated.script).toBe('Updated script');
  });
});
