import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
	{ expiresIn: '100s' }
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
		test('Tokens are both valid and belong to the requested user', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const req = {
				params: {
					username: 'tester',
				},
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

		test('Undefined tokens', () => {
			const req = { cookies: {} };
			const res = {};
			const response = verifyAuth(req, res, { authType: 'Simple' });
			//The test is passed if the function returns an object with a false value, no matter its name
			expect(Object.values(response).includes(false)).toBe(true);
		});

		/**
		 * The only situation where the response object is actually interacted with is the case where the access token must be refreshed
		 */
		test('Access token expired and refresh token belonging to the requested user', () => {
			const req = {
				params: {
					username: 'tester',
				},
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
			const message = res.locals.refreshedTokenMessage ? true : res.locals.message ? true : false;
			expect(message).toBe(true);
		});
		test('Tokens are both valid and belong to the requested user and to be false accessToken missing email ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					username: 'tester',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Token is missing information');
		});
		test('Tokens are both valid and belong to the requested user and to be false accessToken username ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester@test.com',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Token is missing information');
		});
		test('Tokens are both valid and belong to the requested user and to be false accessToken role ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester@test.com',
					username: 'tester',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Token is missing information');
		});
		test('Tokens are both valid and belong to the requested user and to be false RefreshToken missing email ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					username: 'tester',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid,
					refreshToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Token is missing information');
		});
		test('Tokens are both valid and belong to the requested user and to be false RefreshToken username ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester@test.com',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid,
					refreshToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Token is missing information');
		});
		test('Tokens are both valid and belong to the requested user and to be false RefreshToken role ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester@test.com',
					username: 'tester',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid,
					refreshToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Token is missing information');
		});
		test('Tokens are both valid but both token have different users ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester2@test.com',
					username: 'tester2',
					role: 'Regular2',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid,
					refreshToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Mismatched users');
		});
		test('Tokens are both valid but user is not the same as the one in the params ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester2@test.com',
					username: 'tester2',
					role: 'Regular2',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid3,
					refreshToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Requested user different from the logged one');
		});
		test('Tokens is from a user trying to pass as an admin it should give an error ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester2@test.com',
					username: 'tester2',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid3,
					refreshToken: testerAccessTokenValid3,
				},
			};
			const res = {};
			//The function is called in the same way as in the various methods, passing the necessary authType and other information
			const response = verifyAuth(req, res, {
				authType: 'Admin',
				username: 'tester',
			});
			//The response object must contain a field that is a boolean value equal to true, it does not matter what the actual name of the field is
			//Checks on the "cause" field are omitted since it can be any string
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Not admin');
		});
		test('Tokens is from a user trying to pass as a member of a group he is not in it should give an error ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester@test.com',
					username: 'tester',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '100s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid3,
					refreshToken: testerAccessTokenValid3,
				},
			};
			const res = {};
			//The function is called in the same way as in the various methods, passing the necessary authType and other information
			const response = verifyAuth(req, res, {
				authType: 'Group',
				groupEmails: ['tester', 'tester2'],
			});
			//The response object must contain a field that is a boolean value equal to true, it does not matter what the actual name of the field is
			//Checks on the "cause" field are omitted since it can be any string
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('User not in group');
		});
		test('expired refresh token->user should loggin again message ', () => {
			//The only difference between access and refresh token is (in practice) their duration, but the payload is the same
			//Meaning that the same object can be used for both
			const testerAccessTokenValid3 = jwt.sign(
				{
					email: 'tester@test.com',
					username: 'tester',
					role: 'Regular',
				},
				process.env.ACCESS_KEY,
				{ expiresIn: '0s' }
			);
			const req = {
				params: {
					username: 'tester',
				},
				cookies: {
					accessToken: testerAccessTokenValid,
					refreshToken: testerAccessTokenValid3,
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
			expect(Object.values(response).includes(false)).toBe(true);
			expect(response.cause).toBe('Perform login again');
		});
	});
});
