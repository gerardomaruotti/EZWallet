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

describe("register", () => {

	test("Nominal case: a confirmation message must be returned", (done) => {
	  request(app)
		.post("/api/register")
		.send({ username: "enrico", email: "enrico@gmail.com", password: "enrico" })
		.then((response) => {
		  expect(response.status).toBe(200);
		  expect(response.body).toStrictEqual({
			data: { message: 'User added succesfully' },
		  });
		  done();
		});
	}); 

	test("Username undefined ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ email: "enrico@gmail.com", password: "enrico" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
			  error: 'Missing parameters'
			});
			done();
		  });
	  });

	afterEach(async () => {
		await User.deleteMany();
	  });
});
  
describe('registerAdmin', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('login', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('logout', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});
