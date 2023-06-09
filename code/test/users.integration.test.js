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

describe('getUsers', () => {
	test('Nominal case: should retrieve list of all users', (done) => {
		request(app)
			.get('/api/users')
			.set(
				'Cookie',
				`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
			)
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body.data).toEqual([response_admin, ...response_users]);
				done();
			})
			.catch((err) => done(err));
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
});

describe('getUser', () => {
	test('Nominal case: should retrieve user', (done) => {
		request(app)
			.get(`/api/users/${users[0].username}`)
			.set(
				'Cookie',
				`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
			)
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body.data).toEqual(response_users[0]);
				done();
			})
			.catch((err) => done(err));
	});

	test('should return an error 400 if there are no users', (done) => {
		User.deleteMany({}).then(() => {
			request(app)
				.get(`/api/users/${users[0].username}`)
				.set(
					'Cookie',
					`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
				)
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toStrictEqual({ error: 'User not found' });
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the access token are empty', (done) => {
		request(app)
			.get(`/api/users/${users[0].username}`)
			.set('Cookie', `accessToken="" refreshToken=""`)
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			})
			.catch((err) => done(err));
	});
});

describe('createGroup', () => {
	test('Nominal case: should create a group', (done) => {
		request(app)
			.post('/api/groups')
			.set(
				'Cookie',
				`accessToken=${users[0].refreshToken}; refreshToken=${users[0].refreshToken};`
			)
			.send(group)
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body.data).toEqual({
					group: response_group,
					alreadyInGroup: [],
					membersNotFound: [],
				});

				done();
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the request body is empty', (done) => {
		request(app)
			.post('/api/groups')
			.set(
				'Cookie',
				`accessToken=${users[0].refreshToken}; refreshToken=${users[0].refreshToken};`
			)
			.send({})
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Missing parameters',
				});
				done();
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the access token are empty', (done) => {
		request(app)
			.post('/api/groups')
			.set('Cookie', `accessToken="" refreshToken=""`)
			.send(group)
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the group name is empty', (done) => {
		request(app)
			.post('/api/groups')
			.set(
				'Cookie',
				`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
			)
			.send({
				name: '',
				memberEmails: [users[0].email, users[1].email],
			})
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toEqual({
					error: 'Group name cannot be empty',
				});
				done();
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the group name is already taken', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
				)
				.send({
					name: group.name,
					memberEmails: [users[0].email, users[1].email],
				})
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toEqual({
						error: 'A group with the same name already exists',
					});
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the email are not well formatted', (done) => {
		request(app)
			.post('/api/groups')
			.set(
				'Cookie',
				`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
			)
			.send({
				name: group.name,
				memberEmails: ['test', 'test2'],
			})
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toEqual({
					error: 'Mail not correct formatted',
				});
				done();
			})
			.catch((err) => done(err));
	});

	test("Should return an error if the user aren't registered", (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
				)
				.send({
					name: 'otherName',
					memberEmails: ['notanuser@example.com'],
				})
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toEqual({
						error: 'All the emails are invalid',
					});
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if user is already in a group', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken};`
				)
				.send({
					name: 'otherName',
					memberEmails: [users[0].email, users[1].email, admin.email],
				})
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toEqual({
						error: 'User already in a group',
					});
					done();
				})
				.catch((err) => done(err));
		});
	});
});

describe('getGroups', () => {
	test('Nominal case: should retrieve list of all groups', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.get('/api/groups')
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.then((response) => {
						expect(response.status).toBe(200);
						expect(response.body.data).toEqual([
							{
								name: group.name,
								members: [{ email: admin.email }],
							},
						]);
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the access token are empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.get('/api/groups')
					.set('Cookie', `accessToken="" refreshToken=""`)
					.send()
					.then((response) => {
						expect(response.status).toBe(401);
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});
});

describe('getGroup', () => {
	test('Nominal case: should retrieve the group', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.get(`/api/groups/${group.name}`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.then((response) => {
						expect(response.status).toBe(200);
						expect(response.body.data).toEqual({
							name: group.name,
							members: [{ email: admin.email }],
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test("A group doesn't exist!", (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.get(`/api/groups/notagroup`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
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

	test('Should return an error if the access token are empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.get(`/api/groups/${group.name}`)
					.set('Cookie', `accessToken="" refreshToken=""`)
					.send()
					.then((response) => {
						expect(response.status).toBe(401);

						done();
					});
			})
			.catch((err) => done(err));
	});
});

describe('addToGroup', () => {
	test('Nominal case: should add a user to a group', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/insert`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: [users[0].email],
					})
					.then((response) => {
						expect(response.status).toBe(200);
						expect(response.body.data).toEqual({
							group: {
								name: group.name,
								members: [{ email: admin.email }, { email: users[0].email }],
							},
							alreadyInGroup: [],
							membersNotFound: [],
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if body is empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/insert`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send()
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error:
								'The request body does not contain all the necessary attributes',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the access token are empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/add`)
					.set('Cookie', `accessToken="" refreshToken=""`)
					.send({
						emails: [users[0].email],
					})
					.then((response) => {
						expect(response.status).toBe(401);
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test("Should return an error if the group doesn't exist", (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/notagroup/insert`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: [users[2].email],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Group not found',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the emails are empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/insert`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: ['', ''],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Mail not correct formatted',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test("Should return an error if the users aren't registered", (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/add`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: ['notanuser@example.com'],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'All the emails are invalid',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});
});

describe('removeFromGroup', () => {
	test('Nominal case: should remove a user from a group', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }, { email: users[0].email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: [users[0].email],
					})
					.then((response) => {
						expect(response.status).toBe(200);
						expect(response.body.data).toEqual({
							group: {
								name: group.name,
								members: [{ email: admin.email }],
							},
							notInGroup: [],
							membersNotFound: [],
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if body is empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }, { email: users[0].email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send()
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Missing parameters',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the access token are empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }, { email: users[0].email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/pull`)
					.set('Cookie', `accessToken="" refreshToken=""`)
					.send({
						emails: [users[0].email],
					})
					.then((response) => {
						expect(response.status).toBe(401);
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test("Should return an error if the group doesn't exist", (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/notagroup/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: [users[2].email],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Group not found',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the emails are empty', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: ['', ''],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Mail not correct formatted',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test("Should return an error if the users aren't registered", (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: ['notanuser@example.com'],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'All the emails are invalid',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the user is not in the group', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: [users[0].email],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'All the emails are invalid',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});

	test('Should return an error if try to delete all the users in the group', (done) => {
		Group.create({
			name: group.name,
			members: [{ email: admin.email }, { email: users[0].email }],
		})
			.then(() => {
				request(app)
					.patch(`/api/groups/${group.name}/remove`)
					.set(
						'Cookie',
						`accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`
					)
					.send({
						emails: [admin.email, users[0].email],
					})
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body).toEqual({
							error: 'Group will be empty after removing members',
						});
						done();
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
	});
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
