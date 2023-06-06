import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { User } from '../models/User.js';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import e from 'express';

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

describe('createCategory', () => {
	beforeEach(async () => {
		await categories.deleteMany();
	});
	test('should retrieve list of all categories', (done) => {
		categories
			.create({
				type: 'investment',
				color: '#000000',
			})
			.then(() => {
				request(app)
					.get('/categories')
					.then((res) => {
						expect(res.status).toBe(200);
						expect(res.body).toHaveLength(1);
						expect(res.body[0].type).toBe('investment');
						expect(res.body[0].color).toBe('#000000');
						done();
					})
					.catch((err) => done(err));
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
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
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
