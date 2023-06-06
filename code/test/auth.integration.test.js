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

	test("Username undefined: a 400 error message must be returned ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ email: "enrico@gmail.com", password: "enrico" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ error: 'Missing parameters' });
			done();
		  });
	  });

	  test("Email undefined: a 400 error message must be returned ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ username: "enrico", password: "enrico" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ error: 'Missing parameters' });
			done();
		  });
	  });
	  

	  test("Password undefined: a 400 error message must be returned  ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ username: "enrico", email: "enrico@gmail.com" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ error: 'Missing parameters' });
			done();
		  });
	  });

	  test("Empty username: a 400 error message must be returned ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ username: "", email: "enrico@gmail.com", password: "enrico" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ error: 'Empty string in parameters' });
			done();
		  });
	  }); 

	  test("Empty email: a 400 error message must be returned ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ username: "enrico", email: "", password: "enrico" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ error: 'Empty string in parameters' });
			done();
		  });
	  }); 

	  test("Empty password: a 400 error message must be returned ", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ username: "enrico", email: "enrico@gmail.com", password: "" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ error: 'Empty string in parameters' });
			done();
		  });
	  }); 



	  test("Valid or invalid email: a 400 error message must be returned in case of invalid email", (done) => {
		request(app)
		  .post("/api/register")
		  .send({ username: "enrico", email: "enrico.gmail.com", password: "enrico" })
		  .then((response) => {
			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({error: 'Email not correct formatted'});
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
