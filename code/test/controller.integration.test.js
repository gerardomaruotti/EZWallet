import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { User, Group } from '../models/User.js';
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
	await categories.deleteMany({});
	await transactions.deleteMany({});
	await User.deleteMany({});
	await Group.deleteMany({});
});

describe('createCategory', () => {
	test('Should create a category and return it', (done) => {
		request(app)
			.post('/api/categories')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
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
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ type: 'test' })
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	test('Should return 400 if missing type', (done) => {
		request(app)
			.post('/api/categories')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ color: 'red' })
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});
});

describe('updateCategory', () => {
	test('Returns a message for confirmation and the number of updated transactions', (done) => {
		categories
			.create({
				type: 'food',
				color: 'red',
			})
			.then(() => {
				User.create(
					{
						username: 'tester',
						email: 'tester@test.com',
						password: 'tester',
						refreshToken: testerAccessTokenValid,
					},
					{
						username: 'admin',
						email: 'admin@email.com',
						password: 'admin',
						refreshToken: adminAccessTokenValid,
						role: 'Admin',
					}
				).then(() => {
					transactions
						.create([
							{
								username: 'tester',
								type: 'food',
								amount: 20,
							},
							{
								username: 'tester',
								type: 'food',
								amount: 100,
							},
						])
						.then(() => {
							request(app)
								.patch('/api/categories/food')
								.set(
									'Cookie',
									`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
								)
								.send({ type: 'health', color: 'red' })
								.then((response) => {
									expect(response.status).toBe(200);
									expect(response.body.data).toHaveProperty('message');
									expect(response.body.data).toHaveProperty('count', 2);
									done();
								});
						});
				});
			});
	});

	test('Returns a message for confirmation and the number of updated transactions', async () => {
		await categories.create({ type: 'food', color: 'red' });
		await User.create([
			{
				username: 'tester',
				email: 'tester@test.com',
				password: 'tester',
				refreshToken: testerAccessTokenValid,
			},
			{
				username: 'admin',
				email: 'admin@email.com',
				password: 'admin',
				refreshToken: adminAccessTokenValid,
				role: 'Admin',
			},
		]);
		await transactions.create([
			{
				username: 'tester',
				type: 'food',
				amount: 20,
			},
			{
				username: 'tester',
				type: 'food',
				amount: 100,
			},
		]);
		//The API request must be awaited as well
		const response = await request(app)
			.patch('/api/categories/food') //Route to call
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ type: 'health', color: 'red' });

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty('message');
		expect(response.body.data).toHaveProperty('count', 2);
		//there is no "done" in this case to signal that the test has ended, as it ends automatically since it's not inside a "then" block
	});

	test('Returns a 400 error if the type of the new category is the same as one that exists already and that category is not the requested one', (done) => {
		categories
			.create([
				{
					type: 'food',
					color: 'red',
				},
				{
					type: 'health',
					color: 'blue',
				},
			])
			.then(() => {
				User.create({
					username: 'admin',
					email: 'admin@email.com',
					password: 'admin',
					refreshToken: adminAccessTokenValid,
					role: 'Admin',
				}).then(() => {
					request(app)
						.patch('/api/categories/food')
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({ type: 'health', color: 'green' }) //The passed type is one that already exists and is not the same one in the route (we are not updating the color of a category but we are trying to change its type to be a duplicate => error scenario)
						.then((response) => {
							//The response status must signal a wrong request
							expect(response.status).toBe(400);
							//The response body must contain a field named either "error" or "message" (both names are accepted but at least one must be present)
							const errorMessage = response.body.error
								? true
								: response.body.message
								? true
								: false;
							//The test passes if the response body contains at least one of the two fields
							expect(errorMessage).toBe(true);
							done();
						});
				});
			});
	});

	test('Returns a 400 error if the type of the old category does not exist', (done) => {
		categories
			.create([
				{
					type: 'food',
					color: 'red',
				},
				{
					type: 'health',
					color: 'blue',
				},
			])
			.then(() => {
				User.create({
					username: 'admin',
					email: 'admin@email.com',
					password: 'admin',
					refreshToken: adminAccessTokenValid,
					role: 'Admin',
				}).then(() => {
					request(app)
						.patch('/api/categories/inexistent')
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({ type: 'health', color: 'green' }) //The passed type is one that already exists and is not the same one in the route (we are not updating the color of a category but we are trying to change its type to be a duplicate => error scenario)
						.then((response) => {
							//The response status must signal a wrong request
							expect(response.status).toBe(400);
							//The response body must contain a field named either "error" or "message" (both names are accepted but at least one must be present)
							const errorMessage = response.body.error
								? true
								: response.body.message
								? true
								: false;
							//The test passes if the response body contains at least one of the two fields
							expect(errorMessage).toBe(true);
							done();
						});
				});
			});
	});

	test('Returns a 400 error if the request body does not contain all the necessary parameters', (done) => {
		categories
			.create({
				type: 'food',
				color: 'red',
			})
			.then(() => {
				User.create({
					username: 'admin',
					email: 'admin@email.com',
					password: 'admin',
					refreshToken: adminAccessTokenValid,
					role: 'Admin',
				}).then(() => {
					request(app)
						.patch('/api/categories/food')
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						//The ".send()" block is missing, meaning that the request body will be empty
						//Appending ".send({}) leads to the same scenario, so both options are equivalent"
						.then((response) => {
							expect(response.status).toBe(400);
							const errorMessage = response.body.error
								? true
								: response.body.message
								? true
								: false;
							expect(errorMessage).toBe(true);
							done();
						});
				});
			});
	});

	test('Returns a 401 error if called by a user who is not an Admin', (done) => {
		categories
			.create({
				type: 'food',
				color: 'red',
			})
			.then(() => {
				User.create(
					{
						username: 'tester',
						email: 'tester@test.com',
						password: 'tester',
						refreshToken: testerAccessTokenValid,
					},
					{
						username: 'admin',
						email: 'admin@email.com',
						password: 'admin',
						refreshToken: adminAccessTokenValid,
						role: 'Admin',
					}
				).then(() => {
					request(app)
						.patch('/api/categories/food')
						//The cookies we set are those of a regular user, which will cause the verifyAuth check to fail
						//Other combinations that can cause the authentication check to fail are also accepted:
						//      - mismatched tokens: .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
						//      - empty tokens: .set("Cookie", `accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`)
						//      - expired tokens: .set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`)
						//      - missing tokens: .set("Cookie", `accessToken=${}; refreshToken=${}`) (not calling ".set()" at all also works)
						//Testing just one authentication failure case is enough, there is NO NEED to check all possible token combination for each function
						.set(
							'Cookie',
							`accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`
						)
						.send({ type: 'food', color: 'green' })
						.then((response) => {
							expect(response.status).toBe(401);
							const errorMessage = response.body.error
								? true
								: response.body.message
								? true
								: false;
							expect(errorMessage).toBe(true);
							done();
						});
				});
			});
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
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({})
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	test('should return 400 if types is empty', (done) => {
		request(app)
			.delete('/api/categories')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
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
							username: 'tester',
							amount: 100,
							type: 'income',
						},
						{
							username: 'admin',
							amount: 100,
							type: 'income',
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
								done();
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
	test('Should return 401 if not authorized', (done) => {
		const username = 'tester';

		request(app)
			.post(`/api/users/${username}/transactions`)
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.send({ username: 'admin', amount: 100, type: 'income' })
			.then((response) => {
				expect(response.status).toBe(401);
				expect(response.body).toHaveProperty('error');
				done();
			});
	});

	test('Should return 400 if the user does not exist', (done) => {
		const username = 'admin';

		categories.create({ type: 'income', color: 'red' }).then(() => {
			request(app)
				.post(`/api/users/${username}/transactions`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.send({ username: 'admin', amount: 100, type: 'income' })
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toHaveProperty('error');
					done();
				});
		});
	});

	test('Should return 400 if category does not exist', (done) => {
		const username = 'admin';
		request(app)
			.post(`/api/users/${username}/transactions`)
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ username: 'admin', amount: 100, type: 'income' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty('error');
				done();
			});
	});

	test('Should create a category and return it', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@email.com',
			password: 'admin',
			refreshToken: adminAccessTokenValid,
			role: 'Admin',
		}).then(() => {
			categories.create({ type: 'test', color: 'red' }).then(() => {
				request(app)
					.post(`/api/users/${username}/transactions`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.send({ username: 'admin', amount: '30', type: 'test' })
					.then((response) => {
						expect(response.status).toBe(200);
						done();
					});
			});
		});
	});
});

describe('getAllTransactions', () => {
	test('should return 401 if not authorized', (done) => {
		request(app)
			.get('/api/transactions')
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			});
	});

	test('should return 200 if authorized', (done) => {
		transactions
			.create(
				{ username: 'admin', amount: 100, type: 'income' },
				{ username: 'tester', amount: 100, type: 'income' }
			)
			.then(() => {
				request(app)
					.get('/api/transactions')
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.then((response) => {
						expect(response.status).toBe(200);
						done();
					});
			});
	});
});

