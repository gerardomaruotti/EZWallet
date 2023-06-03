import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { verifyAuth, verifyMultipleAuth } from '../controllers/utils';
import {
	createCategory,
	updateCategory,
	deleteCategory,
	getCategories,
	createTransaction,
	getAllTransactions,
	getTransactionsByUser,
	getTransactionsByUserByCategory,
	getTransactionsByGroup,
	getTransactionsByGroupByCategory,
	deleteTransaction,
	deleteTransactions,
} from '../controllers/controller';

jest.mock('../models/model');
jest.mock('../controllers/utils');

let mockReq;
let mockRes;
beforeEach(() => {
	mockReq = {
		cookies: {},
		body: {},
		params: {},
	};
	mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		locals: {
			refreshedTokenMessage: 'refreshed token',
		},
	};
	jest.clearAllMocks();
});

describe('createCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('updateCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

//OK
describe('getCategories', () => {
	test('should return 401 if not authorised', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return 500 if there is database error', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.find.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return empty list if there are no categories', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.find.mockImplementation(() => []);

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: 'refreshed token',
		});
	});

	test('should return list of categories', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		let mockCategories = [
			{
				type: 'investment',
				color: '#fcbe44',
			},
			{
				type: 'income',
				color: '#44fcbe',
			},
		];

		categories.find.mockImplementation(() => mockCategories);

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						type: expect.any(String),
						color: expect.any(String),
					}),
				]),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

describe('createTransaction', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getAllTransactions', () => {
	test('should return 401 if not authorised', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return 500 if there is database error', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		transactions.aggregate.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return empty list if there are no transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const spy = jest.spyOn(transactions, 'aggregate');

		spy.mockResolvedValue([]);

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: 'refreshed token',
		});
	});

	test('should return list of transactions', async () => {
		const mockTransactions = [
			{
				username: 'test23',
				amount: 10,
				type: 'investment',
				date: '2023-02-01',
				color: '#fcbe44',
			},
			{
				username: 'test',
				amount: 100,
				type: 'income',
				date: '2021-01-01',
				color: '#44fcbe',
			},
		];

		const spy = jest.spyOn(transactions, 'aggregate');
		spy.mockResolvedValue(mockTransactions);

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: mockTransactions,
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

describe('getTransactionsByUser', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByUserByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByGroup', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByGroupByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteTransaction', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteTransactions', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});
