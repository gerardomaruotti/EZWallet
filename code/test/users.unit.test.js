import request from 'supertest';
import { app } from '../app';
import { Group, User } from '../models/User.js';
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
import { isEmail, verifyAuth, verifyMultipleAuth } from '../controllers/utils';

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock('../models/User.js');
jest.mock('../controllers/utils');


/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */

describe('getUsers', () => {
	let mockReq
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token'
			}
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));
		User.find.mockImplementation(() => []);
	});

	test('should return 401 if not authorised', async () => {

		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
				error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {

		User.find.mockImplementation(() => { throw new Error('Database error') });

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return empty list if there are no users', async () => {

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: []
        }));
	});

	test('should return list of all users', async () => {

		const retrievedUsers = [
			{
				username: 'test1',
				email: 'test1@example.com',
				role: 'regular'
			},
			{
				username: 'test2',
				email: 'test2@example.com',
				role: 'admin'
			},
		];

		User.find.mockImplementation(() => retrievedUsers);

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: retrievedUsers
        }));
	});

});

describe('getUser', () => {
	let mockReq;
	let mockRes;
	let retrievedUser;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {
				username: 'test1'
			}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token'
			}
		};	
		
		retrievedUser = {
			username: 'test1',
			email: 'test1@example.com',
			role: 'regular'
		};
		
		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));
		User.findOne.mockImplementation(() => retrievedUser);
	});

	test('should return 401 if not authorized', async () => {
		
		verifyMultipleAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 400 if user does not exist', async () => {
		
		User.findOne.mockImplementation(() => null);

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {
		
		User.findOne.mockImplementation(() => { throw new Error('Database error') });

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return user data', async () => {

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			data: retrievedUser
		}));
	});
});

describe('createGroup', () => {
	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {
				name: "testGroup", 
				memberEmails: ["test1@example.com", "test2@example.com"]
			},
			params: {}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token'
			}
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		Group.findOne.mockImplementation(() => null);
		User.findOne.mockImplementation((userEmail) => userEmail);
	});

	test('should return 401 if not authorized', async () => {
		
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 400 if group name is not provided', async () => {
		
		mockReq.body.name = undefined;

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 400 if member emails are not provided', async () => {

		mockReq.body.memberEmails = undefined;

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {
		
		Group.findOne.mockImplementation(() => { throw new Error('Database error') });

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 400 if group already exists', async () => {

		Group.findOne.mockImplementation(() => ({ name: 'testGroup' }));
		console.log('last update');

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return created group', async () => {

		const createdGroup = {
			name: 'testGroup'
		};

		await createGroup(mockReq, mockRes);

		//expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			data: createdGroup
		}));
	});
});

describe('getGroups', () => {

	let mockReq;
	let mockRes;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token'
			}
		};

		verifyAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));

		Group.findOne.mockImplementation(() => null);
	});

	test('should return 401 if not authorized', async () => {
		
		verifyAuth.mockImplementation(() => ({ authorized: false, cause: 'Unauthorized' }));

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {

		Group.find.mockImplementation(() => { throw new Error('Database error') });

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});


	test('should return empty list if there are no groups', async () => {

		
		const spy = jest.spyOn(Group,'find');
		spy.mockImplementation( () => {});
		jest.clearAllMocks();
		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: []
        }));
	});


	test('should return list of all groups', async () => {

		const retrievedGroups = [
			{
				name: 'testGroup',
				members: [{"email":'test1@example.com'},{"email":'test2@example.com'}]
			},
		];

		Group.find.mockImplementation(() => retrievedGroups);

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: retrievedGroups
        }));
	});



});

describe('getGroup', () => {

	let mockReq;
	let mockRes;
	let retrievedGroup;

	beforeEach(() => {
		mockReq = {
			cookies: {},
			body: {},
			params: {
				name: 'test1'
			}
		};
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: 'refreshed token'
			}
		};	
		
		retrievedGroup = {
			name: 'test1',
			members: [{"email":'test1@example.com'},{"email":'test2@example.com'}]
			
		};
		
		verifyMultipleAuth.mockImplementation(() => ({ authorized: true, cause: 'Authorized'}));
		Group.findOne.mockImplementation(() => retrievedGroup);
	});

	test('should return 400 if a group does not exist', async () => {
		
		Group.findOne.mockImplementation(() => null);

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return 500 if there is database error', async () => {
		
		Group.findOne.mockImplementation(() => { throw new Error('Database error') });

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			error: expect.any(String)
		}));
	});

	test('should return group data', async () => {

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
			data: retrievedGroup
		}));
	});
});


describe('addToGroup', () => {});

describe('removeFromGroup', () => {});

describe('deleteUser', () => {});

describe('deleteGroup', () => {});
