import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { User } from '../models/User.js';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import e from 'express';
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

beforeAll(async () => {
	const dbName = 'testingDatabaseController';
	const url = `${process.env.MONGO_URI}/${dbName}`;

	await mongoose.connect(url, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
});

afterAll(async () => {
	await mongoose.connection.db.dropDatabase();
	await mongoose.connection.close();
});

describe('createCategory', () => {
	beforeEach(async () => {
		await categories.deleteMany();
	});

	test('Should create a category and return it', (done) => {
		request(app)
			.post('/api/categories')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.send({ type: 'test', color: 'red' })
			.then((response) => {
				expect(response.status).toBe(200);
				// expect(response.body.data).toHaveProperty('type');
				// expect(response.body.data).toHaveProperty('color');
				done();
			});
	});
});

describe('updateCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getCategories', () => {
	beforeEach(async () => {
		await categories.deleteMany();
	});
	test('Nominal case: returns a list of categories', (done) => {
		categories.create({ type: 'test', color: 'red' }).then(() => {
			request(app)
				.get('/api/categories')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(200);
					expect(response.body.data[0]).toHaveProperty('type');
					expect(response.body.data[0]).toHaveProperty('color');
					done();
				});
		});
	});
});

describe('createTransaction', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getAllTransactions', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByUser', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByUserByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByGroup', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByGroupByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteTransaction', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteTransactions', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});
