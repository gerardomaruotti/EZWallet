import request from 'supertest';
import { app } from '../app';
import { User, Group } from '../models/User.js';
import { transactions, categories } from '../models/model';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const users = [
	{
		username: 'test1',
		email: 'test1@example.com',
		password: 'pwd1',
		role: 'Regular',
	},
	{
		username: 'test2',
		email: 'test2@example.com',
		password: 'pwd2',
		role: 'Regular',
	},
	{
		username: 'test3',
		email: 'test3@example.com',
		password: 'pwd3',
		role: 'Regular',
	},
];

const response_users = [
	{
		username: users[0].username,
		email: users[0].email,
		role: users[0].role,
	},
	{
		username: users[1].username,
		email: users[1].email,
		role: users[1].role,
	},
	{
		username: users[2].username,
		email: users[2].email,
		role: users[2].role,
	},
];

const adminAccessTokenValid = jwt.sign(
	{
		email: 'admin@email.com',
		username: 'admin',
		role: 'Admin',
	},
	process.env.ACCESS_KEY,
	{ expiresIn: '1y' }
);

const admin = {
	email: 'admin@email.com',
	username: 'admin',
	password: 'pwdadmin',
	role: 'Admin',
};

const response_admin = {
	email: admin.email,
	username: admin.username,
	role: admin.role,
};

admin.refreshToken = jwt.sign(admin, process.env.ACCESS_KEY, {
	expiresIn: '1y',
});

const group = {
	name: 'testGroup',
	memberEmails: [users[0].email, users[1].email],
};

const response_group = {
	name: group.name,
	members: [
		{
			email: users[0].email,
		},
		{
			email: users[1].email,
		},
	],
};

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
	await Group.deleteMany({});
	await User.create(admin);
	for (let i = 0; i < users.length; i++) {
		users[i].refreshToken = jwt.sign(users[i], process.env.ACCESS_KEY, {
			expiresIn: '1y',
		});
		await User.create(users[i]);
	}
});

afterEach(async () => {
	await Group.deleteMany({});
});

describe('deleteUser', () => {
	test('Should delete the user from the group', (done) => {
		User.create({
			username: 'tes123',
			email: 'okok123@example.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: group.name,
				members: [{ email: 'okok123@example.com' }, { email: users[0].email }],
			})
				.then(() => {
					request(app)
						.delete(`/api/users`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({
							email: 'okok123@example.com',
						})
						.then((response) => {
							expect(response.status).toBe(200);
							done();
						})
						.catch((err) => done(err));
				})
				.catch((err) => done(err));
		});
	});

	test('should retrun 401 if the user is not logged in', (done) => {
		request(app)
			.delete(`/api/users`)
			.send({
				email: 'test123@example.com',
			})
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			})
			.catch((err) => done(err));
	});

	test('should return 400 if the email is not correct formatted', (done) => {
		User.create({
			username: 'tes123',
			email: 'okok123@example.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: group.name,
				members: [{ email: 'okok123@example.com' }, { email: users[0].email }],
			})
				.then(() => {
					request(app)
						.delete(`/api/users`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({
							email: 'okok123examplecom',
						})
						.then((response) => {
							expect(response.status).toBe(400);
							done();
						})
						.catch((err) => done(err));
				})
				.catch((err) => done(err));
		});
	});

	test('should return 400 if email is not defined', (done) => {
		request(app)
			.delete(`/api/users`)
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			})
			.catch((err) => done(err));
	});

	test('should return 400 if the user is not found', (done) => {
		request(app)
			.delete(`/api/users`)
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			)
			.send({ email: 'ok@test.com' })
			.then((response) => {
				expect(response.status).toBe(400);
				done();
			})
			.catch((err) => done(err));
	});
});

describe('deleteGroup', () => {
	test('Nominal:Should delete group and return "group deleted"', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
					)
					.send({ name: group.name })
					.then((response) => {
						expect(response.status).toBe(200);
						expect(response.body.data).toEqual({
							message: 'Group deleted',
						});

						done();
					});
			})
			.catch((err) => done(err));
	});
	test('not authorize', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set('Cookie', `accessToken="" refreshToken=""`)
					.send()
					.then((response) => {
						expect(response.status).toBe(401);

						done();
					});
			})
			.catch((err) => done(err));
	});
	test('should give error if missing parameters', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
					)
					.send(null)
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Missing parameters',
						});
						done();
					});
			})
			.catch((err) => done(err));
	});
	test('should give error if empty name parameter', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
					)
					.send({ name: '' })
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Empty name',
						});
						done();
					});
			})
			.catch((err) => done(err));
	});
	test('should give error if group not found', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
					)
					.send({ name: 'sdf' })
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Group not found',
						});

						done();
					});
			})
			.catch((err) => done(err));
	});
});
