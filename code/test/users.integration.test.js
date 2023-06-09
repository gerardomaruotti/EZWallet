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
		role: 'Regular'
	},
	{
		username: 'test2',
		email: 'test2@example.com',
		password: 'pwd2',
		role: 'Regular'
	},
	{
		username: 'test3',
		email: 'test3@example.com',
		password: 'pwd3',	
		role: 'Regular'
	}
]

const response_users = [
	{
		username: users[0].username,
		email: users[0].email,
		role: users[0].role
	},
	{
		username: users[1].username,
		email: users[1].email,
		role: users[1].role
	},
	{
		username: users[2].username,
		email: users[2].email,
		role: users[2].role
	}
]

const admin = {
	email: 'admin@email.com',
	username: 'admin',
	password: 'pwdadmin',
	role: 'Admin',
}

const response_admin = {
	email: admin.email,
	username: admin.username,
	role: admin.role
}

admin.refreshToken = jwt.sign(
	admin,
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
	await Group.deleteMany({});
	await User.create(admin);
	for (let i = 0; i < users.length; i++) {
		users[i].refreshToken = jwt.sign(
			users[i],
			process.env.ACCESS_KEY,
			{ expiresIn: '1y' }
		);
		await User.create(users[i]);
	}
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
				expect(response.body.data).toEqual([response_admin , ...response_users]);
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
			.send({
				name: 'testGroup',
				memberEmails: [users[0].email, users[1].email]
			})
			.then((response) => {
				//expect(response.status).toBe(200);
				expect(response.body.data).toEqual({
					group: {
						name: 'testGroup',
						members: [{email: users[0].email }, { email: users[1].email }],
					},
					alreadyInGroup: [],
					membersNotFound: [],		
				});
				done();
			})
			.catch((err) => done(err));		
	});

	test('Should return an error if the access token are empty', (done) => {
		request(app)
			.post('/api/groups')
			.set('Cookie', `accessToken="" refreshToken=""`)
			.send({
				name: 'testGroup',
				memberEmails: [users[0].email, users[1].email]
			})
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
				`accessToken=${users[0].refreshToken}; refreshToken=${users[0].refreshToken};`
			)
			.send({
				name: '',
				memberEmails: [users[0].email, users[1].email]
			})
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toEqual({
					error: 'Group name cannot be empty'
				});
				done();
			})
			.catch((err) => done(err));
	});

	test('Should return an error if the group name is already taken', (done) => {
		request(app)
			.post('/api/groups')
			.set(
				'Cookie',
				`accessToken=${users[0].refreshToken}; refreshToken=${users[0].refreshToken};`
			)
			.send({
				name: 'testGroup',
				memberEmails: [users[0].email, users[1].email]
			})
			.then((response) => {
				request(app)
					.post('/api/groups')
					.set(
						'Cookie',
						`accessToken=${users[0].refreshToken}; refreshToken=${users[0].refreshToken};`
					)
					.send({
						name: 'testGroup',
						memberEmails: [users[0].email, users[1].email]
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


describe('getGroups', () => {

	test('Nominal case: should retrieve list of all groups', (done) => {	
		request(app)
			.post('/api/groups')
			.set(
				'Cookie',
				`accessToken=${users[0].refreshToken}; refreshToken=${users[0].refreshToken}`
			)
			.send({
				name: 'testGroup1',
				memberEmails: [users[0].email, users[1].email]
			})
			.then((response) => {
				expect(response.status).toBe(200);
				request(app)
					.post('/api/groups')
					.set(
						'Cookie',
						`accessToken=${users[2].refreshToken}; refreshToken=${users[2].refreshToken}`
					)
					.send({
						name: 'testGroup2',
						memberEmails: [users[2].email]
					})
					.then((response) => {
						expect(response.status).toBe(200);
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
										name: 'testGroup1',
										members: [{email: users[0].email }, { email: users[1].email }],
									},
									{
										name: 'testGroup2',
										members: [{email: users[2].email }],
									}
								]);
								done();
							})
							.catch((err) => done(err));
					})
					.catch((err) => done(err));
			})
			.catch((err) => done(err));
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
});


describe('getGroup', () => {});

describe('addToGroup', () => {});

describe('removeFromGroup', () => {});

describe('deleteUser', () => {});

describe('deleteGroup', () => {});
