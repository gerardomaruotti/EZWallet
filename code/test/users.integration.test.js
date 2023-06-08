import request from 'supertest';
import { app } from '../app';
import { User, Group } from '../models/User.js';
import { transactions, categories } from '../models/model';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const adminAccessTokenValid = jwt.sign(
	{
		email: 'admin@email.com',
		username: 'admin',
		role: 'Admin',
	},
	process.env.ACCESS_KEY,
	{ expiresIn: '1y' }
);

const testerAccessTokenValid = jwt.sign(
	{
		email: 'tester@test.com',
		username: 'tester',
		role: 'Regular',
	},
	process.env.ACCESS_KEY,
	{ expiresIn: '1y' }
);
/**
 * Necessary setup in order to create a new database for testing purposes before starting the execution of test cases.
 * Each test suite has its own database in order to avoid different tests accessing the same database at the same time and expecting different data.
 */

beforeAll(async () => {
	const dbName = 'testingDatabaseUsers';
	const url = `${process.env.MONGO_URI}/${dbName}`;

	await mongoose.connect(url, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
});

/**
 * After all test cases have been executed the database is deleted.
 * This is done so that subsequent executions of the test suite start with an empty database.
 */
afterAll(async () => {
	await mongoose.connection.db.dropDatabase();
	await mongoose.connection.close();
});

beforeEach(async () => {
	await User.deleteMany({});
});

describe('getUsers', () => {
	/**
	 * Database is cleared before each test case, in order to allow insertion of data tailored for each specific test case.
	 */

	test('should return empty list if there are no users', (done) => {
		request(app)
			.get('/api/users')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.then((response) => {
				expect(response.status).toBe(200);
				done();
			})
			.catch((err) => done(err));
	});

	test('Nominal case: should retrieve list of all users', (done) => {
		User.create({
			username: 'tester',
			email: 'tester@test.com',
			//role: 'Regular',
			password: 'tester',
			role: 'Regular',
			//refreshToken: adminAccessTokenValid,
		}).then(() => {
			request(app)
				.get('/api/users')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(200);
					expect(response.body.data[0].username).toEqual('tester');
					expect(response.body.data[0].email).toEqual('tester@test.com');
					expect(response.body.data[0].role).toEqual('Regular');
					done();
				});
		});
	});

	test('Should return an error if the access token are empty', (done) => {
		request(app)
			.get('/api/users')
			.set('Cookie', `accessToken="" refreshToken=""`)
			.then((response) => {
				expect(response.status).toBe(401);

				done();
			})
			.catch((err) => done(err));
	});

	afterAll(async () => {
		await User.deleteMany();
	});
});

describe('getUser', () => {
	afterAll(async () => {
		await User.deleteMany();
	});

	test('should return an error 400 if there are no users', (done) => {
		const username = 'tester';
		request(app)
			.get(`/api/users/${username}`)
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'User not found' });
				done();
			})
			.catch((err) => done(err));
	});

	test('Nominal case: should retrieve user', (done) => {
		const username = 'tester';
		User.create({
			username: 'tester',
			email: 'tester@test.com',
			password: 'tester',
			role: 'Regular',
		}).then(() => {
			request(app)
				.get(`/api/users/${username}`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(200);
					expect(response.body.data.username).toEqual('tester');
					expect(response.body.data.email).toEqual('tester@test.com');
					expect(response.body.data.role).toEqual('Regular');

					done();
				});
		});
	});

	test('Should return an error if the access token are empty', (done) => {
		const username = 'tester';
		User.create({
			username: 'tester',
			email: 'tester@test.com',
			password: 'tester',
		}).then(() => {
			request(app)
				.get(`/api/users/${username}`)
				.set('Cookie', `accessToken="" refreshToken=""`)
				.then((response) => {
					expect(response.status).toBe(401);

					done();
				})
				.catch((err) => done(err));
		});
	});
});

describe('createGroup', () => {});

describe('getGroups', () => {});

describe('getGroup', () => {});

describe('addToGroup', () => {});

describe('removeFromGroup', () => {});

describe('deleteUser', () => {});

describe('deleteGroup', () => {});
