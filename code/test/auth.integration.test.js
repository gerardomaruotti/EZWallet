import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require('bcryptjs');
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
	const dbName = 'testingDatabaseAuth';
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

describe('register', () => {
	test('Nominal case: a confirmation message must be returned', (done) => {
		request(app)
			.post('/api/register')
			.send({
				username: 'enrico',
				email: 'enrico@gmail.com',
				password: 'enrico',
			})
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body).toStrictEqual({
					data: { message: 'User added succesfully' },
				});
				done();
			});
	});

	test('Username undefined: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/register')
			.send({ email: 'enrico@gmail.com', password: 'enrico' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Missing parameters' });
				done();
			});
	});

	test('Email undefined: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/register')
			.send({ username: 'enrico', password: 'enrico' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Missing parameters' });
				done();
			});
	});

	test('Password undefined: a 400 error message must be returned  ', (done) => {
		request(app)
			.post('/api/register')
			.send({ username: 'enrico', email: 'enrico@gmail.com' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Missing parameters' });
				done();
			});
	});

	test('Empty username: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/register')
			.send({ username: '', email: 'enrico@gmail.com', password: 'enrico' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});
				done();
			});
	});

	test('Empty email: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/register')
			.send({ username: 'enrico', email: '', password: 'enrico' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});
				done();
			});
	});

	test('Empty password: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/register')
			.send({ username: 'enrico', email: 'enrico@gmail.com', password: '' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});
				done();
			});
	});

	test('Valid or invalid email: a 400 error message must be returned in case of invalid email', (done) => {
		request(app)
			.post('/api/register')
			.send({
				username: 'enrico',
				email: 'enrico.gmail.com',
				password: 'enrico',
			})
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Email not correct formatted',
				});
				done();
			});
	});

	test('User already register : a 400 error message must be returned in case of invalid email', (done) => {
		User.create({
			username: 'enrico',
			email: 'enrico@gmail.com',
			password: 'enrico',
		}).then(() => {
			request(app)
				.post('/api/register')
				.send({
					username: 'enrico',
					email: 'enrico@gmail.com',
					password: 'enrico',
				})
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toStrictEqual({
						error: 'User already registered',
					});
					done();
				});
		});
	});

	afterEach(async () => {
		await User.deleteMany();
	});
});

describe('registerAdmin', () => {
	afterEach(async () => {
		await User.deleteMany();
	});

	test('Nominal case: a confirmation message must be returned', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: 'admin', email: 'admin@gmail.com', password: 'admin' })
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body).toStrictEqual({
					data: { message: 'Admin added succesfully' },
				});
				done();
			});
	});

	test('Username undefined: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/admin')
			.send({ email: 'admin@gmail.com', password: 'admin' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Missing parameters' });
				done();
			});
	});

	test('Email undefined: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: 'admin', password: 'admin' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Missing parameters' });
				done();
			});
	});

	test('Password undefined: a 400 error message must be returned  ', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: 'admin', email: 'admin@gmail.com' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Missing parameters' });
				done();
			});
	});

	test('Empty username: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: '', email: 'admin@gmail.com', password: 'admin' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});
				done();
			});
	});

	test('Empty email: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: 'admin', email: '', password: 'admin' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});
				done();
			});
	});

	test('Empty password: a 400 error message must be returned ', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: 'admin', email: 'admin@gmail.com', password: '' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});
				done();
			});
	});

	test('Valid or invalid email: a 400 error message must be returned in case of invalid email', (done) => {
		request(app)
			.post('/api/admin')
			.send({ username: 'admin', email: 'admin.gmail.com', password: 'enrico' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Email not correct formatted',
				});
				done();
			});
	});

	test('User already register : a 400 error message must be returned in case of invalid email', (done) => {
		User.create({
			username: 'admin',
			email: 'admin@gmail.com',
			password: 'admin',
		}).then(() => {
			request(app)
				.post('/api/admin')
				.send({
					username: 'admin',
					email: 'admin@gmail.com',
					password: 'enrico',
				})
				.then((response) => {
					expect(response.status).toBe(400);
					expect(response.body).toStrictEqual({
						error: 'User already registered',
					});
					done();
				});
		});
	});
});

describe('login', () => {
	beforeAll(async () => {
		let adminpassword = await bcrypt.hash('12345hello', 12);
		await User.create({
			username: 'admin',
			email: 'admin@gmail.com',
			password: adminpassword,
			refreshToken: ' refreshtokentest',
		});
	});

	test('nominal case', (done) => {
		request(app)
			.post('/api/login')
			.send({ email: 'admin@gmail.com', password: '12345hello' })
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body.data).toHaveProperty('accessToken');
				expect(response.body.data).toHaveProperty('refreshToken');
				done();
			});
	});

	test('Empty email: a 400 error message must be returned', (done) => {
		request(app)
			.post('/api/login')
			.send({ email: '', password: '12345hello' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});

				done();
			});
	});

	test('Empty password: a 400 error message must be returned', (done) => {
		request(app)
			.post('/api/login')
			.send({ email: 'admin@gmail.com', password: '' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Empty string in parameters',
				});

				done();
			});
	});

	test('Email undefined: a 400 error message must be returned', (done) => {
		request(app)
			.post('/api/login')
			.send({ password: '12345hello' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Missing parameters',
				});

				done();
			});
	});

	test('Password undefined: a 400 error message must be returned', (done) => {
		request(app)
			.post('/api/login')
			.send({ email: 'admin@gmail.com' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					error: 'Missing parameters',
				});
				done();
			});
	});

	test('Invalid password: a 400 error message must be returned', (done) => {
		request(app)
			.post('/api/login')
			.send({ email: 'admin@gmail.com', password: '123456hello' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'Wrong credentials' });
				done();
			});
	});

	test('Invalid email: a 400 error message must be returned', (done) => {
		request(app)
			.post('/api/login')
			.send({ email: 'enrico@gmail.com', password: '12345hello' })
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'User need to register' });
				done();
			});
	});

	afterAll(async () => {
		await User.deleteMany();
	});
});

describe('logout', () => {
	beforeAll(async () => {
		let adminpassword = await bcrypt.hash('12345hello', 12);
		await User.create({
			username: 'admin',
			email: 'admin@gmail.com',
			password: adminpassword,
			refreshToken: 'refreshtokentest',
		});
	});

	test('Nominal case', (done) => {
		request(app)
			.get('/api/logout')
			.set('Cookie', `refreshToken=${'refreshtokentest'}`)
			.then((response) => {
				expect(response.status).toBe(200);
				expect(response.body).toStrictEqual({
					data: { message: 'User logged out' },
				});
				done();
			});
	});

	test('Missing cookie: a 400 error message must be returned', (done) => {
		request(app)
			.get('/api/logout')
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'User not logged in' });
				done();
			});
	});

	test('Invalid cookie: a 400 error message must be returned', (done) => {
		request(app)
			.get('/api/logout')
			.set('Cookie', `refreshToken=${'refreshtokentests'}`)
			.then((response) => {
				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({ error: 'User not found' });
				done();
			});
	});
});