describe('getTransactionsByUser', () => {
	test('should return 400 if no user is found with provided username', (done) => {
		const username = 'admin';
		request(app)
			.get(`/api/users/${username}/transactions`)
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			});
	});

	test('should return 401 if not authorized', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			request(app)
				.get(`/api/users/${username}/transactions`)
				.set(
					'Cookie',
					`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
				)
				.then((response) => {
					expect(response.status).toBe(401);
					done();
				});
		});
	});

	test('should return 200 if authorized', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				transactions
					.create(
						{ username: 'admin', amount: 100, type: 'income' },
						{ username: 'tester', amount: 100, type: 'income' }
					)
					.then(() => {
						request(app)
							.get(`/api/users/${username}/transactions`)
							.set(
								'Cookie',
								`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
							)
							.then((response) => {
								expect(response.status).toBe(200);
								done();
							});
					});
			});
		});
	});

	test('should return 200 if authorized and filter query', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				transactions
					.create(
						{ username: 'admin', amount: 100, type: 'income' },
						{ username: 'tester', amount: 100, type: 'income' }
					)
					.then(() => {
						request(app)
							.get(`/api/users/${username}/transactions?date=2021-01-01`)
							.set(
								'Cookie',
								`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
							)
							.then((response) => {
								expect(response.status).toBe(200);
								done();
							});
					});
			});
		});
	});

	test('should return 500 if no categories defined', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			transactions
				.create(
					{ username: 'admin', amount: 100, type: 'income' },
					{ username: 'tester', amount: 100, type: 'income' }
				)
				.then(() => {
					request(app)
						.get(`/api/users/${username}/transactions`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.then((response) => {
							expect(response.status).toBe(500);
							done();
						});
				});
		});
	});

	test('should return 401 if not admin in admin path', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			transactions
				.create(
					{ username: 'admin', amount: 100, type: 'income' },
					{ username: 'tester', amount: 100, type: 'income' }
				)
				.then(() => {
					request(app)
						.get(`/api/transactions/users/${username}`)
						.set(
							'Cookie',
							`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
						)
						.then((response) => {
							expect(response.status).toBe(401);
							done();
						});
				});
		});
	});

	test('should return 200 and empty list if no user transactions', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			transactions.create({ username: 'tester', amount: 100, type: 'income' }).then(() => {
				request(app)
					.get(`/api/transactions/users/${username}`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.then((response) => {
						expect(response.status).toBe(200);
						done();
					});
			});
		});
	});

	test('should return 200 and list of user transactions', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories
				.create({ type: 'income', color: 'red' }, { type: 'investment', color: 'blue' })
				.then(() => {
					transactions
						.create(
							{ username: 'admin', amount: 1000, type: 'investment' },
							{ username: 'admin', amount: 100, type: 'income' }
						)
						.then(() => {
							request(app)
								.get(`/api/transactions/users/${username}`)
								.set(
									'Cookie',
									`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
								)
								.then((response) => {
									expect(response.status).toBe(200);
									done();
								});
						});
				});
		});
	});
});

describe('getTransactionsByUserByCategory', () => {
	test('should return 401 if not authorized', (done) => {
		const username = 'admin';
		const category = 'income';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				request(app)
					.get(`/api/users/${username}/transactions/category/${category}`)
					.set(
						'Cookie',
						`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
					)
					.then((response) => {
						expect(response.status).toBe(401);
						done();
					});
			});
		});
	});

	test('should return 400 if category is not found', (done) => {
		const username = 'admin';
		const category = 'investment';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				request(app)
					.get(`/api/users/${username}/transactions/category/${category}`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.then((response) => {
						expect(response.status).toBe(400);
						done();
					});
			});
		});
	});

	test('should return 400 if user is not found', (done) => {
		const username = 'tester';
		const category = 'income';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				request(app)
					.get(`/api/users/${username}/transactions/category/${category}`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.then((response) => {
						expect(response.status).toBe(400);
						done();
					});
			});
		});
	});

	test('should return 200', (done) => {
		const username = 'admin';
		const category = 'income';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				transactions.create({ username: 'admin', amount: 100, type: 'income' }).then(() => {
					request(app)
						.get(`/api/users/${username}/transactions/category/${category}`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.then((response) => {
							expect(response.status).toBe(200);
							done();
						});
				});
			});
		});
	});

	test('should return 200', (done) => {
		const username = 'admin';
		const category = 'income';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			categories.create({ type: 'income', color: 'red' }).then(() => {
				transactions.create({ username: 'test', amount: 100, type: 'okok' }).then(() => {
					request(app)
						.get(`/api/users/${username}/transactions/category/${category}`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.then((response) => {
							expect(response.status).toBe(200);
							expect(response.body.data).toEqual([]);
							done();
						});
				});
			});
		});
	});
});

