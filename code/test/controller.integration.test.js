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

const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, {
	expiresIn: '1y',
});

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

beforeEach(async () => {
	await categories.deleteMany();
	await transactions.deleteMany();
	await User.deleteMany();
});

describe('createCategory', () => {
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
				done();
			});
	});

	test('Should return 401 if not authorized', (done) => {
		request(app)
			.post('/api/categories')
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.send({ type: 'test', color: 'red' })
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			});
	});

	test('Should return 400 if missing color', (done) => {
		request(app)
			.post('/api/categories')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.send({ type: 'test' })
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	test('Should return 400 if missing type', (done) => {
		request(app)
			.post('/api/categories')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.send({ color: 'red' })
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	// test('should return 400 if category already exists', (done) => {
	// 	categories.deleteMany({ type: 'test' }).then(() => {
	// 		categories.create({ type: 'test', color: 'red' }).then(() => {
	// 			request(app)
	// 				.post('/api/categories')
	// 				.set(
	// 					'Cookie',
	// 					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
	// 				)
	// 				.send({ type: 'test', color: 'red' })
	// 				.then((response) => {
	// 					expect(response.status).toBe(400);
	// 					done();
	// 				});
	// 		});
	// 	});
	// });
});

describe('updateCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteCategory', () => {
	test('should return 401 if not authorized', (done) => {
		request(app)
			.delete('/api/categories')
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.send({ types: ['test'] })
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			});
	});

	test('should return 400 if missing types', (done) => {
		request(app)
			.delete('/api/categories')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.send({})
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	test('should return 400 if types is empty', (done) => {
		request(app)
			.delete('/api/categories')
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.send({ types: [] })
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	test('should return 400 id there is only one category remaining', (done) => {
		categories.create({ type: 'test', color: 'red' }).then(() => {
			request(app)
				.delete('/api/categories')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.send({ types: ['test'] })
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				});
		});
	});

	test('should return 400 if one of the categories does not exist', (done) => {
		categories
			.create({ type: 'test', color: 'red' }, { type: 'second', color: 'blue' })
			.then(() => {
				request(app)
					.delete('/api/categories')
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.send({ types: ['ok', 'test2'] })
					.then((response) => {
						expect(response.status).toBe(400);
						done();
					});
			});
	});

	test('should return 200 if all categories are deleted', (done) => {
		categories
			.create({ type: 'test', color: 'red' }, { type: 'second', color: 'blue' })
			.then(() => {
				request(app)
					.delete('/api/categories')
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.send({ types: ['test', 'second'] })
					.then((response) => {
						expect(response.status).toBe(200);
						done();
					});
			});
	});

	test('should return 200 if all categories are deleted and transactions are updated', (done) => {
		categories
			.create({ type: 'test', color: 'red' }, { type: 'second', color: 'blue' })
			.then(() => {
				transactions
					.create(
						{
							amount: 100,
							type: 'income',
							category: 'test',
							date: new Date(),
							userId: 'tester',
						},
						{
							amount: 100,
							type: 'income',
							category: 'second',
							date: new Date(),
							userId: 'tester',
						}
					)
					.then(() => {
						request(app)
							.delete('/api/categories')
							.set(
								'Cookie',
								`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
							)
							.send({ types: ['test', 'second'] })
							.then((response) => {
								expect(response.status).toBe(200);
							});
					});
			});
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

	test('Should return 401 if not authorized', (done) => {
		request(app)
			.get('/api/categories')
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.then((response) => {
				expect(response.status).toBe(401);
				expect(response.body).toHaveProperty('error');
				done();
			});
	});
});

describe('createTransaction', () => {
	test.skip('Should return 401 if not authorized', (done) => {
		request(app)
			.post('api/users/tester/transactions')
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.then((response) => {
				expect(response.status).toBe(401);
				expect(response.body).toHaveProperty('error');
				done();
			});
	});
	// test('Should create a category and return it', (done) => {
	// 	User.create({
	// 		username: 'admin',
	// 		email: 'admin@email.com',
	// 		password: 'admin',
	// 		refreshToken: adminAccessTokenValid,
	// 		role: 'Admin',
	// 	}).then(() => {
	// 		categories.create({ type: 'test', color: 'red' }).then(() => {
	// 			request(app)
	// 				.post('api/users/admin/transactions')
	// 				.set(
	// 					'Cookie',
	// 					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
	// 				)
	// 				.send({ username: 'admin', amount: '30', type: 'test' })
	// 				.then((response) => {
	// 					expect(response.status).toBe(200);
	// 					done();
	// 				});
	// 		});
	// 	});
	// });
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
