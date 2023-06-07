import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { User, Group } from '../models/User.js';
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
	await Group.deleteMany();
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

	test.skip('should return 400 if category already exists', (done) => {
		categories.create({ type: 'test', color: 'red' }).then(() => {
			request(app)
				.post('/api/categories')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.send({ type: 'test', color: 'red' })
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				});
		});
	});
});

describe('updateCategory', () => {
	test('Returns a message for confirmation and the number of updated transactions', (done) => {
		//We create a category in our empty database (we know it's empty thanks to the beforeEach above)
		categories
			.create({
				type: 'food',
				color: 'red',
			})
			.then(() => {
				//We insert two users in the datbase: an Admin and a user that made two transactions
				User.create([
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
				]).then(() => {
					//We want to see that the function changes the type of existing transactions of the same type, so we create two transactions
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
								.patch('/api/categories/food') //Route to call
								.set(
									'Cookie',
									`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
								) //Setting cookies in the request
								.send({ type: 'health', color: 'red' }) //Definition of the request body
								.then((response) => {
									//After obtaining the response, we check its actual body content
									//The status must represent successful execution
									expect(response.status).toBe(200);
									//The "data" object must have a field named "message" that confirms that changes are successful
									//The actual value of the field could be any string, so it's not checked
									expect(response.body.data).toHaveProperty('message');
									//We expect the count of edited transactions returned to be equal to 2 (the two transactions we placed in the database)
									expect(response.body.data).toHaveProperty('count');

									//Must be called at the end of every test or the test will fail while waiting for it to be called
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
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			) //Setting cookies in the request
			.send({ type: 'health', color: 'red' });

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty('message');
		expect(response.body.data).toHaveProperty('count');
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
				User.create([
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
				]).then(() => {
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

//OK
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

//OK
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
	// test('Should return 401 if not authorized', (done) => {
	// 	request(app)
	// 		.post('api/users/admin/transactions')
	// 		.set(
	// 			'Cookie',
	// 			`accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`
	// 		)
	// 		.send({ username: 'admin', amount: 100, type: 'income' })
	// 		.then((response) => {
	// 			expect(response.status).toBe(401);
	// 			expect(response.body).toHaveProperty('error');
	// 			done();
	// 		});
	// });
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