describe('getTransactionsByGroup', () => {
	test('should return 401 if not authorized', (done) => {
		const name = 'adminGroup';
		Group.create({
			name: 'adminGroup',
			members: [{ email: 'admin@email.com' }],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}/transactions`)
				.set(
					'Cookie',
					`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
				)
				.then((response) => {
					expect(response.status).toBe(401);
					done();
				});
		});
	});

	test('should return 400 if group is not found', (done) => {
		const name = 'testGroup';
		Group.create({
			name: 'adminGroup',
			members: [{ email: 'admin@email.com' }],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}/transactions`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				});
		});
	});

	test('should return 200', (done) => {
		const name = 'adminGroup';
		User.create({
			username: 'admin',
			email: 'admin@email.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			Group.create({
				name: 'adminGroup',
				members: [{ email: 'admin@email.com' }],
			}).then(() => {
				transactions.create({ username: 'admin', amount: 100, type: 'income' }).then(() => {
					request(app)
						.get(`/api/groups/${name}/transactions`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.then((response) => {
							expect(response.status).toBe(200);
							done();
						});
				});
			});
		});
	});

	test('should return 200 if admin path', (done) => {
		const name = 'adminGroup';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			Group.create({
				name: 'adminGroup',
				memberEmails: ['admin@example,com'],
			}).then(() => {
				transactions.create({ username: 'admin', amount: 100, type: 'income' }).then(() => {
					request(app)
						.get(`/api/transactions/groups/${name}`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.then((response) => {
							expect(response.status).toBe(200);
							done();
						});
				});
			});
		});
	});
});

describe('getTransactionsByGroupByCategory', () => {
	test('should return 401 if not authorized', (done) => {
		const name = 'adminGroup';
		const category = 'income';
		Group.create({
			name: 'adminGroup',
			memberEmails: ['admin@example,com'],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}/transactions/category/${category}`)
				.set(
					'Cookie',
					`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
				)
				.then((response) => {
					expect(response.status).toBe(401);
					done();
				});
		});
	});

	test('should return 400 if group is not found', (done) => {
		const name = 'testGroup';
		const category = 'income';
		Group.create({
			name: 'adminGroup',
			memberEmails: ['admin@example,com'],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}/transactions/category/${category}`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				});
		});
	});

	test('should return 400 if category is not found', (done) => {
		const name = 'adminGroup';
		const category = 'test';
		Group.create({
			name: 'adminGroup',
			memberEmails: ['admin@example,com'],
		}).then(() => {
			request(app)
				.get(`/api/transactions/groups/${name}/category/${category}`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				});
		});
	});

	test('should return 200', (done) => {
		const name = 'adminGroup';
		const category = 'income';
		categories.create({ type: 'income', color: 'red' }).then(() => {
			User.create({
				username: 'admin',
				email: 'admin@email.com',
				password: 'tester',
				refreshToken: adminAccessTokenValid,
			}).then(() => {
				Group.create({
					name: 'adminGroup',
					members: [{ email: 'admin@email.com' }],
				}).then(() => {
					transactions.create({ username: 'admin', amount: 100, type: 'income' }).then(() => {
						request(app)
							.get(`/api/groups/${name}/transactions/category/${category}`)
							.set(
								'Cookie',
								`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
							)
							.then((response) => {
								expect(response.status).toBe(200);
								done();
							});
					});
				});
			});
		});
	});

	test('should return 401 of not admin on admin path', (done) => {
		const name = 'adminGroup';
		const category = 'income';
		User.create({
			username: 'tester',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: testerAccessTokenValid,
		}).then(() => {
			Group.create({
				name: 'adminGroup',
				memberEmails: ['admin@example,com'],
			}).then(() => {
				categories.create({ type: 'income', color: 'red' }).then(() => {
					transactions.create({ username: 'admin', amount: 100, type: 'income' }).then(() => {
						request(app)
							.get(`/api/transactions/groups/${name}/category/${category}`)
							.set(
								'Cookie',
								`accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`
							)
							.then((response) => {
								expect(response.status).toBe(401);
								done();
							});
					});
				});
			});
		});
	});

	test('should return 200 if admin path', (done) => {
		const name = 'adminGroup';
		const category = 'income';
		User.create({
			username: 'admin',
			email: 'admin@example.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			Group.create({
				name: 'adminGroup',
				memberEmails: ['admin@example.com'],
			}).then(() => {
				categories.create({ type: 'income', color: 'red' }).then(() => {
					transactions.create({ username: 'admin', amount: 100, type: 'income' }).then(() => {
						request(app)
							.get(`/api/transactions/groups/${name}/category/${category}`)
							.set(
								'Cookie',
								`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
							)
							.then((response) => {
								expect(response.status).toBe(200);
								done();
							});
					});
				});
			});
		});
	});
});

