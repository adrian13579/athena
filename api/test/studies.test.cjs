require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { DataSource } = require('typeorm');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { StudiesController } = require('../dist/studies/studies.controller');
const { StudiesService } = require('../dist/studies/studies.service');
const { StudyEntity } = require('../dist/studies/study.entity');
const {
  knowledgeEntities,
  ConceptEntity,
  StudyConceptEntity,
  LearningEvidenceEntity,
} = require('../dist/knowledge/knowledge.entities');
const { CreateStudies1790294400000 } = require('../dist/database/create-studies.migration');
const {
  CreateKnowledgeGraph1790371200000,
} = require('../dist/database/create-knowledge-graph.migration');
const { ResetStudies1790460800000 } = require('../dist/database/reset-studies.migration');

// Always provision a new database: never migrate or reset the supplied administration database.
test('Study migration, API contract, and persistent storage', async (t) => {
  const adminUrl =
    process.env.TEST_DATABASE_URL || 'postgres://athena:athena@localhost:5432/athena';
  const database = 'athena_test_' + randomUUID().replaceAll('-', '');
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let db;
  let app;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    const url = new URL(adminUrl);
    url.pathname = '/' + database;
    const options = {
      type: 'postgres',
      url: url.toString(),
      synchronize: false,
      entities: [StudyEntity, ...knowledgeEntities],
      migrations: [CreateStudies1790294400000, CreateKnowledgeGraph1790371200000],
    };
    db = await new DataSource(options).initialize();
    await db.runMigrations();
    await db
      .getRepository(StudyEntity)
      .insert({ id: 'legacy', title: 'Legacy', date: '2026-09-25' });
    await db.getRepository(ConceptEntity).insert({ id: 'concept', name: 'Concept' });
    await db.getRepository(StudyConceptEntity).insert({ studyId: 'legacy', conceptId: 'concept' });
    await db.getRepository(LearningEvidenceEntity).insert({
      id: 'evidence',
      conceptId: 'concept',
      studyId: 'legacy',
      evidenceType: 'quiz',
      result: 1,
    });
    await db.destroy();
    options.migrations.push(ResetStudies1790460800000);
    db = await new DataSource(options).initialize();
    await db.runMigrations();
    await t.test('reset preserves knowledge and removes studies, links, and notes', async () => {
      assert.equal(await db.getRepository(StudyEntity).count(), 0);
      assert.equal(await db.getRepository(StudyConceptEntity).count(), 0);
      assert.equal(await db.getRepository(ConceptEntity).count(), 1);
      assert.equal(
        (await db.getRepository(LearningEvidenceEntity).findOneByOrFail({ id: 'evidence' }))
          .studyId,
        null,
      );
      const runner = db.createQueryRunner();
      try {
        assert.equal(await runner.hasColumn('studies', 'notes'), false);
      } finally {
        await runner.release();
      }
    });
    class TestModule {}
    Module({
      controllers: [StudiesController],
      providers: [
        { provide: StudiesService, useValue: new StudiesService(db.getRepository(StudyEntity)) },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
    const server = app.getHttpAdapter().getInstance();
    await server.ready();
    const request = (payload) => server.inject({ method: 'POST', url: '/api/studies', payload });
    const input = {
      id: randomUUID(),
      title: ' My study ',
      description: ' Description ',
      color: 'lavender',
    };
    await t.test('starts empty and retires synchronization', async () => {
      assert.deepEqual((await server.inject({ method: 'GET', url: '/api/studies' })).json(), []);
      assert.equal(
        (await server.inject({ method: 'PUT', url: '/api/studies/sync', payload: [] })).statusCode,
        410,
      );
    });
    await t.test('creates once under concurrent retries without overwriting', async () => {
      const results = await Promise.all([request(input), request(input)]);
      for (const result of results) assert.equal(result.statusCode, 201, result.body);
      const saved = results[0].json();
      assert.equal(saved.title, 'My study');
      assert.equal(saved.description, 'Description');
      assert.equal(saved.category, 'Personal');
      assert.equal(saved.sources, 0);
      assert.equal(saved.date, new Date().toISOString().slice(0, 10));
      assert.equal('notes' in saved, false);
      assert.deepEqual(results[1].json(), saved);
      assert.equal((await request({ ...input, title: 'Different' })).statusCode, 409);
      assert.equal(await db.getRepository(StudyEntity).count(), 1);
    });
    await t.test('rejects malformed input and server-owned fields', async () => {
      for (const change of [
        { id: 'bad' },
        { title: ' ' },
        { title: 'x'.repeat(91) },
        { description: 'x'.repeat(221) },
        { description: null },
        { color: 'red' },
        { notes: '' },
        { sources: 10 },
        { date: '2020-01-01' },
      ]) {
        assert.equal((await request({ ...input, ...change })).statusCode, 400);
      }
    });
    await app.close();
    app = null;
    await db.destroy();
    db = await new DataSource(options).initialize();
    await t.test('reconnect and startup preserve newly created data', async () => {
      assert.deepEqual(await db.runMigrations(), []);
      assert.equal(await db.getRepository(StudyEntity).count(), 1);
      assert.equal(
        (await new StudiesService(db.getRepository(StudyEntity)).findAll())[0].title,
        'My study',
      );
    });
  } finally {
    if (app) await app.close();
    if (db?.isInitialized) await db.destroy();
    if (created) await admin.query(`DROP DATABASE "${database}"`);
    await admin.end();
  }
});
