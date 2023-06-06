import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { User } from '../models/User.js';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import e from 'express';
import jwt from 'jsonwebtoken';

dotenv.config();

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

describe('createCategory', () => {
	beforeEach(async () => {
		await categories.deleteMany();
	});
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
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
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
	test('should retrieve list of all categories', async () => {
		await categories.create({ type: 'food', color: 'red' });

		const response = await request(app)
			.get('/categories')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			);

		expect(response.status).toBe(200);
		expect(response.body).toHaveLength(1);
		expect(response.body[0].type).toBe('investment');
		expect(response.body[0].color).toBe('#000000');
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
