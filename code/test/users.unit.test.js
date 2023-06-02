import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import {
	getUsers,
	getUser,
	createGroup,
	getGroups,
	deleteGroup,
	getGroup,
	deleteUser,
	addToGroup,
	removeFromGroup,
} from '../controllers/users.js';
import { verifyAuth } from '../controllers/utils';

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock('../models/User.js');
jest.mock('../controllers/utils');

let mockReq;
let mockRes;


/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
beforeEach(() => {
	User.find.mockClear();
	verifyAuth.mockClear();

	mockReq = {
		cookies: {},
		body: {},
		params: {}
	};
	mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		locals: {
			refreshedTokenMessage: 'Refreshed token'
		}
	};

});

describe('getUsers', () => {
	test('should return 401 if verify return false', async () => {

		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		// expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
		// 		error: expect.any(String)
		// 	}))
		 });

	test('should return empty list if there are no users', async () => {

		User.find.mockImplementation(() => []);
		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: []
        }))

	});

	test('should return list of all users', async () => {

		const retrievedUsers = [
			{
				username: 'test1',
				email: 'test1@example.com',
			},
			{
				username: 'test2',
				email: 'test2@example.com',
			},
		];

		User.find.mockImplementation(() => retrievedUsers);
		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: retrievedUsers
        }))
	});

	test('should return 500 if User.find throw an error', async () => {
		const mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'Refreshed token'
			}
		};

		User.find.mockImplementation(() => { throw 'Database error' });
		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}))
	});

});

describe('getUser', () => {});

describe('createGroup', () => {});

describe('getGroups', () => {});

describe('getGroup', () => {});

describe('addToGroup', () => {});

describe('removeFromGroup', () => {});

describe('deleteUser', () => {});

describe('deleteGroup', () => {});
