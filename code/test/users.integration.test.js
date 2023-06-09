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

beforeAll(async () => {
	const dbName = 'testingDatabaseUsers';
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

describe('getUsers', () => {
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
			password: 'tester',
			role: 'Regular',
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
});

describe('getUser', () => {
	afterAll(async () => {
		await User.deleteMany();
	});

	test('Should return an error 400 if there are no users', (done) => {
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

describe('createGroup', () => {
	test('Nominal case: should create a group', (done) => {
		User.create({
			username: 'tester',
			email: 'admin@email.com',
			password: 'tester',
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
				)
				.send({ name: 'testGroup', memberEmails: ['admin@example.com'] })
				.then((response) => {
					expect(response.status).toBe(200);
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the request body is empty', (done) => {
		User.create({
			username: 'tester',
			email: 'admin@email.com',
			password: 'tester',
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
				)
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the access token are empty', (done) => {
		request(app)
			.post('/api/groups')
			.set('Cookie', `accessToken="" refreshToken=""`)
			.send({ name: 'testGroup', memberEmails: ['admin@example.com'] })
			.then((response) => {
				expect(response.status).toBe(401);
				done();
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the group name is empty', (done) => {
		User.create({
			username: 'tester',
			email: 'admin@email.com',
			password: 'tester',
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
				)
				.send({ name: '', memberEmails: ['admin@example.com'] })
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the group name is already taken', (done) => {
		User.create({
			username: 'tester',
			email: 'admin@email.com',
			password: 'tester',
		}).then(() => {
			Group.create({
				name: 'testGroup',
				members: [{ email: 'pisjdpiasjdm@email.com' }],
			}).then(() => {
				request(app)
					.post('/api/groups')
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
					)
					.send({ name: 'testGroup', memberEmails: ['admin@example.com'] })
					.then((response) => {
						expect(response.status).toBe(400);
						done();
					})
					.catch((err) => done(err));
			});
		});
	});

	test('Should return an error if the email are not well formatted', (done) => {
		User.create({
			username: 'tester',
			email: 'admin@email.com',
			password: 'tester',
		}).then(() => {
			request(app)
				.post('/api/groups')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
				)
				.send({ name: 'testGroup', memberEmails: ['adminexampleom'] })
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if emails are invalid', (done) => {
		User.create({
			username: 'tester',
			email: 'test@email.com',
			password: 'tester',
		}).then(() => {
			Group.create({
				name: 'testGroup',
				members: [{ email: 'test@email.com' }],
			}).then(() => {
				request(app)
					.post('/api/groups')
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
					)
					.send({ name: 'poi', memberEmails: ['test@email.com'] })
					.then((response) => {
						expect(response.status).toBe(400);
						expect(response.body.error).toBe('All the emails are invalid');
						done();
					})
					.catch((err) => done(err));
			});
		});
	});

	test('Should return an error if user is already in a group', (done) => {
		User.create({
			username: 'tester',
			email: 'test123@email.com',
			password: 'tester',
		}).then(() => {
			User.create({
				username: 'tester23',
				email: 'tester2@email.com',
				password: 'tester2',
			}).then(() => {
				Group.create({
					name: 'group.name',
					members: [{ email: 'test123@email.com' }],
				}).then(() => {
					request(app)
						.post('/api/groups')
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
						)
						.send({
							name: 'otherName',
							memberEmails: ['tester2@email.com', 'test123@email.com'],
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
	});
});

describe('getGroups', () => {
	beforeAll(async () => {
		await User.create({
			username: 'tester1',
			email: 'tester1@gmail.com',
			password: 'tester1password',
			refreshToken: 'refreshtokentest1',
		});

		await User.create({
			username: 'tester2',
			email: 'tester2@gmail.com',
			password: 'tester2password',
			refreshToken: 'refreshtokentest2',
		});
	});

	test('Should return an error if the access token are empty', (done) => {
		request(app)
			.get('/api/groups')
			.set('Cookie', `accessToken="" refreshToken=""`)
			.then((response) => {
				expect(response.status).toBe(401);

				done();
			})
			.catch((err) => done(err));
	});

	test('Nominal case: should retrieve list of all groups', (done) => {
		Group.create({
			name: 'testGroup',
			members: [{ email: 'tester1@gmail.com' }, { email: 'tester2@gmail.com' }],
		}).then(() => {
			request(app)
				.get('/api/groups')
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(200);
					expect(response.body.data[0].members[0].email).toBe(
						'tester1@gmail.com'
					);
					expect(response.body.data[0].members[1].email).toBe(
						'tester2@gmail.com'
					);
					done();
				});
		});
	});

	afterAll(async () => {
		await Group.deleteMany();
		await User.deleteMany();
	});
});

describe('getGroup', () => {
	beforeAll(async () => {
		await User.create({
			username: 'tester1',
			email: 'tester1@gmail.com',
			password: 'tester1password',
			refreshToken: 'refreshtokentest1',
		});

		await User.create({
			username: 'tester2',
			email: 'tester2@gmail.com',
			password: 'tester2password',
			refreshToken: 'refreshtokentest2',
		});
	});

	afterEach(async () => {
		await Group.deleteMany();
	});

	test('A group already exists!', (done) => {
		const name = 'testGroup2';
		Group.create({
			name: 'testGroup',
			members: [{ email: 'tester1@gmail.com' }, { email: 'tester2@gmail.com' }],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}`)
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

	test('Should return an error if the access token are empty', (done) => {
		const name = 'testGroup';
		Group.create({
			name: 'testGroup',
			members: [{ email: 'tester1@gmail.com' }, { email: 'tester2@gmail.com' }],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}`)
				.set('Cookie', `accessToken="" refreshToken=""`)
				.then((response) => {
					expect(response.status).toBe(401);

					done();
				});
		});
	});

	test('A group already exists!', (done) => {
		const name = 'testGroup';
		Group.create({
			name: 'testGroup',
			members: [{ email: 'tester1@gmail.com' }, { email: 'tester2@gmail.com' }],
		}).then(() => {
			request(app)
				.get(`/api/groups/${name}`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.then((response) => {
					expect(response.status).toBe(200);
					expect(response.body).toStrictEqual({
						data: {
							name: 'testGroup',
							members: [
								{ email: 'tester1@gmail.com' },
								{ email: 'tester2@gmail.com' },
							],
						},
					});

					done();
				});
		});
	});
});

describe('addToGroup', () => {
	beforeEach(async () => {
		await User.create({
			username: 'tester1',
			email: 'tester1@gmail.com',
			password: 'testerpassword1',
			refreshToken: 'userToken1',
			role: 'Regular',
		});
		await User.create({
			username: 'tester2',
			email: 'tester2@gmail.com',
			password: 'testerpassword2',
			refreshToken: 'userToken2',
			role: 'Regular',
		});
	});
	afterEach(async () => {
		// Remove the test user after each test case
		await User.deleteMany();
		await Group.deleteMany();
	});

	test('should add members to a group', async () => {
		const name = 'grouptest';
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});
		const requestBody = {
			emails: ['tester2@gmail.com'],
		};

		const response = await request(app)
			.patch(`/api/groups/${name}/insert`)
			.send({ emails: ['tester2@gmail.com'] })
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
			);

		// Assert the response status code
		expect(response.status).toBe(200);

		// Assert the response body structure and content
		// expect(response.body.data).toBeDefined();
		// expect(response.body.data.group).toBeDefined();
		// expect(response.body.data.group.name).toBe('Group 1');
		// expect(response.body.data.group.members.length).toBe(2); // Assuming the group already has one member
		// expect(response.body.data.group.members[1].email).toBe(user2.email);
		// expect(response.body.data.alreadyInGroup).toEqual([]);
		// expect(response.body.data.membersNotFound).toEqual([]);
	});

	test('An error should be return if there is not request in the body', async () => {
		const name = 'grouptest';
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});
		const response = await request(app)
			.patch(`/api/groups/${name}/insert`)
			.send({});

		// Assert the response status code and error message
		expect(response.status).toBe(400);
		expect(response.body.error).toBe(
			'The request body does not contain all the necessary attributes'
		);
	});

	test('An error should be return if a group does not exist!', async () => {
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});
		const response = await request(app)
			.patch('/api/groups/gruppononesistente/add')
			.send({ emails: ['tester2@gmail.com'] })
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid};refreshToken=${adminAccessTokenValid}`
			);

		// Assert the response status code and error message
		expect(response.status).toBe(400);
		expect(response.body.error).toBe('Group not found');
	});

	test('Access token invalid in the case of add path', async () => {
		const name = 'grouptest';
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});

		const response = await request(app)
			.patch(`/api/groups/${name}/add`)
			.send({ emails: ['tester2@gmail.com'] })
			.set('Cookie', `accessToken=""; refreshToken=""`);

		// Assert the response status code
		expect(response.status).toBe(401);
	});

	test('Access token invalid in the case of insert path', async () => {
		const name = 'grouptest';
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});

		const response = await request(app)
			.patch(`/api/groups/${name}/insert`)
			.send({ emails: ['tester2@gmail.com'] })
			.set('Cookie', `accessToken=""; refreshToken=""`);

		// Assert the response status code
		expect(response.status).toBe(401);
	});

	test('Invalid path', async () => {
		const name = 'grouptest';
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});

		const response = await request(app)
			.patch(`/api/groups/${name}/insert/`)
			.send({ emails: ['tester2@gmail.com'] })
			.set('Cookie', `accessToken=""; refreshToken=""`);

		// Assert the response status code
		expect(response.status).toBe(400);
	});

	test('should return an error if all member emails are already in a group or do not exist', async () => {
		// Create a group and add a member
		const name = 'grouptest1';
		await Group.create({
			name: 'grouptest1',
			members: [
				{
					email: 'tester1@gmail.com',
				},
			],
		});

		const response = await request(app)
			.patch(`/api/groups/${name}/insert`)
			.send({
				emails: [],
			})
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid};refreshToken=${adminAccessTokenValid}`
			);

		// Assert the response status code and error message
		expect(response.status).toBe(400);
		expect(response.body.error).toBe('All the emails are invalid');
	});

	test('An error should be return if one or more are not correctly formatted!', async () => {
		const name = 'grouptest';
		await Group.create({
			name: 'grouptest',
			members: [{ email: 'tester1@gmail.com' }],
		});

		const response = await request(app)
			.patch(`/api/groups/${name}/insert`)
			.send({ emails: ['tester2.gmail.com'] })
			.set(
				'Cookie',
				`accessToken=${adminAccessTokenValid};refreshToken=${adminAccessTokenValid}`
			);

		// Assert the response status code
		expect(response.status).toBe(400);
		expect(response.body.error).toBe('Mail not correct formatted');
	});
});

describe('removeFromGroup', () => {
	test('Nominal case: should remove a user from a group', (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'admin@email.com' },
				],
			})
				.then(() => {
					request(app)
						.patch(`/api/groups/${name}/remove`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({
							emails: ['admin@email.com'],
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

	test('Should return an error if body is empty', (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'admin@email.com' },
				],
			})
				.then(() => {
					request(app)
						.patch(`/api/groups/${name}/remove`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.then((response) => {
							expect(response.status).toBe(400);
							done();
						})
						.catch((err) => done(err));
				})
				.catch((err) => done(err));
		});
	});

	test("Should return an error if the users aren't registered", (done) => {
		const name = 'groupname';
		Group.create({
			name: 'groupname',
			members: [{ email: 'okok123@example.com' }, { email: 'admin@email.com' }],
		}).then(() => {
			request(app)
				.patch(`/api/groups/${name}/remove`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.send({
					emails: ['admin@email.com'],
				})
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				})
				.catch((err) => done(err));
		});
	});

	test("Should return an error if the group doesn't exist", (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			request(app)
				.patch(`/api/groups/${name}/remove`)
				.set(
					'Cookie',
					`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
				)
				.send({
					emails: ['admin@email.com'],
				})
				.then((response) => {
					expect(response.status).toBe(400);
					done();
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the emails are empty', (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'admin@email.com' },
				],
			})
				.then(() => {
					request(app)
						.patch(`/api/groups/${name}/remove`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({
							emails: [''],
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

	test('Should return an error if the access token are empty', (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'admin@email.com' },
				],
			})
				.then(() => {
					request(app)
						.patch(`/api/groups/${name}/remove`)
						.set('Cookie', `accessToken=''; refreshToken=''`)
						.send({
							emails: ['admin@email.com'],
						})
						.then((response) => {
							expect(response.status).toBe(401);
							done();
						})
						.catch((err) => done(err));
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if the user is not in the group', (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'sadmin@email.com' },
				],
			})
				.then(() => {
					request(app)
						.patch(`/api/groups/${name}/remove`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({
							emails: ['admin@email.com'],
						})
						.then((response) => {
							expect(response.status).toBe(401);
							done();
						})
						.catch((err) => done(err));
				})
				.catch((err) => done(err));
		});
	});

	test('Should return an error if try to delete all the users in the group', (done) => {
		const name = 'groupname';
		User.create({
			username: 'tes123',
			email: 'admin@email.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [{ email: 'admin@email.com' }],
			})
				.then(() => {
					request(app)
						.patch(`/api/groups/${name}/remove`)
						.set(
							'Cookie',
							`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`
						)
						.send({
							emails: ['admin@email.com'],
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
});

describe('deleteUser', () => {
	test('Should delete the user from the group', (done) => {
		User.create({
			username: 'tes123',
			email: 'okok123@example.com',
			password: '12345678',
		}).then(() => {
			Group.create({
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'admin@email.com' },
				],
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
				name: 'groupname',
				members: [
					{ email: 'okok123@example.com' },
					{ email: 'admin@email.com' },
				],
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
			name: 'testGroup',
			members: [{ email: 'admin@example.com' }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
					)
					.send({ name: 'testGroup' })
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
			name: 'testGroup',
			members: [{ email: 'admin@email.com' }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set('Cookie', `accessToken="" refreshToken=""`)
					.then((response) => {
						expect(response.status).toBe(401);
						done();
					});
			})
			.catch((err) => done(err));
	});

	test('should give error if missing parameters', (done) => {
		Group.create({
			name: 'group.name',
			members: [{ email: 'admin@email.com' }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
					)
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
			name: 'group125',
			members: [{ email: 'admin@email.com' }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
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
			name: 'fnndonf',
			members: [{ email: 'admin@email.com' }],
		})
			.then(() => {
				request(app)
					.delete(`/api/groups`)
					.set(
						'Cookie',
						`accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid};`
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