describe('deleteTransaction', () => {
	test('should return 401 if not authorized', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			request(app)
				.delete(`/api/users/${username}/transactions`)
				.set(
					'Cookie',
					`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
				)
				.then((response) => {
					expect(response.status).toBe(401);
					done();
				});
		});
	});

	test('should return 400 if ids are not provided', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			request(app)
				.delete(`/api/users/${username}/transactions`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toHaveProperty('error', 'Missing parameters');
					done();
				});
		});
	});

	test('should return 400 if user does not exist', (done) => {
		const username = 'admin';
		request(app)
			.delete(`/api/users/${username}/transactions`)
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _id: 1 })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty('error');
				done();
			});
	});

	test('should return 200 if transaction is deleted', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			transactions
				.create({ username: 'admin', amount: 100, type: 'income' })
				.then((transaction) => {
					request(app)
						.delete(`/api/users/${username}/transactions`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({ _id: transaction._id })
						.then((response) => {
							expect(response.status).toBe(200);
							done();
						});
				});
		});
	});

	test('should return 400 if transaction does not exist', (done) => {
		const username = 'admin';
		User.create({
			username: 'admin',
			email: 'admin@test.com',
			password: 'tester',
			refreshToken: adminAccessTokenValid,
		}).then(() => {
			request(app)
				.delete(`/api/users/${username}/transactions`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.send({ _id: '54jdnfsldòjngsn' })
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				});
		});
	});
});

describe('deleteTransactions', () => {
	test('should return 401 if not authorized', (done) => {
		request(app)
			.delete('/api/transactions')
			.set(
				'Cookie',
				`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
			)
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			});
	});

	test('should return 400 if ids are not provided', (done) => {
		request(app)
			.delete('/api/transactions')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty('error', 'Missing parameters');
				done();
			});
	});

	test('should return 400 if ids ais an ampty array', (done) => {
		request(app)
			.delete('/api/transactions')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _ids: [] })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty('error', 'Missing parameters');
				done();
			});
	});

	test('should return 400 if one ef ids element is empty', (done) => {
		request(app)
			.delete('/api/transactions')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _ids: [''] })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty('error', 'Empty parameter');
				done();
			});
	});

	test('should return 400 if one or more ids are not found', (done) => {
		request(app)
			.delete('/api/transactions')
			.set('Cookie', `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _ids: ['123456789012'] })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty('error', 'Transaction not found');
				done();
			});
	});

	test('should return 200 if all ids are found', (done) => {
		transactions
			.create(
				{ username: 'admin', amount: 100, type: 'income' },
				{ username: 'tester', amount: 100, type: 'income' }
			)
			.then((transactions) => {
				request(app)
					.delete('/api/transactions')
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
					)
					.send({ _ids: [transactions[0]._id, transactions[1]._id] })
					.then((response) => {
						expect(response.status).toBe(200);
						done();
					});
			});
	});
});
