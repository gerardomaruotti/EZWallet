import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import 'jest-extended';
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';
import { verifyAuth, handleDateFilterParams } from '../controllers/utils';

dotenv.config();

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

//necessary setup to ensure that each test can insert the data it needs
beforeEach(async () => {
	await categories.deleteMany({});
	await transactions.deleteMany({});
	await User.deleteMany({});
	await Group.deleteMany({});
});

/**
 * Alternate way to create the necessary tokens for authentication without using the website
 */
const adminAccessTokenValid = jwt.sign(
	{
		email: 'admin@email.com',
		//id: existingUser.id, The id field is not required in any check, so it can be omitted
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

//These tokens can be used in order to test the specific authentication error scenarios inside verifyAuth (no need to have multiple authentication error tests for the same route)
const testerAccessTokenExpired = jwt.sign(
	{
		email: 'tester@test.com',
		username: 'tester',
		role: 'Regular',
	},
	process.env.ACCESS_KEY,
	{ expiresIn: '0s' }
);
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, {
	expiresIn: '1y',
});

describe('utils.js', () => {
	describe('verifyAuth', () => {
		/**
		 * When calling verifyAuth directly, we do not have access to the req and res objects created by express, so we must define them manually
		 * An object with a "cookies" field that in turn contains "accessToken" and "refreshToken" is sufficient for the request
		 * The response object is untouched in most cases, so it can be a simple empty object
		 */
		test.skip('Tokens are both valid and belong to the requested user', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const req = {
				cookies: {
					accessToken: testerAccessTokenValid,
					refreshToken: testerAccessTokenValid,
				},
			};
			const res = {};
			//The function is called in the same way as in the various methods, passing the necessary authType and other information
			const response = verifyAuth(req, res, {
				authType: 'User',
				username: 'tester',
			});
			//The response object must contain a field that is a boolean value equal to true, it does not matter what the actual name of the field is
			//Checks on the "cause" field are omitted since it can be any string
			expect(Object.values(response).includes(true)).toBe(true);
		});

		test.skip('Undefined tokens', () => {
			const req = { cookies: {} };
			const res = {};
			const response = verifyAuth(req, res, { authType: 'Simple' });
			//The test is passed if the function returns an object with a false value, no matter its name
			expect(Object.values(response).includes(false)).toBe(true);
		});

		/**
		 * The only situation where the response object is actually interacted with is the case where the access token must be refreshed
		 */
		test.skip('Access token expired and refresh token belonging to the requested user', () => {
			const req = {
				cookies: {
					accessToken: testerAccessTokenExpired,
					refreshToken: testerAccessTokenValid,
				},
			};
			//The inner working of the cookie function is as follows: the response object's cookieArgs object values are set
			const cookieMock = (name, value, options) => {
				res.cookieArgs = { name, value, options };
			};
			//In this case the response object must have a "cookie" function that sets the needed values, as well as a "locals" object where the message must be set
			const res = {
				cookie: cookieMock,
				locals: {},
			};
			const response = verifyAuth(req, res, {
				authType: 'User',
				username: 'tester',
			});
			//The response must have a true value (valid refresh token and expired access token)
			expect(Object.values(response).includes(true)).toBe(true);
			expect(res.cookieArgs).toEqual({
				name: 'accessToken', //The cookie arguments must have the name set to "accessToken" (value updated)
				value: expect.any(String), //The actual value is unpredictable (jwt string), so it must exist
				options: {
					//The same options as during creation
					httpOnly: true,
					path: '/api',
					maxAge: 60 * 60 * 1000,
					sameSite: 'none',
					secure: true,
				},
			});
			//The response object must have a field that contains the message, with the name being either "message" or "refreshedTokenMessage"
			const message = res.locals.refreshedTokenMessage
				? true
				: res.locals.message
				? true
				: false;
			expect(message).toBe(true);
		});
	});
});

/**
 * The procedures described can be applied to the tests for all the functions called by the various endpoints
 * The general logic is:
 *  - populate the empty database with the necessary data
 *  - call the endpoint under test
 *  - verify that the data satisfies the minimum requirements (status code, "data" object in the body content)
 * Ensure that all asynchronous functions are always waited for in order to avoid situations where data is fetched before it's actually ready
 * Duplicate test cases that have the same exact behavior (i.e. success scenario with valid tokens or with expired access token and valid refresh token, unauthorized access) are not required, just the base case is sufficient
 */
describe('controller.js / user.js / auth.js', () => {
	test.skip('updateCategory: Returns a message for confirmation and the number of updated transactions', (done) => {
		//We create a category in our empty database (we know it's empty thanks to the beforeEach above)
		categories
			.create({
				type: 'food',
				color: 'red',
			})
			.then(() => {
				//We insert two users in the datbase: an Admin and a user that made two transactions
				User.insertMany([
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
						.insertMany([
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
									expect(response.body.data).toHaveProperty('count', 2);

									//Must be called at the end of every test or the test will fail while waiting for it to be called
									done();
								});
						});
				});
			});
	});

	/**
	 * The same test as the one above, written using "async/await" instead of "done"
	 * The two modes are equivalent, so it does not matter which one is used
	 * The most important part is to correctly wait for all Promises (database operations, bcrypt) to end before proceeding with
	 *      - awaiting each call, eventually assigning the result to a variable
	 *      - calling "then" right after each call
	 */
	test.skip('updateCategory: Returns a message for confirmation and the number of updated transactions', async () => {
		await categories.create({ type: 'food', color: 'red' });
		await User.insertMany([
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
		await transactions.insertMany([
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
		expect(response.body.data).toHaveProperty('count', 2);
		//there is no "done" in this case to signal that the test has ended, as it ends automatically since it's not inside a "then" block
	});

	test.skip('updateCategory: Returns a 400 error if the type of the new category is the same as one that exists already and that category is not the requested one', (done) => {
		categories
			.insertMany([
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

	test.skip('updateCategory: Returns a 400 error if the request body does not contain all the necessary parameters', (done) => {
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

	test.skip('updateCategory: Returns a 401 error if called by a user who is not an Admin', (done) => {
		categories
			.create({
				type: 'food',
				color: 'red',
			})
			.then(() => {
				User.insertMany([
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
